/**
 * In-memory sliding-window rate limiter.
 *
 * Adequate for a single-instance MVP. For multi-instance deployments swap the
 * store for Redis behind the same interface.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Window {
  timestamps: number[];
}

const store = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  now = Date.now(),
): RateLimitResult {
  const windowMs = windowSeconds * 1000;
  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= max) {
    const oldest = entry.timestamps[0];
    store.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, remaining: max - entry.timestamps.length, retryAfterSeconds: 0 };
}

export function resetRateLimits() {
  store.clear();
}
