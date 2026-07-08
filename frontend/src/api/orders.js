import { fetchJson } from "./api";

export function getOrders() {
  return fetchJson("/shop/orders/");
}

export function acceptOrder(orderId) {
  return fetchJson("/accept-order/", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
    }),
  });
}

export function rejectOrder(orderId) {
  return fetchJson("/reject-order/", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
    }),
  });
}