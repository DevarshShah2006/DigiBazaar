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
    if (!isRefreshing) {
      isRefreshing = true
      const newToken = await refreshAccessToken()
      isRefreshing = false
      if (newToken) {
        onRefreshed(newToken)
        // Retry original request with new token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        }
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        })
      } else {
        // Refresh failed — clear all auth data and notify app
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth:logout'))
        return null
      }
    } else {
      // Wait for the refresh to complete
      const newToken = await new Promise(resolve => {
        refreshSubscribers.push(resolve)
      })
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      }
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      })
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
