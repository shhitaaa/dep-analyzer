interface CacheEntry {
  result: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 200;

function sweepExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > TTL_MS) cache.delete(key);
  }
}

// Remove expired entries every minute so unrequested keys don't sit in memory.
// unref() keeps this timer from holding the process (or the test runner) open.
setInterval(sweepExpired, 60 * 1000).unref();

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
  cache.delete(key); 
  cache.set(key, { result, timestamp: Date.now() });

  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}