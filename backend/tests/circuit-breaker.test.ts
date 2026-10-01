import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerState } from '../src/utils/circuit-breaker';

describe('Circuit Breaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 1000 });
  });

  it('Should start in CLOSED state', () => {
    expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
  });

  it('Should execute function successfully when CLOSED', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await breaker.execute(fn);
    expect(result).toBe('success');
  });

  it('Should count failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(breaker.execute(fn)).rejects.toThrow('fail');
    expect(breaker.failureCount).toBe(1);
  });

  it('Should transition to OPEN after 5 failures (threshold)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    for (let i = 0; i < 5; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow('fail');
    }
    expect(breaker.state).toBe(CircuitBreakerState.OPEN);
  });

  it('Should reject calls when OPEN (throw error)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    for (let i = 0; i < 5; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }
    const successFn = vi.fn().mockResolvedValue('success');
    await expect(breaker.execute(successFn)).rejects.toThrow();
  });

  it('Should transition to HALF_OPEN after reset timeout', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    for (let i = 0; i < 5; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow();
    }
    vi.advanceTimersByTime(1100);
    const successFn = vi.fn().mockResolvedValue('success');
    // It should throw or run successfully based on implementation, assuming success resets
    await breaker.execute(successFn).catch(() => {});
    expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
    vi.useRealTimers();
  });

  it('Should transition back to CLOSED on success in HALF_OPEN', async () => {
    breaker.state = CircuitBreakerState.HALF_OPEN;
    const fn = vi.fn().mockResolvedValue('success');
    await breaker.execute(fn);
    expect(breaker.state).toBe(CircuitBreakerState.CLOSED);
  });

  it('Should transition back to OPEN on failure in HALF_OPEN', async () => {
    breaker.state = CircuitBreakerState.HALF_OPEN;
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.state).toBe(CircuitBreakerState.OPEN);
  });

  it('Should reset failure count on success', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(breaker.execute(failFn)).rejects.toThrow();
    const successFn = vi.fn().mockResolvedValue('success');
    await breaker.execute(successFn);
    expect(breaker.failureCount).toBe(0);
  });
});
