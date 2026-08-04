/**
 * Lightweight in-memory TTL cache for API GET responses.
 * Reduces redundant network requests within a session.
 */

const _cache = new Map()

/**
 * Get a cached value if it exists and hasn't expired.
 * @param {string} key
 * @returns {any|null}
 */
function getCached(key) {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key)
    return null
  }
  return entry.value
}

/**
 * Store a value in the cache with a TTL.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs - Time to live in milliseconds
 */
function setCached(key, value, ttlMs) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/**
 * Clear all cache entries or a specific key.
 * @param {string} [key] - If omitted, clears all entries
 */
export function clearCache(key) {
  if (key) {
    _cache.delete(key)
  } else {
    _cache.clear()
  }
}

/**
 * Cached fetch wrapper. For GET requests, returns cached response if available.
 * Non-GET requests skip cache and invalidate related keys.
 *
 * @param {string} endpoint - API endpoint path (used as cache key)
 * @param {Function} fetchFn - The fetchJson function to use
 * @param {object} options - Options passed to fetchJson
 * @param {number} [ttlMs=60000] - Cache TTL in ms (default 60 seconds)
 * @returns {Promise<any>}
 */
export async function cachedFetch(endpoint, fetchFn, options = {}, ttlMs = 60_000) {
  const method = (options.method || 'GET').toUpperCase()

  // Only cache GET requests
  if (method !== 'GET') {
    // Invalidate any cache entries that start with the same base path
    const base = endpoint.split('?')[0]
    for (const key of _cache.keys()) {
      if (key.startsWith(base)) {
        _cache.delete(key)
      }
    }
    return fetchFn(endpoint, options)
  }

  const cached = getCached(endpoint)
  if (cached !== null) {
    return cached
  }

  const result = await fetchFn(endpoint, options)
  if (result !== null && result !== undefined) {
    setCached(endpoint, result, ttlMs)
  }
  return result
}

/**
 * Short TTLs for frequently-changing data, longer for static data.
 */
export const TTL = {
  STATIC: 5 * 60_000,    // 5 minutes — categories, shop info
  NORMAL: 60_000,         // 60 seconds — products, inventory
  SHORT: 30_000,          // 30 seconds — revenue, orders, alerts
  WEATHER: 10 * 60_000,  // 10 minutes — weather
}
