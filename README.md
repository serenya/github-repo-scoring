# GitHub Repository Scoring

A NestJS REST API that searches GitHub repositories and ranks them by a **popularity score** (0–100) derived from stars, forks, and recency of updates. Users can filter results by programming language and repository creation date.

## Architecture

The project follows **Hexagonal (Ports & Adapters) Architecture**, keeping the domain and application layers independent of infrastructure concerns.

```
src/
├── config/                          # Global configuration (env vars → typed AppConfig)
└── github-repos/
    ├── domain/
    │   ├── entities/                # GitHubRepo, ScoredGitHubRepo
    │   ├── value-objects/           # GitHubRepoFilter, ScoreBreakdown
    │   └── services/                # ScoringService
    ├── application/
    │   ├── ports/                   # GitHubPort, CachePort, CircuitBreakerPort
    │   └── use-cases/               # SearchGitHubReposUseCase
    └── infrastructure/
        ├── adapters/
        │   ├── github-api.adapter.ts          # Raw GitHub REST API calls
        │   ├── caching-github.adapter.ts      # LRU cache + request deduplication
        │   └── resilient-github.adapter.ts    # Circuit breaker wrapper
        ├── cache/                   # InMemoryLruCache
        └── resilience/              # CircuitBreaker
```

**Adapter chain** (outermost → innermost):

```
Request → ResilientGitHubAdapter → CachingGitHubAdapter → GitHubApiAdapter → GitHub API
```

## Scoring Algorithm

Each repository receives a score in the range **0–100**, computed as the arithmetic mean of three components:

| Component | Formula | Reference |
|-----------|---------|-----------|
| **Stars** | `log10(stars + 1) / log10(100_001) × 100` | 100k stars → 100 |
| **Forks** | `log10(forks + 1) / log10(50_001) × 100` | 50k forks → 100 |
| **Recency** | `100 − (daysSinceUpdate / 730) × 100` | 2-year linear decay |

Logarithmic scaling on stars and forks prevents mega-popular repositories from completely overshadowing others. Recency rewards actively maintained projects.

## API

### `GET /api/v1/github-repos/search`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `language` | string | — | Filter by programming language (e.g. `TypeScript`) |
| `created_after` | ISO 8601 date | — | Only repos created after this date (e.g. `2020-01-01`) |
| `page` | integer ≥ 1 | `1` | Page number |
| `per_page` | integer 1–100 | `10` | Results per page |

**Response**

```json
{
  "items": [
    {
      "url": "https://github.com/owner/repo",
      "language": "TypeScript",
      "score": 74,
      "created_at": "2021-03-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 1234,
    "page": 1,
    "per_page": 10,
    "total_pages": 124
  }
}
```

Results are sorted by `score` descending. Interactive documentation is available at **`/api`** (Swagger UI).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `GITHUB_TOKEN` | — | Optional Bearer token (raises rate limit from 60 to 5,000 req/h) |
| `GITHUB_API_BASE` | `https://api.github.com` | GitHub API base URL |
| `GITHUB_API_VERSION` | `2026-03-10` | `X-GitHub-Api-Version` header value |
| `GITHUB_API_TIMEOUT_MS` | `5000` | Per-request timeout in milliseconds |
| `CACHE_TTL_MS` | `300000` | LRU cache entry TTL (5 minutes) |
| `CACHE_MAX_ENTRIES` | `100` | Maximum entries in LRU cache |
| `CB_FAILURE_THRESHOLD` | `5` | Consecutive failures before circuit opens |
| `CB_HALF_OPEN_TIMEOUT_MS` | `30000` | Time in OPEN state before probing upstream |

Copy `.env.example` (if present) or set variables directly in your environment.

## Project Setup

```bash
pnpm install
```

## Running the App

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production
pnpm run start:prod
```

## Running with Docker

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`. Pass configuration via a `.env` file or the `environment` block in `docker-compose.yml` — see [Configuration](#configuration).

## Tests

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# coverage
pnpm run test:cov
```

The test suite contains **37 tests** covering the scoring algorithm, adapter chain, use case orchestration, and controller mapping.

---

## Trade-offs & Further Improvements

### Trade-offs

**In-process LRU cache**
The cache lives inside the Node.js process. This is fast and has zero infrastructure dependencies, but each horizontal replica maintains its own independent cache. Under load balancing, cache hit rates drop proportionally to the number of replicas and the same GitHub queries are redundantly made across instances.

**Single-node circuit breaker**
Circuit breaker state is in-memory and local to each process. In a multi-replica deployment, one replica can have an open circuit while others do not, so the protective effect is diluted. There is also no shared failure signal across the fleet.

**Post-fetch scoring vs. pre-sorted results**
GitHub returns search results sorted by its own relevance algorithm. Scoring and re-sorting happen client-side after fetching a single page, so a highly-scored repository on page 3 of GitHub's results will never surface on page 1 of the API response. Accurate global ranking would require fetching all pages before scoring, which is impractical at scale.

**GitHub API rate limits**
Without a `GITHUB_TOKEN`, unauthenticated requests are limited to 10 per minute. Even authenticated, 30 requests per minute is a hard ceiling that a high-traffic deployment will exhaust. The current architecture has no throttling or queue strategy beyond the circuit breaker.

**Pagination offset ceiling**
GitHub's REST search API limits results to the first 1,000 items (`page × per_page ≤ 1000`). Requests beyond this limit return an error that surfaces as a 500 from this service.

**Scoring weight subjectivity**
Stars, forks, and recency each contribute equally (one-third) to the final score. The log-scale reference points (100k stars, 50k forks, 2-year decay) are opinionated choices that suit general-purpose repositories but may not be appropriate for niche ecosystems where a 500-star repo is exceptional.

### Further Improvements

**Distributed cache (Redis)**
Replacing `InMemoryLruCache` with a shared Redis instance eliminates cache fragmentation across replicas, reduces upstream load linearly with replica count, and survives process restarts.

**Distributed circuit breaker**
Sharing circuit breaker state via Redis or a service mesh (e.g., Istio) ensures the entire fleet reacts consistently to GitHub outages rather than each replica tripping independently.

**Cache warming & background refresh**
Popular queries could be proactively refreshed in the background before TTL expiry ("stale-while-revalidate" pattern), eliminating cold-start latency after cache misses and keeping results up to date.

**Configurable score weights**
Exposing `starsWeight`, `forksWeight`, and `recencyWeight` as query parameters or a separate configuration endpoint would let consumers tune the ranking to their domain (e.g., a security-focused consumer might down-weight recency in favour of stars).

**Observability**
Structured logging, Prometheus metrics (cache hit/miss rate, circuit breaker state transitions, GitHub API latency histogram), and distributed tracing (OpenTelemetry) would make production diagnosis significantly easier.

**Authentication & API keys**
Adding API key or JWT-based authentication to this service would allow per-consumer rate limiting and usage tracking before requests ever reach GitHub.
