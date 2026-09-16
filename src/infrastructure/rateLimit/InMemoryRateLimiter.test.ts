import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryRateLimiter } from './InMemoryRateLimiter.js';

describe('InMemoryRateLimiter (TASK-073 / ADR-013)', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite até o limite na janela e bloqueia tentativas seguintes', () => {
    expect(limiter.consume('chave', 2, 60000).allowed).toBe(true);
    expect(limiter.consume('chave', 2, 60000).allowed).toBe(true);
    expect(limiter.consume('chave', 2, 60000).allowed).toBe(false);
  });

  it('reinicia a janela após windowMs (janela fixa)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    expect(limiter.consume('chave', 1, 60000).allowed).toBe(true);
    expect(limiter.consume('chave', 1, 60000).allowed).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:01:00.000Z'));
    expect(limiter.consume('chave', 1, 60000).allowed).toBe(true);
  });

  it('mantém contadores independentes por chave', () => {
    expect(limiter.consume('a', 1, 60000).allowed).toBe(true);
    expect(limiter.consume('b', 1, 60000).allowed).toBe(true);
    expect(limiter.consume('a', 1, 60000).allowed).toBe(false);
    expect(limiter.consume('b', 1, 60000).allowed).toBe(false);
  });

  it('reporta retryAfterMs restante da janela quando bloqueia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    limiter.consume('chave', 1, 60000);
    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    const decision = limiter.consume('chave', 1, 60000);

    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(50000);
  });
});