interface CacheEntry {
  result: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > TTL_MS;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.result;
}

export function setCached(key: string, result: unknown): void {
  cache.set(key, { result, timestamp: Date.now() });
}