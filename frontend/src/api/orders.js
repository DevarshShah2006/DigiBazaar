import { fetchJson } from './api'

export function getOrders() {
  return fetchJson('/orders/')
}
