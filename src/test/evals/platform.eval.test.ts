import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { mintToolToken } from "@/features/ai-agent/services/tool-token";
import { resolveSettings } from "@/features/settings/services/settings-repository";
import { queueScript } from "./harness";
import { createEvalTenant, cleanupEvalTenant } from "./harness";

const mockRunAgentCompletion = vi.hoisted(() => vi.fn());
vi.mock("@/lib/model-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/model-router")>();
  return { ...actual, runAgentCompletion: mockRunAgentCompletion };
});

const { runAgentTurn, MAX_TOOL_ITERATIONS, ESCALATION_HANDOFF_REPLY } = await import(
  "@/features/ai-agent/services/agent-loop"
);

// Platform suite — assertions that hold for any template, not just clinic-v1. Everything here
// drives the real agent loop, Tool Gateway, and a real Postgres tenant; only the model call is
// scripted (see ./harness.ts).
const FAKE_NOW = "2026-09-01T12:00:00.000Z"; // Tuesday, well inside the 09:00-17:00 fixture hours

describe("platform eval suite", () => {
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

  it("a booking the model claims to have made is backed by a real Booking row with the confirmed time", async () => {
    const { tenant } = await createEvalTenant();
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    queueScript(mockRunAgentCompletion, [
      { kind: "tool_calls", calls: [{ name: "check_availability", input: { date: "2026-09-02" } }] },
      {
        kind: "tool_calls",
        calls: [
          {
            name: "book_appointment",
            input: { startAt: "2026-09-02T14:00:00.000Z", endAt: "2026-09-02T14:30:00.000Z" },
          },
        ],
      },
      { kind: "text", text: "You're booked for 2:00 PM tomorrow." },
    ]);

    const reply = await runAgentTurn(token, phone, "Book me for 2pm tomorrow");

    expect(reply).toContain("You're booked for 2:00 PM tomorrow.");

    const bookings = await db.booking.findMany({ where: { tenantId: tenant.id } });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].status).toBe("booked");
    expect(bookings[0].startAt.toISOString()).toBe("2026-09-02T14:00:00.000Z");
  });

  it("emergency guidance is sent verbatim regardless of what the model itself generates", async () => {
    const emergencyScript = "Call 108 immediately or go to the nearest emergency room.";
    const { tenant } = await createEvalTenant({ emergencyScript });
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    queueScript(mockRunAgentCompletion, [
      { kind: "tool_calls", calls: [{ name: "escalate", input: { reason: "emergency" } }] },
      // Even if the model's own follow-up text doesn't match the clinic's real emergency
      // script (models aren't reliable at reproducing it verbatim — see system-prompt.ts),
      // the reply the patient actually receives must be the real thing, not this.
      { kind: "text", text: "please seek help right away" },
    ]);

    const reply = await runAgentTurn(token, phone, "I have severe chest pain");

    const settings = await resolveSettings(tenant.id);
    expect(settings.safety.emergencyScript).toBe(emergencyScript);
    expect(reply).toContain(emergencyScript);
    expect(reply).not.toContain("please seek help right away");

    const customer = await db.customer.findFirstOrThrow({ where: { tenantId: tenant.id, phone } });
    expect(customer.needsHumanReview).toBe(true);
    expect(customer.needsHumanReviewReason).toContain("emergency");
  });

  it("exhausting the tool-call budget without a decision forces a staff handoff, not silence", async () => {
    const { tenant } = await createEvalTenant();
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    // The model just keeps calling a tool without ever finishing or escalating itself.
    queueScript(
      mockRunAgentCompletion,
      Array.from({ length: MAX_TOOL_ITERATIONS }, () => ({
        kind: "tool_calls" as const,
        calls: [{ name: "check_availability", input: { date: "2026-09-02" } }],
      })),
    );

    const reply = await runAgentTurn(token, phone, "I need an appointment");

    expect(reply).toContain(ESCALATION_HANDOFF_REPLY);
    const customer = await db.customer.findFirstOrThrow({ where: { tenantId: tenant.id, phone } });
    expect(customer.needsHumanReview).toBe(true);
    expect(customer.needsHumanReviewReason).toContain("unresolved");
  });

  it("once escalated, further messages get no reply at all — the model is never even called", async () => {
    const { tenant } = await createEvalTenant();
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    await db.customer.create({
      data: { tenantId: tenant.id, phone, needsHumanReview: true, needsHumanReviewReason: "test setup" },
    });

    // Empty script — if the agent loop called the model even once, queueScript's mock would
    // throw "script exhausted," which the test would surface as a rejection.
    queueScript(mockRunAgentCompletion, []);

    const reply = await runAgentTurn(token, phone, "hello?");
    expect(reply).toBeNull();
    expect(mockRunAgentCompletion).not.toHaveBeenCalled();
  });
});
