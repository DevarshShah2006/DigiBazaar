import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCart as useCartState } from '../../context/CartContext'
import { fetchJson } from '../../api/api'
import { useNavigate } from 'react-router-dom'
import './Checkout.css'

const DEFAULT_COORD = { lat: 23.0125, long: 72.5575 }

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    })
  })
}

export default function Checkout() {
  const { isLoggedIn } = useAuth()
  const { items, total, clearCart } = useCartState()
  const navigate = useNavigate()
  const [address, setAddress] = useState(
    localStorage.getItem('digibazaar_cart_delivery_address') || localStorage.getItem('delivery_address') || '102, Patel Residency, Paldi, Ahmedabad, Gujarat - 380007'
  )
  const [location, setLocation] = useState(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [loading, setLoading] = useState(false)
  const [deliveryOption, setDeliveryOption] = useState(
    localStorage.getItem('digibazaar_cart_delivery_option') || 'home'
  )
  const [discountCode, setDiscountCode] = useState(
    localStorage.getItem('digibazaar_cart_discount_code') || ''
  )
  const [discountAmount, setDiscountAmount] = useState(
    parseFloat(localStorage.getItem('digibazaar_cart_discount_amount') || '0') || 0
  )
  const [discountApplied, setDiscountApplied] = useState(
    localStorage.getItem('digibazaar_cart_discount_applied') === 'true'
  )

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
    }
  }, [isLoggedIn, navigate])

  useEffect(() => {
    if (items.length === 0 && isLoggedIn) {
      navigate('/')
    }
  }, [items, navigate, isLoggedIn])

  // Sync address from cart or navbar address updates
  useEffect(() => {
    const handleUpdate = () => {
      const updated = localStorage.getItem('digibazaar_cart_delivery_address') || localStorage.getItem('delivery_address')
      if (updated) setAddress(updated)
    }
    window.addEventListener('addressUpdated', handleUpdate)
    return () => window.removeEventListener('addressUpdated', handleUpdate)
  }, [])

  // Capture the customer's real coordinates via navigator.geolocation
  useEffect(() => {
    let cancelled = false
    getCurrentPosition()
      .then(pos => {
        if (cancelled) return
        const coords = { lat: pos.coords.latitude, long: pos.coords.longitude }
        setLocation(coords)
        localStorage.setItem('digibazaar_customer_location', JSON.stringify(coords))
      })
      .catch(() => {
        // Fall back to saved coords or default (Paldi, Ahmedabad)
        try {
          const saved = JSON.parse(localStorage.getItem('digibazaar_customer_location'))
          if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.long)) setLocation(saved)
        } catch (e) { /* ignore */ }
      })
    return () => { cancelled = true }
  }, [])

  const detectLocationNow = () => {
    setDetectingLocation(true)
    getCurrentPosition()
      .then(pos => {
        const coords = { lat: pos.coords.latitude, long: pos.coords.longitude }
        setLocation(coords)
        localStorage.setItem('digibazaar_customer_location', JSON.stringify(coords))
      })
      .catch(() => alert('Could not detect your current location. Make sure location permission is granted.'))
      .finally(() => setDetectingLocation(false))
  }

  const [mlRecommendation, setMlRecommendation] = useState(null)
  const [fulfillmentChoice, setFulfillmentChoice] = useState(
    localStorage.getItem('digibazaar_cart_delivery_option') || 'digibazaar_delivery'
  )

  // Fetch ML DecisionTreeClassifier Recommendation
  useEffect(() => {
    if (items.length > 0) {
      const shopId = items[0]?.shop_id || (items[0]?.shops && items[0]?.shops[0]?.id)
      const coords = location || DEFAULT_COORD
      fetchJson('/orders/recommend-delivery/', {
        method: 'POST',
        body: JSON.stringify({
          shop_id: shopId,
          order_value: total,
          lat: coords.lat,
          long: coords.long
        })
      }).then(data => {
        if (data && data.recommended_delivery_mode) {
          setMlRecommendation(data)
          if (!localStorage.getItem('digibazaar_user_selected_delivery')) {
            setFulfillmentChoice(data.recommended_delivery_mode)
          }
        }
      }).catch(() => {})
    }
  }, [items, location, total])

  // Delivery charge calculations
  const getDeliveryCharge = () => {
    if (fulfillmentChoice === 'pickup') return 0.00
    if (fulfillmentChoice === 'shop_delivery') return mlRecommendation?.pricing_options?.shop_delivery || 25.00
    return mlRecommendation?.pricing_options?.digibazaar_delivery || 25.00
  }

  const getETA = () => {
    if (fulfillmentChoice === 'pickup') return mlRecommendation?.estimated_delivery_time || 'Ready in 10 mins'
    if (fulfillmentChoice === 'shop_delivery') return mlRecommendation?.estimated_delivery_time || '15-25 mins (Shop Delivery)'
    return mlRecommendation?.estimated_delivery_time || '12-18 mins (DigiBazaar Express)'
  }

  const handleFulfillmentChange = (choice) => {
    setFulfillmentChoice(choice)
    localStorage.setItem('digibazaar_user_selected_delivery', 'true')
    localStorage.setItem('digibazaar_cart_delivery_option', choice)
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    try {
      // Pre-check: DigiExpress + multi-store warning
      const fulfillment = fulfillmentChoice
      if (fulfillment === 'digibazaar_delivery') {
        const shopIds = new Set(items.map(i => i.shop_id || (i.shops && i.shops[0]?.id)).filter(Boolean))
        if (shopIds.size > 1) {
          alert('DigiBazaar Express only allows items from a SINGLE store per order. Please remove multi-store items or choose Shop Delivery / Pickup.')
          setLoading(false)
          return
        }
      }

      // Get the customer's current coordinates at the time of placing the order
      let coords = location || DEFAULT_COORD
      try {
        const pos = await getCurrentPosition()
        coords = { lat: pos.coords.latitude, long: pos.coords.longitude }
        setLocation(coords)
        localStorage.setItem('digibazaar_customer_location', JSON.stringify(coords))
      } catch (e) {
        // Fall back to detected/previous/default coordinates
        try {
          const saved = JSON.parse(localStorage.getItem('digibazaar_customer_location'))
          if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.long)) coords = saved
        } catch (err) { /* ignore */ }
      }

      const payload = {
        items: items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          shop_id: i.shop_id || (i.shops && i.shops[0]?.id) || undefined
        })),
        fulfillment_option: fulfillment,
        delivery_address: address,
        payment_method: paymentMethod,
        discount_amount: discountAmount,
        lat: coords.lat,
        long: coords.long
      }

      const res = await fetchJson('/orders/checkout/', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (res && (res.detail || res.error)) {
        alert(res.detail || res.error || 'Failed to place order.')
        return
      }

      clearCart()

      if (res && res.length > 0) {
        navigate(`/order-confirmation/${res[0].id}`)
      } else if (res && res.id) {
        navigate(`/order-confirmation/${res.id}`)
      } else {
        navigate('/my-orders')
      }
    } catch (err) {
      alert('Failed to place order. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const subtotal = total
  const deliveryFee = getDeliveryCharge()
  const smallOrderCharge = deliveryOption === 'home' && subtotal > 0 && subtotal < 100 ? 49.00 : 0.00
  const grandTotal = subtotal + deliveryFee + smallOrderCharge - discountAmount

  return (
    <div className="checkout-page fade-in">
      <div className="container checkout-container">
        {/* Left Side: Forms */}
        <div className="checkout-main-content">
          <h2 className="page-header-title">Checkout</h2>

          {/* Delivery Location Section */}
          <div className="checkout-card">
            <div className="card-header-icon">
              <h3>Delivery Location</h3>
            </div>
            <div className="address-display">
              <p>{address}</p>
            </div>
            <div className="location-detect-row" style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="detect-loc-btn"
                onClick={detectLocationNow}
                disabled={detectingLocation}
                style={{ border: 'none', background: '#e0f2fe', color: '#0369a1', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
              >
                {detectingLocation ? 'Detecting Current Location…' : '📍 Use My Current Location'}
              </button>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {location
                  ? `Coordinates captured: ${location.lat.toFixed(5)}, ${location.long.toFixed(5)}`
                  : 'Location not detected yet — will attempt again at checkout'}
              </span>
            </div>
          </div>

          {/* Delivery Summary */}
          <div className="checkout-card delivery-card clean-card">
            <div className="card-header-icon">
              <div>
                <h3>Delivery Method</h3>
              </div>
              <span className="delivery-badge" style={{ background: '#59290e', color: '#ffffff' }}>
                {fulfillmentChoice === 'pickup' ? 'Store Pickup' : fulfillmentChoice === 'shop_delivery' ? 'Shop Delivery' : 'Home Delivery'}
              </span>
            </div>
            <div className="delivery-summary-card compact" style={{ marginTop: '12px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px' }}>
              <div className="delivery-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Estimated Time</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{getETA()}</strong>
              </div>
              <div className="delivery-summary-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Delivery Fee</span>
                <strong style={{ fontSize: '13px', color: '#16a34a' }}>FREE</strong>
              </div>
            </div>
          </div>

          {/* Payments Selector */}
          <div className="checkout-card">
            <div className="card-header-icon">
              <h3>Payment Methods</h3>
            </div>
            <div className="payment-options">
              <label className={`payment-method-row ${paymentMethod === 'upi' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="upi" 
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                />
                <span>UPI (GPay, PhonePe, Paytm)</span>
              </label>
              <label className={`payment-method-row ${paymentMethod === 'card' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="card" 
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span>Credit / Debit Card</span>
              </label>
              <label className={`payment-method-row ${paymentMethod === 'cod' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  value="cod" 
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span>Cash on Delivery</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Side: Bill Details & Cart Overview */}
        <div className="checkout-side-bar">
          <div className="checkout-sticky-panel">
            {/* Bill Summary */}
            <div className="checkout-card bill-details-card">
              <h3>Bill Summary</h3>
              <div className="bill-item-row">
                <span>Basket Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="bill-item-row">
                <span>Delivery Charge</span>
                <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="bill-item-row">
                <span>Small Order Surcharge</span>
                <span>{smallOrderCharge === 0 ? '₹0' : `₹${smallOrderCharge.toFixed(2)}`}</span>
              </div>
              {discountApplied && discountAmount > 0 && (
                <div className="bill-item-row discount-row">
                  <span>Coupon Discount</span>
                  <span>- ₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="grand-total-row">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

              <button 
                className="place-order-primary-btn" 
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? 'Processing Order...' : `Place Order · ₹${grandTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
