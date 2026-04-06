import { Inject, Injectable } from '@nestjs/common';
import { CircuitBreakerPort, CircuitState } from '../../application/ports/circuit-breaker.port';
import { APP_CONFIG } from '../../../config/app.config';
import type { AppConfig } from '../../../config/app.config';

/**
 * In-process circuit breaker implementing {@link CircuitBreakerPort}.
 *
 * State machine:
 * - **CLOSED** (normal) — requests pass through; failure counter increments on
 *   each error. Once `circuitBreakerFailureThreshold` is reached the circuit opens.
 * - **OPEN** (tripped) — all `execute()` calls throw immediately. After
 *   `circuitBreakerHalfOpenTimeoutMs` the circuit moves to HALF_OPEN.
 * - **HALF_OPEN** (probing) — a single probe request is allowed through. A
 *   successful probe resets the failure counter and closes the circuit; a failed
 *   probe re-opens it.
 *
 * All thresholds are read from {@link AppConfig} so they can be tuned via env vars
 * without a code change.
 */
@Injectable()
export class CircuitBreaker implements CircuitBreakerPort {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private halfOpenTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed();
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.config.circuitBreakerFailureThreshold
    ) {
      this.transitionToOpen();
    }
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.failureCount = 0;
    if (this.halfOpenTimer) clearTimeout(this.halfOpenTimer);
    this.halfOpenTimer = setTimeout(() => {
      this.state = CircuitState.HALF_OPEN;
    }, this.config.circuitBreakerHalfOpenTimeoutMs);
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
  }
}
