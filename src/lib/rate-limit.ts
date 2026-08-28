import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

/**
 * Serverless (Vercel) means no shared memory between invocations, so this has to live in an
 * external store — Upstash's REST-based Redis is the standard fit. Fails open (logs, allows
 * the request) when unconfigured, so local dev never needs an Upstash account.
 */
const ratelimit =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(30, "60 s"),
        analytics: false,
        prefix: "cliain",
      })
    : null;

let warnedOnce = false;

export async function checkRateLimit(key: string): Promise<{ success: boolean }> {
  if (!ratelimit) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not configured — rate limiting is disabled.",
      );
    }
    return { success: true };
  }

  const { success } = await ratelimit.limit(key);
  return { success };
}
