import { afterEach, describe, expect, it } from "vitest";
import {
  getCircuitState,
  recordFailure,
  recordSuccess,
  _resetCircuitBreakerMemoryStateForTests,
} from "./circuit-breaker";

// No UPSTASH_REDIS_REST_URL/TOKEN in the test environment, so these exercise the in-memory
// fallback path — the same one local dev and CI without Redis configured use.
describe("circuit breaker (in-memory fallback)", () => {
  afterEach(() => {
    _resetCircuitBreakerMemoryStateForTests();
  });

  it("starts closed", async () => {
    expect(await getCircuitState("test-provider")).toBe("closed");
  });

  it("stays closed below the failure threshold", async () => {
    await recordFailure("test-provider");
    await recordFailure("test-provider");
    expect(await getCircuitState("test-provider")).toBe("closed");
  });

  it("opens once the failure threshold is reached", async () => {
    await recordFailure("test-provider");
    await recordFailure("test-provider");
    await recordFailure("test-provider");
    expect(await getCircuitState("test-provider")).toBe("open");
  });

  it("a success clears accumulated failures", async () => {
    await recordFailure("test-provider");
    await recordFailure("test-provider");
    await recordSuccess("test-provider");
    await recordFailure("test-provider");
    expect(await getCircuitState("test-provider")).toBe("closed");
  });

  it("tracks providers independently", async () => {
    await recordFailure("anthropic");
    await recordFailure("anthropic");
    await recordFailure("anthropic");
    expect(await getCircuitState("anthropic")).toBe("open");
    expect(await getCircuitState("openai")).toBe("closed");
  });
});
