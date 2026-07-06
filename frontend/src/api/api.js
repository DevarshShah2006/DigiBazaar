const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export async function fetchJson(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  return response.json()
}
