import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { GitHubPort, PaginatedGitHubRepos } from '../../application/ports/github.port';
import { GitHubRepoFilter } from '../../domain/value-objects/github-repo-filter.vo';
import { CIRCUIT_BREAKER, CircuitState } from '../../application/ports/circuit-breaker.port';
import type { CircuitBreakerPort } from '../../application/ports/circuit-breaker.port';
import { CACHING_GITHUB_ADAPTER } from './adapter-tokens';

/**
 * Decorator adapter that wraps {@link CachingGitHubAdapter} with a circuit breaker.
 *
 * When the GitHub API returns repeated errors the circuit transitions from CLOSED
 * to OPEN after {@link AppConfig.circuitBreakerFailureThreshold} consecutive
 * failures. While OPEN, all calls fast-fail with HTTP 503 without hitting the
 * upstream at all, giving the API time to recover. After
 * {@link AppConfig.circuitBreakerHalfOpenTimeoutMs} milliseconds the circuit
 * moves to HALF_OPEN and allows a probe request through; success closes the
 * circuit, failure re-opens it.
 *
 * State machine: CLOSED → OPEN → HALF_OPEN → CLOSED (or back to OPEN).
 */
@Injectable()
export class ResilientGitHubAdapter implements GitHubPort {
  constructor(
    @Inject(CACHING_GITHUB_ADAPTER) private readonly inner: GitHubPort,
    @Inject(CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerPort,
  ) {}

  async search(filter: GitHubRepoFilter): Promise<PaginatedGitHubRepos> {
    if (this.circuitBreaker.getState() === CircuitState.OPEN) {
      throw new ServiceUnavailableException('GitHub API is temporarily unavailable');
    }
    return this.circuitBreaker.execute(() => this.inner.search(filter));
  }
}
