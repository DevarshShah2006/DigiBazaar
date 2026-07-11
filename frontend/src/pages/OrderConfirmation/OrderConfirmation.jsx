import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchJson } from '../../api/api'
import './OrderConfirmation.css'

function AnimatedDeliveryMap({ status, fulfillment }) {
  // Simple animated SVG map representing Shop, Rider, and Customer
  // Rider (dot) moves along the line depending on status
  let riderPosPct = 0
  let isRiderActive = false

  if (fulfillment === 'digibazaar_delivery' || fulfillment === 'shop_delivery') {
    isRiderActive = true
    if (status === 'accepted') riderPosPct = 10
    if (status === 'preparing') riderPosPct = 25
    if (status === 'ready') riderPosPct = 40
    if (status === 'picked_up') riderPosPct = 70
    if (status === 'delivered') riderPosPct = 100
  }

  return (
    <div className="live-tracker-map">
      <div className="map-title-row">
        <span>Simulated Live Tracking (Paldi, Ahmedabad Zone)</span>
        <span className="live-dot-indicator"></span>
      </div>
      
      <svg viewBox="0 0 400 180" className="vector-tracker-svg">
        {/* Road Background lines */}
        <line x1="40" y1="90" x2="360" y2="90" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
        <line x1="40" y1="90" x2="360" y2="90" stroke="#047857" strokeWidth="2" strokeDasharray="6,6" strokeLinecap="round" />
        
        {/* Shop Node */}
        <circle cx="80" cy="90" r="16" fill="#fff" stroke="#0891b2" strokeWidth="3" />
        <text x="80" y="94" textAnchor="middle" fontSize="9">Shop</text>
        <text x="80" y="65" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0891b2">SHOP</text>

        {/* Customer Node */}
        <circle cx="320" cy="90" r="16" fill="#fff" stroke="#047857" strokeWidth="3" />
        <text x="320" y="94" textAnchor="middle" fontSize="9">Home</text>
        <text x="320" y="65" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#047857">YOU</text>

        {/* Rider Moto dot */}
        {isRiderActive && status !== 'delivered' && (
          <g transform={`translate(${80 + (240 * riderPosPct) / 100}, 0)`}>
            <circle cx="0" cy="90" r="12" fill="#6366f1" />
            <text x="0" y="94" textAnchor="middle" fontSize="9" fill="#fff">Rider</text>
            <circle cx="0" cy="90" r="20" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.3" className="pulse-ring" />
          </g>
        )}

        {/* Delivered success state dot */}
        {status === 'delivered' && (
          <g transform="translate(320, 0)">
            <circle cx="0" cy="90" r="22" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.4" className="pulse-ring" />
          </g>
        )}
      </svg>
      <div className="map-coordinates-info">
        <span>Rider status: <strong className="status-highlight">{status.replace('_', ' ')}</strong></span>
      </div>
    </div>
  )
}

function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const pollInterval = useRef(null)

  const fetchOrderDetails = () => {
    fetchJson(`/orders/${orderId}/`)
      .then(data => {
        setOrder(data)
        setLoading(false)
        
        // Stop polling once delivered or rejected
        if (data.status === 'delivered' || data.status === 'rejected') {
          if (pollInterval.current) {
            clearInterval(pollInterval.current)
            pollInterval.current = null
          }
        }
      })
      .catch(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchOrderDetails()
    
    // Set up polling interval every 4 seconds for hot updates
    pollInterval.current = setInterval(fetchOrderDetails, 4000)
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="order-conf container">
        <div className="order-conf__loading">
          <div className="loading-spinner"></div>
          <p>Connecting to DigiBazaar core services...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-conf container">
        <div className="order-conf__error">
          <p>Could not locate order ID #{orderId} details.</p>
          <button onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    )
  }

  // Get active steps
  const steps = ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered']
  const currentStepIdx = steps.indexOf(order.status)

  const getFulfillmentText = (opt) => {
    if (opt === 'pickup') return 'Store Self-Pickup'
    if (opt === 'shop_delivery') return 'Store Partner Delivery'
    return 'DigiBazaar Express (15 Min)'
  }

  return (
    <div className="order-conf fade-in">
      <div className="container order-conf-layout-grid">
        {/* Left column: Success & tracking */}
        <div className="tracking-main-card">
          <div className="order-success-header">
            <div>
              <h1>Order Confirmed!</h1>
              <p>Order ID: #{order.id} · Shop: {order.shop_name}</p>
            </div>
          </div>

          {/* Interactive SVG Tracking Map */}
          <AnimatedDeliveryMap status={order.status} fulfillment={order.fulfillment_option} />

          {/* Stepper Progress bar */}
          <div className="order-stepper-box">
            <h3>Fulfillment Progress</h3>
            <div className="order-stepper">
              {steps.map((st, idx) => {
                // If it is pickup, skip picked_up step
                if (order.fulfillment_option === 'pickup' && st === 'picked_up') return null

                const isCompleted = idx <= currentStepIdx
                const isActive = idx === currentStepIdx

                let label = st.charAt(0).toUpperCase() + st.slice(1)
                if (st === 'pending') label = 'Placed'
                if (st === 'picked_up') label = 'Out for Delivery'

                return (
                  <div key={st} className={`step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                    <div className="step-circle">
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className="step-label">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="tracking-actions-row">
            <button className="btn btn--primary" onClick={() => navigate('/my-orders')}>
              View Order History
            </button>
            <button className="btn btn--secondary" onClick={() => navigate('/')}>
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Right column: Delivery partner & Bill details */}
        <div className="tracking-side-column">
          {/* Rider profile if assigned */}
          {(order.fulfillment_option === 'digibazaar_delivery' || order.fulfillment_option === 'shop_delivery') && (
            <div className="delivery-partner-card">
              <h3>Delivery Partner</h3>
              {order.rider ? (
                <div className="rider-card-details">
                  <div className="rider-avatar-text">Rider Profile</div>
                  <div className="rider-info-text">
                    <h4>{order.rider.user_name || 'DigiBazaar Rider'}</h4>
                    <p>Vehicle: {order.rider.vehicle_type || 'Motorcycle'} ({order.rider.vehicle_number || 'KA-01-XX-9999'})</p>
                    <p className="rider-status-tag">Status: Online</p>
                  </div>
                  <button className="contact-rider-btn" onClick={() => alert(`Calling rider +91 ${order.rider.phone || '9988776655'}`)}>
                    Call
                  </button>
                </div>
              ) : (
                <div className="no-rider-assigned">
                  <p>Allocating nearest express delivery partner...</p>
                </div>
              )}
            </div>
          )}

          {/* Bill Summary */}
          <div className="bill-details-card">
            <h3>Bill Overview</h3>
            <div className="billing-rows">
              {order.items && order.items.map(item => (
                <div key={item.id} className="bill-row">
                  <span>{item.product_name} x {item.quantity}</span>
                  <span>₹{(item.price_at_order * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="bill-row delivery-row-fee">
                <span>Delivery Charge ({getFulfillmentText(order.fulfillment_option)})</span>
                <span>₹{parseFloat(order.delivery_charge).toFixed(2)}</span>
              </div>
              <div className="grand-total-row">
                <span>Paid via {order.fulfillment_option === 'pickup' ? 'N/A' : 'Online UPI'}</span>
                <span>₹{parseFloat(order.total_price).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmation
