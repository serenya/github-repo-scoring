export interface AppConfig {
  port: number;
  githubApiBase: string;
  githubApiVersion: string;
  githubToken: string | undefined;
  githubApiTimeoutMs: number;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerHalfOpenTimeoutMs: number;
}

export function createAppConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3000),
    githubApiBase: process.env.GITHUB_API_BASE ?? 'https://api.github.com',
    githubApiVersion: process.env.GITHUB_API_VERSION ?? '2026-03-10',
    githubToken: process.env.GITHUB_TOKEN || undefined,
    githubApiTimeoutMs: Number(process.env.GITHUB_API_TIMEOUT_MS ?? 5_000),
    cacheTtlMs: Number(process.env.CACHE_TTL_MS ?? 5 * 60 * 1_000),
    cacheMaxEntries: Number(process.env.CACHE_MAX_ENTRIES ?? 100),
    circuitBreakerFailureThreshold: Number(process.env.CB_FAILURE_THRESHOLD ?? 5),
    circuitBreakerHalfOpenTimeoutMs: Number(process.env.CB_HALF_OPEN_TIMEOUT_MS ?? 30_000),
  };
}

export const APP_CONFIG = Symbol('AppConfig');
