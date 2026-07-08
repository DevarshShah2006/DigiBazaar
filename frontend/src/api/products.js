import { fetchJson } from './api'

export function getProducts(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return fetchJson(`/products/${qs ? `?${qs}` : ''}`)
}

export function searchProducts(q, category) {
  const params = {}
  if (q) params.q = q
  if (category) params.category = category
  return fetchJson(`/products/search/?${new URLSearchParams(params)}`)
}

export function getProduct(id) {
  return fetchJson(`/products/detail/${id}/`)
}

export function getCategories() {
  return fetchJson('/products/?format=json').then(data => {
    // Extract unique categories from products
    const cats = {}
    ;(data.results || data || []).forEach(p => {
      if (p.category_name && !cats[p.category_name]) {
        cats[p.category_name] = { name: p.category_name, slug: p.category_slug }
      }
    })
    return Object.values(cats)
  })
}
