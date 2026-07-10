import { fetchJson } from './api'

export function getOrders() {
  return fetchJson('/orders/shop-orders/')
}

export function acceptOrder(orderId) {
  return fetchJson('/orders/accept/', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  })
}

export function rejectOrder(orderId) {
  return fetchJson('/orders/reject/', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  })
}

export function advanceOrder(orderId) {
  return fetchJson('/orders/advance/', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  })
}