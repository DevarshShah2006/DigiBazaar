import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchJson } from '../../api/api'
import './OrderConfirmation.css'

function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchJson(`/orders/${orderId}/`)
      .then(data => {
        setOrder(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [orderId])

  if (loading) {
    return (
      <div className="order-conf container">
        <div className="order-conf__loading">
          <div className="loading-spinner"></div>
          <p>Processing your order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-conf container">
        <div className="order-conf__error">
          <p>⚠️ Could not find order details.</p>
          <button onClick={() => navigate('/')}>Return Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="order-conf fade-in-up">
      <div className="container">
        <div className="order-conf__card">
          <div className="success-icon-wrap">
            <div className="success-icon-animated">✓</div>
          </div>
          
          <h1 className="order-conf__title">Order Confirmed!</h1>
          <p className="order-conf__subtitle">
            Thank you for shopping with DigiBazaar. Your order has been placed successfully.
          </p>

          <div className="order-conf__details">
            <div className="detail-row">
              <span>Order Number:</span>
              <strong>#{order.id}</strong>
            </div>
            <div className="detail-row">
              <span>Shop Name:</span>
              <strong>🏪 {order.shop_name}</strong>
            </div>
            <div className="detail-row">
              <span>Order Status:</span>
              <strong className="status-badge">{order.status}</strong>
            </div>
            <div className="detail-row">
              <span>Delivery Time:</span>
              <strong>🕒 30 - 45 mins (Estimated)</strong>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="order-conf__items-section">
              <h3>Items Ordered</h3>
              <div className="order-conf__items-list">
                {order.items.map(item => (
                  <div key={item.id} className="conf-item-row">
                    <span className="item-name">{item.product_name} <span className="item-qty">x{item.quantity}</span></span>
                    <span className="item-price">₹{(item.price_at_order * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="order-conf__total-row">
                <span>Total Amount:</span>
                <strong>₹{parseFloat(order.total_price).toFixed(2)}</strong>
              </div>
            </div>
          )}

          <div className="order-conf__actions">
            <button className="btn btn--primary" onClick={() => navigate('/my-orders')}>
              Track in My Orders
            </button>
            <button className="btn btn--secondary" onClick={() => navigate('/')}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmation
