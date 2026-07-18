import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCart as useCartState } from '../../context/CartContext'
import { fetchJson } from '../../api/api'
import { useNavigate } from 'react-router-dom'
import './Checkout.css'

export default function Checkout() {
  const { isLoggedIn } = useAuth()
  const { items, total, clearCart } = useCartState()
  const navigate = useNavigate()
  const [fulfillment, setFulfillment] = useState('digibazaar_delivery')
  const [address, setAddress] = useState(
    localStorage.getItem('delivery_address') || '102, Patel Residency, Paldi, Ahmedabad, Gujarat - 380007'
  )
  const [savedAddresses, setSavedAddresses] = useState([
    '102, Patel Residency, Paldi, Ahmedabad, Gujarat - 380007',
    'NID Campus Hostel Block B, Paldi, Ahmedabad - 380007'
  ])
  const [newAddressOpen, setNewAddressOpen] = useState(false)
  const [newAddressText, setNewAddressText] = useState('')
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [loading, setLoading] = useState(false)
  const [mlRecommendation, setMlRecommendation] = useState(null)

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

  // Sync address from navbar location selector
  useEffect(() => {
    const handleUpdate = () => {
      const updated = localStorage.getItem('delivery_address')
      if (updated) setAddress(updated)
    }
    window.addEventListener('addressUpdated', handleUpdate)
    return () => window.removeEventListener('addressUpdated', handleUpdate)
  }, [])

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === 'WELCOME10') {
      setDiscount(total * 0.1)
      setCouponSuccess('WELCOME10 applied successfully! 10% Discount.')
      setCouponError('')
    } else {
      setCouponError('Invalid coupon code. Try WELCOME10.')
      setCouponSuccess('')
      setDiscount(0)
    }
  }

  // Fetch ML Delivery Recommendation
  useEffect(() => {
    if (items.length > 0) {
      const fetchRecommendation = async () => {
        try {
          const shopId = items[0]?.shop_id || (items[0]?.shops && items[0]?.shops[0]?.id)
          const productId = items[0]?.id
          if (!shopId && !productId) return

          const payload = {
            shop_id: shopId,
            product_id: productId,
            order_value: total,
            lat: 23.0125,
            long: 72.5575
          }

          const res = await fetchJson('/orders/recommend-delivery/', {
            method: 'POST',
            body: JSON.stringify(payload)
          })

          if (res && res.recommended_delivery_mode) {
            setMlRecommendation({
              mode: res.recommended_delivery_mode,
              confidence: res.delivery_mode_confidence
            })
            // Auto-select the recommended mode
            setFulfillment(res.recommended_delivery_mode)
          }
        } catch (error) {
          console.error("Failed to fetch ML recommendation", error)
        }
      }
      fetchRecommendation()
    }
  }, [items, total])

  // Delivery charge calculations
  const getDeliveryCharge = () => {
    if (fulfillment === 'pickup') return 0.00
    if (fulfillment === 'shop_delivery') return 25.00
    return 35.00 // DigiBazaar Express flat mock
  }

  const getETA = () => {
    if (fulfillment === 'pickup') return 'Ready in 10 mins'
    if (fulfillment === 'shop_delivery') return 'Delivered in 25-35 mins'
    return 'Delivered in 15-20 mins (Express)'
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    try {
      const payload = {
        items: items.map(i => ({
          product_id: i.id,
          quantity: i.quantity,
          shop_id: i.shop_id || (i.shops && i.shops[0]?.id) || undefined
        })),
        fulfillment_option: fulfillment,
        delivery_address: address,
        lat: 23.0125, // Mock coordinates
        long: 72.5575
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
      alert('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const subtotal = total
  const deliveryFee = getDeliveryCharge()
  const tax = subtotal * 0.05
  const grandTotal = subtotal + deliveryFee + tax - discount

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
              <button className="change-address-btn" onClick={() => setNewAddressOpen(!newAddressOpen)}>
                {newAddressOpen ? 'Close Address Form' : 'Choose another address'}
              </button>
            </div>

            {newAddressOpen && (
              <div className="address-picker-panel">
                <div className="saved-addresses-list">
                  {savedAddresses.map((addr, idx) => (
                    <label key={idx} className="address-label-card">
                      <input 
                        type="radio" 
                        name="address_choice" 
                        checked={address === addr} 
                        onChange={() => { setAddress(addr); setNewAddressOpen(false); }} 
                      />
                      <span>{addr}</span>
                    </label>
                  ))}
                </div>
                <div className="add-new-address-form">
                  <input 
                    type="text" 
                    placeholder="Enter new address..." 
                    value={newAddressText}
                    onChange={e => setNewAddressText(e.target.value)}
                  />
                  <button onClick={() => {
                    if (newAddressText.trim()) {
                      setSavedAddresses(prev => [...prev, newAddressText])
                      setAddress(newAddressText)
                      setNewAddressText('')
                      setNewAddressOpen(false)
                    }
                  }}>
                    Add Address
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fulfillment Model Options */}
          <div className="checkout-card">
            <div className="card-header-icon" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Fulfillment Options</h3>
              {mlRecommendation && (
                <div style={{ fontSize: '13px', color: '#6366f1', background: '#e0e7ff', padding: '4px 10px', borderRadius: '15px', fontWeight: 600 }}>
                  🤖 ML Recommended: {mlRecommendation.mode.replace('_', ' ')} ({mlRecommendation.confidence}%)
                </div>
              )}
            </div>
            <div className="fulfillment-grid">
              <label className={`fulfillment-option-card ${fulfillment === 'pickup' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="fulfillment" 
                  value="pickup" 
                  checked={fulfillment === 'pickup'} 
                  onChange={() => setFulfillment('pickup')}
                />
                <div className="fulfillment-info">
                  <span className="option-title">Store Pickup</span>
                  <span className="option-desc">Collect it yourself from the store</span>
                  <span className="option-cost font-bold">₹0.00</span>
                </div>
              </label>

              <label className={`fulfillment-option-card ${fulfillment === 'shop_delivery' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="fulfillment" 
                  value="shop_delivery" 
                  checked={fulfillment === 'shop_delivery'} 
                  onChange={() => setFulfillment('shop_delivery')}
                />
                <div className="fulfillment-info">
                  <span className="option-title">Shop Delivery</span>
                  <span className="option-desc">Delivered by the shop's partner</span>
                  <span className="option-cost font-bold">₹25.00</span>
                </div>
              </label>

              <label className={`fulfillment-option-card ${fulfillment === 'digibazaar_delivery' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="fulfillment" 
                  value="digibazaar_delivery" 
                  checked={fulfillment === 'digibazaar_delivery'} 
                  onChange={() => setFulfillment('digibazaar_delivery')}
                />
                <div className="fulfillment-info">
                  <span className="option-title">DigiBazaar Express</span>
                  <span className="option-desc">Delivered in 15 mins by DigiBazaar Riders</span>
                  <span className="option-cost font-bold">₹35.00</span>
                </div>
              </label>
            </div>
            <div className="fulfillment-summary-info">
              <span>Delivery Details: {getETA()}</span>
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
            {/* Promo Codes */}
            <div className="checkout-card promo-card-box">
              <div className="card-header-icon">
                <h3>Promo Code</h3>
              </div>
              <div className="promo-input-row">
                <input 
                  type="text" 
                  placeholder="e.g. WELCOME10" 
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                />
                <button onClick={handleApplyCoupon}>Apply</button>
              </div>
              {couponError && <p className="promo-error">{couponError}</p>}
              {couponSuccess && <p className="promo-success">{couponSuccess}</p>}
            </div>

            {/* Bill Summary */}
            <div className="checkout-card bill-details-card">
              <h3>Bill Summary</h3>
              <div className="bill-item-row">
                <span>Basket Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="bill-item-row">
                <span>Delivery Charge</span>
                <span>₹{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="bill-item-row">
                <span>Taxes & GST (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="bill-item-row discount-row">
                  <span>Promo Code Discount</span>
                  <span>- ₹{discount.toFixed(2)}</span>
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
