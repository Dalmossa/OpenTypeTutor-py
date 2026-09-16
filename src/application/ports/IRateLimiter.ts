export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

export interface IRateLimiter {
  consume(key: string, limit: number, windowMs: number): RateLimitDecision;
}
