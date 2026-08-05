import { apiFetch, TTL } from './api'

export function getShops() {
  return apiFetch('/shops/', {}, TTL.STATIC)
}
