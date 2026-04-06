export const CIRCUIT_BREAKER = Symbol('CircuitBreaker');

/** Possible states of a circuit breaker. */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Port (secondary/driven port) for a circuit breaker.
 * The current default implementation is {@link RxjsCircuitBreaker}.
 */
export interface CircuitBreakerPort {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
}
