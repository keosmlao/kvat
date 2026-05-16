import "server-only";

// In-process token bucket per key. Good enough for a single Next.js instance;
// for horizontally scaled deployments swap the Map for Redis (same shape).

type Window = { count: number; resetAt: number };

const globalForRL = globalThis as unknown as {
  rateLimitStore: Map<string, Window> | undefined;
};
const store: Map<string, Window> =
  globalForRL.rateLimitStore ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalForRL.rateLimitStore = store;
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

/**
 * Check-and-increment a fixed-window counter.
 * - `key` should namespace the bucket: `"signup:1.2.3.4"`, `"reset:bob@x.la"`.
 * - `limit` is the max events per window.
 * - `windowMs` is the window length in ms.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const w = store.get(key);
  if (!w || w.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (w.count >= limit) {
    return { ok: false, retryAfterMs: w.resetAt - now };
  }
  w.count += 1;
  return { ok: true, remaining: limit - w.count };
}

export function clientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
