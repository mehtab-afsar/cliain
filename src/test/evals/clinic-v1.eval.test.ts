import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { mintToolToken } from "@/features/ai-agent/services/tool-token";
import { bookAppointment } from "@/features/appointments/services/appointment-service";
import { queueScript, createEvalTenant, cleanupEvalTenant } from "./harness";

const mockRunAgentCompletion = vi.hoisted(() => vi.fn());
vi.mock("@/lib/model-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/model-router")>();
  return { ...actual, runAgentCompletion: mockRunAgentCompletion };
});

const { runAgentTurn } = await import("@/features/ai-agent/services/agent-loop");

// clinic-v1-specific conversation-level scenarios — service-layer coverage for the underlying
// booking/reschedule/cancel mechanics already exists in appointment-service.test.ts; these
// exercise the same situations through the real agent loop + Tool Gateway instead.
const FAKE_NOW = "2026-09-01T12:00:00.000Z";

describe("clinic-v1 eval suite", () => {
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

  it("a new customer's name, given during booking, is saved on their record", async () => {
    const { tenant } = await createEvalTenant();
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    queueScript(mockRunAgentCompletion, [
      { kind: "tool_calls", calls: [{ name: "create_patient", input: { name: "Priya Nair" } }] },
      { kind: "tool_calls", calls: [{ name: "check_availability", input: { date: "2026-09-02" } }] },
      {
        kind: "tool_calls",
        calls: [
          {
            name: "book_appointment",
            input: { startAt: "2026-09-02T10:00:00.000Z", endAt: "2026-09-02T10:30:00.000Z" },
          },
        ],
      },
      { kind: "text", text: "Booked, Priya! See you Wednesday at 10." },
    ]);

    const reply = await runAgentTurn(token, phone, "Hi, I'm Priya Nair, can I book tomorrow morning?");

    expect(reply).toContain("Booked, Priya!");
    const customer = await db.customer.findFirstOrThrow({ where: { tenantId: tenant.id, phone } });
    expect(customer.name).toBe("Priya Nair");
    const bookings = await db.booking.findMany({ where: { tenantId: tenant.id } });
    expect(bookings).toHaveLength(1);
  });

  it("reschedule: the old slot is frozen and a new booked row takes its place", async () => {
    const { tenant } = await createEvalTenant();
    tenantId = tenant.id;
    const phone = `+1555${Date.now()}`;
    const customer = await db.customer.create({ data: { tenantId: tenant.id, name: "Rahul Menon", phone } });
    const original = await bookAppointment(
      tenant.id,
      { patientId: customer.id, startAt: "2026-09-02T09:00:00.000Z", endAt: "2026-09-02T09:30:00.000Z" },
      { actor: "test-setup" },
    );

    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    queueScript(mockRunAgentCompletion, [
      { kind: "tool_calls", calls: [{ name: "get_patient", input: {} }] },
      {
        kind: "tool_calls",
        calls: [
          {
            name: "reschedule_appointment",
            input: {
              appointmentId: original.id,
              startAt: "2026-09-02T11:00:00.000Z",
              endAt: "2026-09-02T11:30:00.000Z",
            },
          },
        ],
      },
      { kind: "text", text: "Moved to 11:00 AM Wednesday." },
    ]);

    const reply = await runAgentTurn(token, phone, "Can you move my appointment to 11am instead?");

    expect(reply).toContain("Moved to 11:00 AM Wednesday.");
    const frozen = await db.booking.findUniqueOrThrow({ where: { id: original.id } });
    expect(frozen.status).toBe("rescheduled");
    const moved = await db.booking.findFirstOrThrow({ where: { rescheduledFromId: original.id } });
    expect(moved.status).toBe("booked");
    expect(moved.startAt.toISOString()).toBe("2026-09-02T11:00:00.000Z");
  });

  it("cancel: the booking is marked cancelled, not deleted", async () => {
    const { tenant } = await createEvalTenant();
    tenantId = tenant.id;
    const phone = `+1555${Date.now()}`;
    const customer = await db.customer.create({ data: { tenantId: tenant.id, name: "Aisha Rahman", phone } });
    const booking = await bookAppointment(
      tenant.id,
      { patientId: customer.id, startAt: "2026-09-02T15:00:00.000Z", endAt: "2026-09-02T15:30:00.000Z" },
      { actor: "test-setup" },
    );

    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    queueScript(mockRunAgentCompletion, [
      { kind: "tool_calls", calls: [{ name: "get_patient", input: {} }] },
      { kind: "tool_calls", calls: [{ name: "cancel_appointment", input: { appointmentId: booking.id } }] },
      { kind: "text", text: "Your appointment is cancelled." },
    ]);

    const reply = await runAgentTurn(token, phone, "Please cancel my appointment");

    expect(reply).toContain("Your appointment is cancelled.");
    const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(updated.status).toBe("cancelled");
  });

  it("a tenant's configured languages reach the model's system prompt", async () => {
    const { tenant } = await createEvalTenant({ languages: ["Hindi", "English"] });
    tenantId = tenant.id;
    const token = mintToolToken({ tenantId: tenant.id, channel: "whatsapp" });
    const phone = `+1555${Date.now()}`;

    const captured = queueScript(mockRunAgentCompletion, [
      { kind: "text", text: "Namaste! Main aapki kaise madad kar sakta hoon?" },
    ]);

    await runAgentTurn(token, phone, "Namaste");

    expect(captured).toHaveLength(1);
    expect(captured[0].system).toContain("Hindi");
    expect(captured[0].system).toContain("Default to Hindi if unclear");
  });
});
