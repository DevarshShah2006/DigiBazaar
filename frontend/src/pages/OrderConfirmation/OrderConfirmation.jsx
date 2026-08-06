import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchJson, apiFetch, TTL } from '../../api/api'
import RouteMap from '../../components/RouteMap/RouteMap'
import TaxInvoiceModal from '../../components/TaxInvoice/TaxInvoiceModal'
import './OrderConfirmation.css'

function AnimatedDeliveryMap({ order, status, fulfillment }) {
  // Live OpenStreetMap route between the shop and the customer's home.
  // The rider marker is interpolated along the route based on order status.
  const shopLat = Number(order?.shop_lat)
  const shopLon = Number(order?.shop_long)
  const homeLat = Number(order?.lat)
  const homeLon = Number(order?.long)

  let riderPosPct = 0
  if (fulfillment === 'digibazaar_delivery' || fulfillment === 'shop_delivery') {
    if (status === 'accepted') riderPosPct = 10
    else if (status === 'preparing') riderPosPct = 25
    else if (status === 'ready') riderPosPct = 40
    else if (status === 'picked_up') riderPosPct = 70
    else if (status === 'delivered') riderPosPct = 100
  }

  const riderPos =
    Number.isFinite(shopLat) && Number.isFinite(homeLat)
      ? {
          lat: shopLat + (homeLat - shopLat) * (riderPosPct / 100),
          long: shopLon + (homeLon - shopLon) * (riderPosPct / 100),
        }
      : null

  return (
    <div className="live-tracker-map">
      <div className="map-title-row">
        <span>{order?.shop_name || 'Shop'} → Your Home · Live Route</span>
        <span className="live-dot-indicator"></span>
      </div>

      <RouteMap
        height={240}
        origin={{
          lat: shopLat,
          long: shopLon,
          label: order?.shop_name || 'Shop',
          icon: '🛒',
          color: '#0891b2',
        }}
        destination={{
          lat: homeLat,
          long: homeLon,
          label: 'Your Home',
          icon: '🏠',
          color: '#10b981',
        }}
        rider={riderPos}
      />

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
  const [recommended, setRecommended] = useState([])
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const pollInterval = useRef(null)

  useEffect(() => {
    apiFetch('/products/recommended/?limit=4', {}, TTL.NORMAL)
      .then(data => {
        const products = data || []
        setRecommended(products.slice(0, 4))
      })
      .catch(() => setRecommended([]))
  }, [])

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

  // Delivery and tax are free in checkout. The final payable amount therefore
  // matches the cart calculation: items total less any applied promo.
  const itemsTotal = (order.items || []).reduce(
    (total, item) => total + (parseFloat(item.price_at_order || 0) * Number(item.quantity || 0)),
    0
  )
  const discountAmount = Math.min(itemsTotal, Math.max(0, parseFloat(order.discount_amount || 0)))
  const totalPayable = itemsTotal - discountAmount

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

          {/* Live OpenStreetMap tracking map */}
          <AnimatedDeliveryMap order={order} status={order.status} fulfillment={order.fulfillment_option} />

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
            <button className="btn btn--primary" onClick={() => setShowInvoiceModal(true)} style={{ background: '#059669', color: '#fff' }}>
              Download Tax Invoice (PDF)
            </button>
            <button className="btn btn--secondary" onClick={() => navigate('/my-orders')}>
              View Order History
            </button>
            <button className="btn btn--secondary" onClick={() => navigate('/')}>
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Right column: Delivery partner & Bill details */}
        <div className="tracking-side-column">
          {/* Delivery Method Summary */}
          {order.ml_decision_tree_details && (
            <div className="delivery-partner-card ml-decision-tree-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#59290e', background: '#f0ece5', padding: '3px 8px', borderRadius: '6px' }}>
                  Recommended Delivery Method
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#2d1609', fontWeight: 600 }}>
                Selected Option: <span style={{ color: '#a64d22' }}>{order.fulfillment_option === 'digibazaar_delivery' ? 'Home Delivery' : order.fulfillment_option === 'shop_delivery' ? 'Shop Delivery' : 'Store Pickup'}</span>
              </div>
            </div>
          )}

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
                  <button className="contact-rider-btn" onClick={() => {
                    const phone = order.rider?.phone || order.rider_phone || order.delivery_assignment?.rider?.phone || '9988776655';
                    window.location.href = `tel:+91${phone.replace(/\D/g, '')}`;
                  }}>
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
              <div className="bill-row">
                <span>Items Total</span>
                <span>{`₹${itemsTotal.toFixed(2)}`}</span>
              </div>
              {discountAmount > 0 && (
                <div className="bill-row bill-row--discount">
                  <span>Promo Discount</span>
                  <span>{`- ₹${discountAmount.toFixed(2)}`}</span>
                </div>
              )}
              <div className="grand-total-row">
                <span>Total Payable</span>
                <span>{`₹${totalPayable.toFixed(2)}`}</span>
              </div>
              <p className="bill-payment-method">Paid via {order.payment_method ? order.payment_method.toUpperCase() : 'UPI'}</p>
              {false && <>
              {order.items && order.items.map(item => (
                <div key={item.id} className="bill-row">
                  <span>{item.product_name} x {item.quantity}</span>
                  <span>₹{(parseFloat(item.price_at_order) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="bill-row delivery-row-fee">
                <span>Delivery Charge ({getFulfillmentText(order.fulfillment_option)})</span>
                <span>₹{parseFloat(order.delivery_charge || 0).toFixed(2)}</span>
              </div>
              {order.tax_amount && parseFloat(order.tax_amount) > 0 && (
                <div className="bill-row">
                  <span>Taxes & GST (5%)</span>
                  <span>₹{parseFloat(order.tax_amount).toFixed(2)}</span>
                </div>
              )}
              {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
                <div className="bill-row discount-row" style={{ color: '#10b981' }}>
                  <span>Discount</span>
                  <span>- ₹{parseFloat(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="grand-total-row">
                <span>Paid via {order.payment_method ? order.payment_method.toUpperCase() : 'UPI'}</span>
                <span>₹{(order.total_amount ? parseFloat(order.total_amount) : parseFloat(order.total_price || 0)).toFixed(2)}</span>
              </div>
              </>}
            </div>
          </div>
        </div>
      </div>

      {recommended.length > 0 && (
        <div className="container" style={{ marginTop: '40px' }}>
          <section className="order-conf-recommended">
            <div className="order-conf-recommended__header">
              <div>
                <p className="order-conf-eyebrow">🍿 Quick Snacks & Beverages</p>
                <h2 className="order-conf-heading">Recommended Snacks, Munchies & Beverages</h2>
              </div>
            </div>
            <div className="order-conf-recommended__grid">
              {recommended.map(product => (
                <RecommendedProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        </div>
      )}

      {showInvoiceModal && (
        <TaxInvoiceModal order={order} onClose={() => setShowInvoiceModal(false)} />
      )}
    </div>
  )
}

export default OrderConfirmation
