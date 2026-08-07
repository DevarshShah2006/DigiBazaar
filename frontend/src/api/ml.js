import { apiFetch, fetchJson } from './api'
import { TTL } from './cache'

/**
 * Get personalised product recommendations for a user.
 * Falls back to popular products for anonymous users.
 * @param {number|null} userId
 * @param {number} limit
 */
export function getRecommendations(userId, limit = 10) {
  const url = userId
    ? `/recommend/${userId}/?limit=${limit}`
    : `/recommend/popular/?limit=${limit}`
  return apiFetch(url, {}, TTL.NORMAL)
}

/**
 * Get trending products based on recent order volume.
 * @param {number} hours  - lookback window in hours (default 24)
 * @param {number} limit
 */
export function getTrending(hours = 24, limit = 10) {
  return apiFetch(`/trending/?hours=${hours}&limit=${limit}`, {}, TTL.SHORT)
}
