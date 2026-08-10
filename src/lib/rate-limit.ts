/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance Vercel deployments (serverless edge).
 *
 * For multi-region or high-traffic scenarios, swap with Upstash Redis
 * (@upstash/ratelimit) — the interface is the same.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Check and record a rate-limited action.
 *
 * @param key     Unique identifier (e.g., IP address or user ID)
 * @param limit   Maximum requests allowed in the window
 * @param windowMs  Window size in milliseconds (default: 60 seconds)
 * @returns { success, remaining, resetMs }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): { success: boolean; remaining: number; resetMs: number } {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + windowMs - now;
    return { success: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    remaining: limit - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Extract client IP from request headers.
 * Works on Vercel (x-forwarded-for) and other platforms.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
