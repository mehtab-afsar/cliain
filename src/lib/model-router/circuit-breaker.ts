import "server-only";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Per-provider consecutive-failure tracking with a cooldown window — a provider having a bad
 * minute shouldn't cost every subsequent request a full timeout before falling through to the
 * next one. Reuses the same Upstash Redis credentials rate-limit.ts already requires for
 * serverless deployments (no shared memory between invocations there); falls back to an
 * in-process Map for local dev, same "fails open toward availability" posture as rate-limit.ts
 * — worst case without Redis configured is no breaker protection, not a broken agent.
 */
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

type MemoryState = { failures: number; openUntil: number };
const memoryState = new Map<string, MemoryState>();

export type CircuitState = "closed" | "open";

export async function getCircuitState(provider: string): Promise<CircuitState> {
  if (redis) {
    const openUntil = await redis.get<number>(`circuit:${provider}:openUntil`);
    return openUntil && openUntil > Date.now() ? "open" : "closed";
  }
  const state = memoryState.get(provider);
  return state && state.openUntil > Date.now() ? "open" : "closed";
}

export async function recordSuccess(provider: string): Promise<void> {
  if (redis) {
    await redis.del(`circuit:${provider}:failures`, `circuit:${provider}:openUntil`);
    return;
  }
  memoryState.delete(provider);
}

export async function recordFailure(provider: string): Promise<void> {
  if (redis) {
    const failures = await redis.incr(`circuit:${provider}:failures`);
    if (failures >= FAILURE_THRESHOLD) {
      await redis.set(`circuit:${provider}:openUntil`, Date.now() + COOLDOWN_MS, {
        ex: Math.ceil(COOLDOWN_MS / 1000),
      });
      await redis.del(`circuit:${provider}:failures`);
    }
    return;
  }

  const state = memoryState.get(provider) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + COOLDOWN_MS;
    state.failures = 0;
  }
  memoryState.set(provider, state);
}

/** Test-only escape hatch — the in-memory fallback has no TTL-based self-cleanup. */
export function _resetCircuitBreakerMemoryStateForTests(): void {
  memoryState.clear();
}
