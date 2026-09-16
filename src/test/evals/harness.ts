import "server-only";
import type { Mock } from "vitest";
import { db } from "@/lib/db";
import type { AgentCompletionResult } from "@/lib/model-router";

/**
 * A scripted stand-in for one model round-trip within an agent turn — an agent turn can make
 * several of these before producing a final reply (see MAX_TOOL_ITERATIONS in agent-loop.ts).
 * Evals drive the real agent loop, the real Tool Gateway, and a real Postgres tenant end to
 * end; only the LLM call itself is scripted, so what's being verified is "given this model
 * behavior, does the rest of the system do the right thing" — not the model's own reasoning.
 */
export type ScriptedTurn =
  | { kind: "tool_calls"; calls: Array<{ name: string; input: unknown }> }
  | { kind: "text"; text: string };

function toCompletionResult(turn: ScriptedTurn, callIndex: number): AgentCompletionResult {
  if (turn.kind === "text") {
    return {
      content: [{ type: "text", text: turn.text }],
      stopReason: "end_turn",
      usage: { inputTokens: 0, outputTokens: 0 },
      provider: "anthropic",
      model: "eval-script",
    };
  }
  return {
    content: turn.calls.map((call, i) => ({
      type: "tool_use",
      id: `eval_tool_${callIndex}_${i}`,
      name: call.name,
      input: call.input,
    })),
    stopReason: "tool_use",
    usage: { inputTokens: 0, outputTokens: 0 },
    provider: "anthropic",
    model: "eval-script",
  };
}

export type CapturedModelCall = { system: string; tools: unknown[]; messages: unknown[] };

/**
 * Wires a mocked `runAgentCompletion` (see each eval file's `vi.mock("@/lib/model-router", ...)`
 * — vi.mock must live in the test file itself for Vitest's hoisting to apply, so this just
 * configures the mock fn passed in) to return each scripted turn in order, one per model call
 * within the turn. Also records what agent-loop.ts actually sent the model on each call, so an
 * eval can assert on the system prompt / message history, not just the final reply.
 */
export function queueScript(mockFn: Mock, script: ScriptedTurn[]): CapturedModelCall[] {
  const captured: CapturedModelCall[] = [];
  let index = 0;
  mockFn.mockImplementation(async (params: { system: string; tools: unknown[]; messages: unknown[] }) => {
    captured.push({ system: params.system, tools: params.tools, messages: params.messages });
    const turn = script[index];
    if (!turn) {
      throw new Error(
        `Eval script exhausted after ${index} model call(s) — the agent loop asked for another turn than scripted.`,
      );
    }
    index += 1;
    return toCompletionResult(turn, index);
  });
  return captured;
}

export type EvalTenantOptions = {
  resourceName?: string;
  specialty?: string;
  languages?: string[];
  emergencyScript?: string;
};

/** clinic-v1 fixture — one tenant, one location, one resource, one offering, working every
 *  day 09:00-17:00, matching the pattern used across the service-layer tests. */
export async function createEvalTenant(options: EvalTenantOptions = {}) {
  const tenant = await db.tenant.create({
    data: {
      clinicName: "Eval Clinic",
      timezone: "UTC",
      emergencyScript: options.emergencyScript,
    },
  });
  const location = await db.location.create({ data: { tenantId: tenant.id, timezone: "UTC" } });
  const resource = await db.resource.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      type: "practitioner",
      name: options.resourceName ?? "Dr. Eval",
      title: "Dr.",
      attributes: options.specialty ? { specialty: options.specialty } : {},
    },
  });
  const offering = await db.offering.create({
    data: { tenantId: tenant.id, name: "Consultation", durationMinutes: 30, resourceType: "practitioner" },
  });
  await db.workingHours.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      resourceId: resource.id,
      dayOfWeek,
      isOpen: true,
      startTime: "09:00",
      endTime: "17:00",
    })),
  });
  if (options.languages) {
    await db.clinicSettings.create({
      data: { tenantId: tenant.id, data: { clinic: { languages: options.languages } } },
    });
  }
  return { tenant, resource, offering };
}

export async function cleanupEvalTenant(tenantId: string): Promise<void> {
  // Conversation rows (written by conversation-store.ts as the agent loop runs — unlike the
  // other service-layer tests, evals actually drive real agent turns) have a Restrict FK to
  // Customer, which would otherwise block Tenant's cascade delete from reaching Customer.
  await db.conversation.deleteMany({ where: { customer: { tenantId } } });
  await db.booking.deleteMany({ where: { tenantId } });
  await db.session.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });
}

export type EvalGymTenantOptions = {
  trainerName?: string;
  trainerRole?: string;
  languages?: string[];
  escalationScript?: string;
  classCapacity?: number;
};

/** gym-v1 fixture — separate from createEvalTenant (rather than one function branching on a
 *  templateVersion param) so no application code ever reads Tenant.vertical/templateVersion
 *  to pick behavior, including test fixtures — keeps the no-branching ESLint rule's intent
 *  honest even though it doesn't technically scan test files. Same shape otherwise: one
 *  tenant, one location, one trainer resource, one class-mode offering. */
export async function createEvalGymTenant(options: EvalGymTenantOptions = {}) {
  const tenant = await db.tenant.create({
    data: {
      clinicName: "Eval Gym",
      vertical: "gym",
      templateVersion: "gym-v1",
      timezone: "UTC",
      emergencyScript: options.escalationScript,
    },
  });
  const location = await db.location.create({ data: { tenantId: tenant.id, timezone: "UTC" } });
  const resource = await db.resource.create({
    data: {
      tenantId: tenant.id,
      locationId: location.id,
      type: "trainer",
      name: options.trainerName ?? "Coach Eval",
      title: options.trainerRole ?? "Head Coach",
    },
  });
  const capacity = options.classCapacity ?? 12;
  const offering = await db.offering.create({
    data: {
      tenantId: tenant.id,
      name: "Group Class",
      durationMinutes: 45,
      resourceType: "trainer",
      mode: "class",
      defaultCapacity: capacity,
    },
  });
  await db.workingHours.createMany({
    data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      resourceId: resource.id,
      dayOfWeek,
      isOpen: true,
      startTime: "06:00",
      endTime: "21:00",
    })),
  });
  if (options.languages) {
    await db.clinicSettings.create({
      data: { tenantId: tenant.id, data: { gym: { languages: options.languages } } },
    });
  }
  return { tenant, resource, offering };
}

export type CreateEvalSessionInput = {
  offeringId: string;
  resourceId: string;
  startAt: Date;
  endAt: Date;
  capacity: number;
};

export async function createEvalSession(tenantId: string, input: CreateEvalSessionInput) {
  return db.session.create({
    data: {
      tenantId,
      offeringId: input.offeringId,
      resourceId: input.resourceId,
      startAt: input.startAt,
      endAt: input.endAt,
      capacity: input.capacity,
    },
  });
}
