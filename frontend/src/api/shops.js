import { fetchJson } from './api'

export function getShops() {
  return fetchJson('/shops/')
}
