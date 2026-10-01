export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  name?: string;
  failureThreshold?: number;
  cooldownPeriodMs?: number;
  resetTimeoutMs?: number;
  resetTimeout?: number;
  requestTimeoutMs?: number;
}

export class CircuitBreaker {
  private _state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private _failureCount: number = 0;
  private failureThreshold: number;
  private cooldownPeriodMs: number;
  private requestTimeoutMs: number;
  private nextAttemptAt: number = 0;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold || 5;
    this.cooldownPeriodMs = options?.cooldownPeriodMs || options?.resetTimeoutMs || options?.resetTimeout || 60000;
    this.requestTimeoutMs = options?.requestTimeoutMs || 30000;
  }

  public get state(): CircuitBreakerState {
    return this.getState();
  }

  public set state(val: CircuitBreakerState) {
    this._state = val;
  }

  public get failureCount(): number {
    return this._failureCount;
  }

  public getState(): CircuitBreakerState {
    if (this._state === CircuitBreakerState.OPEN) {
      if (Date.now() >= this.nextAttemptAt) {
        this._state = CircuitBreakerState.HALF_OPEN;
      }
    }
    return this._state;
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitBreakerState.OPEN) {
      throw new Error('Circuit Breaker is OPEN');
    }

    try {
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request Timeout')), this.requestTimeoutMs)
        )
      ]);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this._failureCount = 0;
    this._state = CircuitBreakerState.CLOSED;
  }

  private onFailure(): void {
    this._failureCount += 1;
    if (this._failureCount >= this.failureThreshold || this._state === CircuitBreakerState.HALF_OPEN) {
      this._state = CircuitBreakerState.OPEN;
      this.nextAttemptAt = Date.now() + this.cooldownPeriodMs;
    }
  }

  public reset(): void {
    this._state = CircuitBreakerState.CLOSED;
    this._failureCount = 0;
    this.nextAttemptAt = 0;
  }
}
