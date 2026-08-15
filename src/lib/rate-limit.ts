/**
 * Rate limiter with a durable backend when configured, and a safe in-memory
 * fallback otherwise.
 *
 * W1.5 — the previous limiter was ONLY the in-memory Map below. On Vercel each
 * serverless instance has its own memory, so the counter reset on every cold
 * start and was not shared across concurrent instances — the cap barely held
 * under real traffic. When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are set, we use Upstash Redis (a free tier is plenty here), which is shared
 * across all instances and survives restarts. With no Upstash env vars set the
 * behaviour is exactly the old in-memory limiter, so nothing breaks before the
 * account is provisioned.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

// ─── Durable backend (optional) ──────────────────────────────────────────────
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

// One Ratelimit instance per (limit, window) pair, since callers use different
// budgets (10/min for AI, 30/min for quiz, …).
const limiters = new Map<string, Ratelimit>();
function getLimiter(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let l = limiters.get(key);
  if (!l) {
    const seconds = Math.max(1, Math.ceil(windowMs / 1000));
    l = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${seconds} s`),
      prefix: 'add-academy',
      analytics: false,
    });
    limiters.set(key, l);
  }
  return l;
}

// ─── In-memory fallback ──────────────────────────────────────────────────────
interface RateLimitEntry {
  timestamps: number[];
}
const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

function inMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  cleanup(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    return { success: false, remaining: 0, resetMs: oldestInWindow + windowMs - now };
  }
  entry.timestamps.push(now);
  return { success: true, remaining: limit - entry.timestamps.length, resetMs: windowMs };
}

/**
 * Check and record a rate-limited action.
 *
 * @param key      Unique identifier (e.g., IP address or user ID)
 * @param limit    Maximum requests allowed in the window
 * @param windowMs Window size in milliseconds (default: 60 seconds)
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  if (redis) {
    try {
      const r = await getLimiter(limit, windowMs).limit(key);
      return {
        success: r.success,
        remaining: r.remaining,
        resetMs: Math.max(0, r.reset - Date.now()),
      };
    } catch (err) {
      // If Redis is unreachable, fail OPEN to the in-memory limiter rather than
      // locking every user out of the product.
      console.error('[rate-limit] Upstash error, falling back to in-memory:', err);
      return inMemory(key, limit, windowMs);
    }
  }
  return inMemory(key, limit, windowMs);
}

/**
 * Extract client IP from request headers.
 * Works on Vercel (x-forwarded-for) and other platforms.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
