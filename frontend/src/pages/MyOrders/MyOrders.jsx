import { useEffect, useState } from 'react'
import { fetchJson } from '../../api/api'
import { useCart } from '../../context/CartContext'
import './MyOrders.css'

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', bg: '#fffbeb', label: '⏳ Pending' },
  accepted: { color: '#3b82f6', bg: '#eff6ff', label: '✅ Accepted' },
  preparing: { color: '#f97316', bg: '#fff7ed', label: '👨‍🍳 Preparing' },
  ready: { color: '#8b5cf6', bg: '#f5f3ff', label: '🔔 Ready' },
  completed: { color: '#22c55e', bg: '#f0fdf4', label: '🎉 Completed' },
  rejected: { color: '#ef4444', bg: '#fef2f2', label: '❌ Rejected' },
}

function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    fetchJson('/orders/my-orders/')
      .then(data => {
        setOrders(Array.isArray(data) ? data : (data.results || []))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return
    order.items.forEach(item => {
      const product = {
        id: item.product,
        name: item.product_name,
        image_url: item.image_url,
        price: item.price_at_order,
      }
      addItem(product, item.quantity)
    })
  }

  if (loading) return (
    <div className="my-orders container">
      <h1 className="my-orders__title">My Orders</h1>
      {Array(3).fill(0).map((_, i) => (
        <div key={i} className="order-skeleton" />
      ))}
    </div>
  )

  return (
    <div className="my-orders container">
      <h1 className="my-orders__title">My Orders</h1>
      {orders.length === 0 ? (
        <div className="my-orders__empty">
          <p>📦 No orders yet!</p>
          <a href="/products">Start shopping →</a>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            return (
              <div className="order-row" key={order.id}>
                <div className="order-row__left">
                  <h3 className="order-row__id">Order #{order.id}</h3>
                  <p className="order-row__shop">🏪 {order.shop_name}</p>
                  <p className="order-row__date">{new Date(order.created_at).toLocaleString()}</p>
                  
                  {order.items && order.items.length > 0 && (
                    <div className="order-row__items-preview">
                      {order.items.map(item => (
                        <div key={item.id} className="order-row__item-pill">
                          {item.product_name} x{item.quantity} (₹{parseFloat(item.price_at_order).toFixed(2)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="order-row__right">
                  <span
                    className="order-row__status"
                    style={{ color: cfg.color, background: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                  
                  <button 
                    className="order-row__reorder-btn"
                    onClick={() => handleReorder(order)}
                  >
                    🔄 Reorder Items
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyOrders
