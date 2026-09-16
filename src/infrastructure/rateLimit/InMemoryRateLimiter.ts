import type { IRateLimiter, RateLimitDecision } from '../../application/ports/IRateLimiter.js';

interface WindowEntry {
  windowStartMs: number;
  count: number;
}

export class InMemoryRateLimiter implements IRateLimiter {
  private readonly buckets = new Map<string, WindowEntry>();

  consume(key: string, limit: number, windowMs: number): RateLimitDecision {
    const now = Date.now();
    const current = this.buckets.get(key);
    const entry: WindowEntry =
      current === undefined || now - current.windowStartMs >= windowMs
        ? { windowStartMs: now, count: 0 }
        : current;

    entry.count += 1;
    this.buckets.set(key, entry);

    return {
      allowed: entry.count <= limit,
      retryAfterMs: Math.max(0, entry.windowStartMs + windowMs - now),
    };
  }
}
