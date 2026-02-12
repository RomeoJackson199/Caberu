/**
 * Offline cache utility for persisting critical data in localStorage.
 * Provides a TTL-based cache layer for data that should be available offline.
 * Works alongside the service worker API cache for a layered offline strategy.
 */

const CACHE_PREFIX = 'caberu-offline:';
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 100;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Store data in the offline cache with a time-to-live.
 */
export function setOfflineCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage may be full — evict oldest entries and retry once
    evictOldestEntries(5);
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Still failed, give up silently
    }
  }
}

/**
 * Retrieve data from the offline cache. Returns null if expired or missing.
 */
export function getOfflineCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Remove a specific entry from the offline cache.
 */
export function removeOfflineCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Check if a cache entry exists and is still valid.
 */
export function hasOfflineCache(key: string): boolean {
  return getOfflineCache(key) !== null;
}

/**
 * Get the age (in ms) of a cache entry. Returns null if not cached.
 */
export function getOfflineCacheAge(key: string): number | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return Date.now() - entry.timestamp;
  } catch {
    return null;
  }
}

/**
 * Clear all offline cache entries.
 */
export function clearOfflineCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Evict the oldest N cache entries to free space.
 */
function evictOldestEntries(count: number): void {
  try {
    const entries: { key: string; timestamp: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const entry: CacheEntry<unknown> = JSON.parse(raw);
            entries.push({ key, timestamp: entry.timestamp });
          }
        } catch {
          // corrupt entry, remove it
          localStorage.removeItem(key);
        }
      }
    }

    // Sort oldest first and remove
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = entries.slice(0, count);
    toRemove.forEach(e => localStorage.removeItem(e.key));
  } catch {
    // ignore
  }
}

/**
 * Enforce the max cache entry limit by evicting oldest entries.
 */
export function trimOfflineCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    if (keys.length > MAX_CACHE_ENTRIES) {
      evictOldestEntries(keys.length - MAX_CACHE_ENTRIES);
    }
  } catch {
    // ignore
  }
}

/**
 * Helper for caching Supabase query results with a standardized key pattern.
 * Usage: cacheQueryResult('appointments', userId, data)
 */
export function cacheQueryResult<T>(table: string, identifier: string, data: T, ttl = DEFAULT_TTL): void {
  setOfflineCache(`query:${table}:${identifier}`, data, ttl);
}

/**
 * Retrieve a cached Supabase query result.
 */
export function getCachedQueryResult<T>(table: string, identifier: string): T | null {
  return getOfflineCache<T>(`query:${table}:${identifier}`);
}
