import { apiFetch, fetchJson } from './api'
import { TTL } from './cache'

export function getProducts(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/products/${qs ? `?${qs}` : ''}`, {}, TTL.NORMAL)
}

export function searchProducts(q, category) {
  const params = {}
  if (q) params.q = q
  if (category) params.category = category
  return apiFetch(`/products/search/?${new URLSearchParams(params)}`, {}, TTL.SHORT)
}

export function getProduct(id) {
  return apiFetch(`/products/detail/${id}/`, {}, TTL.NORMAL)
}

/**
 * Fetch categories from the dedicated /categories/ endpoint.
 * Previously fetched ALL products just to extract categories — now fixed.
 * Cached for 5 minutes since categories rarely change.
 */
export function getCategories() {
  return apiFetch('/categories/', {}, TTL.STATIC)
}
