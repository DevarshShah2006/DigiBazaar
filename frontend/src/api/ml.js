import { fetchJson } from './api'

export function getRecommendations(userId, limit = 10) {
  const url = userId ? `/recommend/${userId}/?limit=${limit}` : `/recommend/popular/?limit=${limit}`
  return fetchJson(url).catch(() => fetchJson(`/products/?limit=${limit}`))
}

export function getTrending(hours = 24, limit = 10) {
  return fetchJson(`/trending/?hours=${hours}&limit=${limit}`)
}
