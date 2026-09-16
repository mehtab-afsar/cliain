import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { mintToolToken } from "@/features/ai-agent/services/tool-token";
import { bookClassSession } from "@/features/appointments/services/appointment-service";
import { queueScript, createEvalGymTenant, createEvalSession, cleanupEvalTenant } from "./harness";

const mockRunAgentCompletion = vi.hoisted(() => vi.fn());
vi.mock("@/lib/model-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/model-router")>();
  return { ...actual, runAgentCompletion: mockRunAgentCompletion };
});

const { runAgentTurn } = await import("@/features/ai-agent/services/agent-loop");

// gym-v1-specific conversation-level scenarios — the point of this whole suite is proving the
// "engine + vertical templates" architecture is real for a *second* vertical, not just an
// abstraction that happens to work for clinic-v1 alone.
const FAKE_NOW = "2026-09-01T12:00:00.000Z";

describe("gym-v1 eval suite", () => {
  let tenantId: string | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FAKE_NOW));
  });

  afterEach(async () => {
    vi.useRealTimers();
    mockRunAgentCompletion.mockReset();
    if (tenantId) await cleanupEvalTenant(tenantId);
    tenantId = undefined;
  });

  it("books a class session with partySize > 1 — closing the 'partySize is schema-only dead code' gap", async () => {
    const { tenant, resource, offering } = await createEvalGymTenant();
    tenantId = tenant.id;
    const session = await createEvalSession(tenant.id, {
      offeringId: offering.id,
      resourceId: resource.id,
      startAt: new Date("2026-09-02T18:00:00.000Z"),
      endAt: new Date("2026-09-02T18:45:00.000Z"),
      capacity: 5,
    });
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    queueScript(mockRunAgentCompletion, [
      { kind: "tool_calls", calls: [{ name: "check_availability", input: { date: "2026-09-02" } }] },
      {
        kind: "tool_calls",
        calls: [
          {
            name: "book_appointment",
            input: {
              startAt: session.startAt.toISOString(),
              endAt: session.endAt.toISOString(),
              sessionId: session.id,
              partySize: 2,
            },
          },
        ],
      },
      { kind: "text", text: "You and your friend are booked into tomorrow's class!" },
    ]);

    const reply = await runAgentTurn(token, phone, "Book me and a friend into tomorrow's 6pm class");

    expect(reply).toContain("You and your friend are booked");
    const bookings = await db.booking.findMany({ where: { tenantId: tenant.id } });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].partySize).toBe(2);
    expect(bookings[0].mode).toBe("class");
    expect(bookings[0].sessionId).toBe(session.id);
  });

  it("rejects a booking once the class is full, without creating an extra row", async () => {
    const { tenant, resource, offering } = await createEvalGymTenant();
    tenantId = tenant.id;
    const session = await createEvalSession(tenant.id, {
      offeringId: offering.id,
      resourceId: resource.id,
      startAt: new Date("2026-09-02T18:00:00.000Z"),
      endAt: new Date("2026-09-02T18:45:00.000Z"),
      capacity: 2,
    });
    // Fill the class via the service directly (setup, not the behavior under test).
    const filler = await db.customer.create({ data: { tenantId: tenant.id, phone: `+1555${Date.now()}filler` } });
    await bookClassSession(
      tenant.id,
      { patientId: filler.id, sessionId: session.id, partySize: 2 },
      { actor: "test-setup" },
    );

    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    queueScript(mockRunAgentCompletion, [
      {
        kind: "tool_calls",
        calls: [
          {
            name: "book_appointment",
            input: {
              startAt: session.startAt.toISOString(),
              endAt: session.endAt.toISOString(),
              sessionId: session.id,
              partySize: 1,
            },
          },
        ],
      },
      { kind: "text", text: "Sorry, that class is full — want me to check another time?" },
    ]);

    const reply = await runAgentTurn(token, phone, "Book me into tomorrow's 6pm class");

    expect(reply).toContain("full");
    const bookings = await db.booking.findMany({ where: { sessionId: session.id } });
    expect(bookings).toHaveLength(1); // only the filler booking — the rejected attempt created nothing
  });

  it("a capacity-N session accepts exactly N of N+1 concurrent partySize:1 bookings", async () => {
    // Service-layer concurrency test — mirrors appointment-service.test.ts's double-booking
    // race test, but for the capacity SUM-query path (writeIfCapacityAvailable) instead of the
    // exclusive-slot path (writeIfSlotFree). No agent loop / LLM mocking involved: this is
    // about the Serializable-transaction guarantee holding under real concurrent writes, not
    // conversation behavior.
    const { tenant, resource, offering } = await createEvalGymTenant();
    tenantId = tenant.id;
    const capacity = 3;
    const session = await createEvalSession(tenant.id, {
      offeringId: offering.id,
      resourceId: resource.id,
      startAt: new Date("2026-09-02T18:00:00.000Z"),
      endAt: new Date("2026-09-02T18:45:00.000Z"),
      capacity,
    });

    const attempts = capacity + 1;
    const customers = await Promise.all(
      Array.from({ length: attempts }, (_, i) =>
        db.customer.create({ data: { tenantId: tenant.id, phone: `+1555${Date.now()}${i}` } }),
      ),
    );

    const results = await Promise.allSettled(
      customers.map((customer) =>
        bookClassSession(
          tenant.id,
          { patientId: customer.id, sessionId: session.id, partySize: 1 },
          { actor: "test" },
        ),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(capacity);
    expect(rejected).toHaveLength(1);

    const bookedCount = await db.booking.count({ where: { sessionId: session.id, status: "booked" } });
    expect(bookedCount).toBe(capacity);
  });

  it("the system prompt and tool descriptions are genuinely gym-worded, not leaked clinic-v1 content", async () => {
    const { tenant } = await createEvalGymTenant();
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    const captured = queueScript(mockRunAgentCompletion, [
      { kind: "text", text: "Hey! Happy to help you find a class." },
    ]);

    await runAgentTurn(token, phone, "Hi, do you have any classes tomorrow?");

    expect(captured).toHaveLength(1);
    const system = captured[0].system;
    const tools = JSON.stringify(captured[0].tools);

    // Positive: gym-v1's own terminology actually made it into the prompt.
    expect(system).toContain("member");
    expect(system).toContain("trainer");
    expect(system.toLowerCase()).toContain("class");

    // Negative: exact clinic-v1-only phrases must not leak in. Checked as specific phrases,
    // not bare words like "doctor" — gym-v1's own safety rules legitimately say "consult a
    // doctor" as real-world medical advice, which is correct content, not a leak.
    const clinicOnlyPhrases = [
      "the doctor will discuss it at the visit",
      "clinic's emergency guidance",
      "the clinic's team",
      "clinic staff",
      "medical advice, diagnoses, or treatment guidance",
      "call the clinic directly",
    ];
    for (const phrase of clinicOnlyPhrases) {
      expect(system).not.toContain(phrase);
      expect(tools).not.toContain(phrase);
    }
  });
});
