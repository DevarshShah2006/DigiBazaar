import { fetchJson } from './api'

export function getProducts() {
  return fetchJson('/products/')
}
