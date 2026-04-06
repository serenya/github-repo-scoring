export const CACHE_PORT = Symbol('CachePort');

/**
 * Port (secondary/driven port) for a generic key-value cache with per-entry TTL.
 * Implementations are swappable — the current default is {@link InMemoryLruCache};
 * a Redis-backed adapter can be substituted without touching application code.
 */
export interface CachePort<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V, ttlMs: number): void;
  delete(key: K): void;
}
