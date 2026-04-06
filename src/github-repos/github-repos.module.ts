import { Module } from '@nestjs/common';
import { GitHubReposController } from './github-repos.controller';
import { SearchGitHubReposUseCase } from './application/use-cases/search-github-repos.use-case';
import { ScoringService } from './domain/services/scoring.service';
import { GITHUB_PORT } from './application/ports/github.port';
import { CACHE_PORT } from './application/ports/cache.port';
import { CIRCUIT_BREAKER } from './application/ports/circuit-breaker.port';
import { GitHubApiAdapter } from './infrastructure/adapters/github-api.adapter';
import { CachingGitHubAdapter } from './infrastructure/adapters/caching-github.adapter';
import { ResilientGitHubAdapter } from './infrastructure/adapters/resilient-github.adapter';
import { GITHUB_API_ADAPTER_TOKEN, CACHING_GITHUB_ADAPTER } from './infrastructure/adapters/adapter-tokens';
import { InMemoryLruCache } from './infrastructure/cache/in-memory-lru.cache';
import { CircuitBreaker } from './infrastructure/resilience/circuit-breaker';
import { APP_CONFIG } from '../config/app.config';
import type { AppConfig } from '../config/app.config';
import type { PaginatedGitHubRepos } from './application/ports/github.port';

@Module({
  controllers: [GitHubReposController],
  providers: [
    SearchGitHubReposUseCase,
    ScoringService,
    // Layer 1: real GitHub HTTP adapter
    {
      provide: GITHUB_API_ADAPTER_TOKEN,
      useClass: GitHubApiAdapter,
    },
    // LRU cache (created via factory so maxEntries comes from config)
    {
      provide: CACHE_PORT,
      useFactory: (config: AppConfig): InMemoryLruCache<string, PaginatedGitHubRepos> =>
        new InMemoryLruCache(config.cacheMaxEntries),
      inject: [APP_CONFIG],
    },
    // Layer 2: caching + deduplication decorator
    {
      provide: CACHING_GITHUB_ADAPTER,
      useClass: CachingGitHubAdapter,
    },
    // Circuit breaker
    {
      provide: CIRCUIT_BREAKER,
      useClass: CircuitBreaker,
    },
    // Layer 3: circuit-breaker decorator — exposed as GITHUB_PORT
    {
      provide: GITHUB_PORT,
      useClass: ResilientGitHubAdapter,
    },
  ],
})
export class GitHubReposModule {}
