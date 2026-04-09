/**
 * In-memory sliding window rate limiter.
 * For production multi-instance deployments, replace with Redis-backed implementation.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: resetAt };
  }

  entry.count++;

  if (entry.count > config.limit) {
    return { success: false, limit: config.limit, remaining: 0, reset: entry.resetAt };
  }

  return { success: true, limit: config.limit, remaining: config.limit - entry.count, reset: entry.resetAt };
}

// Preset configurations
export const RATE_LIMITS = {
  api: { limit: 100, windowMs: 60_000 } as RateLimitConfig,       // 100 req/min
  ai: { limit: 10, windowMs: 60_000 } as RateLimitConfig,         // 10 req/min
  auth: { limit: 20, windowMs: 60_000 } as RateLimitConfig,       // 20 req/min
} as const;
