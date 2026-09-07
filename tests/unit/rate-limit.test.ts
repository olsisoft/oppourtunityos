import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to max requests within the window and then blocks", () => {
    const t = 1_000_000;
    expect(checkRateLimit("u1", 2, 60, t).allowed).toBe(true);
    expect(checkRateLimit("u1", 2, 60, t + 1000).allowed).toBe(true);
    const blocked = checkRateLimit("u1", 2, 60, t + 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("frees capacity once the window passes", () => {
    const t = 1_000_000;
    checkRateLimit("u2", 1, 10, t);
    expect(checkRateLimit("u2", 1, 10, t + 5000).allowed).toBe(false);
    expect(checkRateLimit("u2", 1, 10, t + 11000).allowed).toBe(true);
  });

  it("isolates keys", () => {
    checkRateLimit("a", 1, 60);
    expect(checkRateLimit("b", 1, 60).allowed).toBe(true);
  });
});
