import type { CachePort } from '../../application/ports/cache.port';

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * In-process LRU (Least Recently Used) cache implementing {@link CachePort}.
 *
 * Internally backed by a `Map`, which preserves insertion order in JavaScript.
 * LRU promotion is O(1): on every read the entry is deleted and re-inserted at
 * the tail. On write, the oldest entry (head of the map) is evicted when
 * `maxEntries` is reached. Each entry carries an absolute expiry timestamp;
 * expired entries are lazily removed on the next read.
 */
export class InMemoryLruCache<K, V> implements CachePort<K, V> {
  private readonly store = new Map<K, CacheEntry<V>>();

  constructor(private readonly maxEntries: number) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // LRU promotion: re-insert at end of insertion-order map
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    if (this.store.has(key)) this.store.delete(key);
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey as K);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: K): void {
    this.store.delete(key);
  }
}
