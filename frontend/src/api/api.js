import { cachedFetch, clearCache, TTL } from './cache'

export { clearCache, TTL }

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const API_BASE = import.meta.env.VITE_API_BASE || `http://${hostname}:8000/api`

function getToken() {
  return localStorage.getItem('access_token')
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

let isRefreshing = false
let refreshSubscribers = []

function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken })
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.access) {
      localStorage.setItem('access_token', data.access)
      return data.access
    }
    return null
  } catch {
    return null
  }
}

/**
 * Core fetch function — handles auth headers and token refresh.
 * Use fetchJson directly for mutations (POST/PUT/DELETE).
 * For GETs, prefer apiFetch() which adds caching.
 */
export async function fetchJson(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  // Token expired — try to refresh once
  if (response.status === 401) {
    let newToken = null
    if (!isRefreshing) {
      isRefreshing = true
      newToken = await refreshAccessToken()
      isRefreshing = false
      if (newToken) {
        onRefreshed(newToken)
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth:logout'))
      }
    } else {
      newToken = await new Promise(resolve => {
        refreshSubscribers.push(resolve)
      })
    }

    if (newToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      }
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      })
    } else {
      // Token refresh failed - retry without Authorization header for public endpoints
      const unauthHeaders = { ...headers }
      delete unauthHeaders.Authorization
      const retryUnauth = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: unauthHeaders,
      })
      if (retryUnauth.ok) {
        try {
          return await retryUnauth.json()
        } catch {
          return null
        }
      }
      return null
    }
  }

  if (!response.ok && response.status >= 500) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Cached version of fetchJson for GET requests.
 * Pass a TTL from the TTL constant or a custom value in ms.
 * POST/PUT/DELETE requests bypass cache and invalidate related entries.
 *
 * @param {string} endpoint
 * @param {object} [options]
 * @param {number} [ttlMs] - override default 60s TTL
 */
export function apiFetch(endpoint, options = {}, ttlMs = TTL.NORMAL) {
  return cachedFetch(endpoint, fetchJson, options, ttlMs)
}
