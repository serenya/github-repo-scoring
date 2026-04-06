import { Inject, Injectable } from '@nestjs/common';
import type { GitHubPort, PaginatedGitHubRepos } from '../../application/ports/github.port';
import { GitHubRepoFilter } from '../../domain/value-objects/github-repo-filter.vo';
import { CACHE_PORT } from '../../application/ports/cache.port';
import type { CachePort } from '../../application/ports/cache.port';
import { GITHUB_API_ADAPTER_TOKEN } from './adapter-tokens';
import { APP_CONFIG } from '../../../config/app.config';
import type { AppConfig } from '../../../config/app.config';

/**
 * Decorator adapter that sits in front of {@link GitHubApiAdapter} and adds two
 * performance optimisations without changing the {@link GitHubPort} contract:
 *
 * 1. **LRU cache** — successful search results are stored in an in-process cache
 *    for {@link AppConfig.cacheTtlMs} milliseconds.
 *
 * 2. **Request deduplication** — if multiple concurrent requests arrive with an
 *    identical cache key while the cache is cold, only one upstream call is made;
 *    all callers await the same promise. Failed upstream calls are not cached and
 *    release the pending slot immediately so the next request can retry.
 */
@Injectable()
export class CachingGitHubAdapter implements GitHubPort {
  private readonly pending = new Map<string, Promise<PaginatedGitHubRepos>>();

  constructor(
    @Inject(GITHUB_API_ADAPTER_TOKEN) private readonly inner: GitHubPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort<string, PaginatedGitHubRepos>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async search(filter: GitHubRepoFilter): Promise<PaginatedGitHubRepos> {
    const key = this.cacheKey(filter);

    const cached = this.cache.get(key);
    if (cached) return cached;

    const inflight = this.pending.get(key);
    if (inflight) return inflight;

    const promise = (async () => {
      try {
        const result = await this.inner.search(filter);
        this.cache.set(key, result, this.config.cacheTtlMs);
        return result;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, promise);
    return promise;
  }

  private cacheKey(filter: GitHubRepoFilter): string {
    return [
      filter.language ?? '',
      filter.createdAfter?.toISOString() ?? '',
      filter.page,
      filter.perPage,
    ].join(':');
  }
}
