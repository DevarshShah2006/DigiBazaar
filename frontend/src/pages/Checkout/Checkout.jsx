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
  const [address, setAddress] = useState(
    localStorage.getItem('digibazaar_cart_delivery_address') || localStorage.getItem('delivery_address') || '102, Patel Residency, Paldi, Ahmedabad, Gujarat - 380007'
  )
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

  // Delivery charge calculations
  const getDeliveryCharge = () => 0.00

  const getETA = () => {
    if (deliveryOption === 'pickup') return 'Ready in 10 mins'
    return 'Delivered today, 5-7 PM'
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    try {
      // Pre-check: DigiExpress + multi-store warning
      const fulfillment = deliveryOption === 'pickup' ? 'pickup' : 'digibazaar_delivery'
      if (fulfillment === 'digibazaar_delivery') {
        const shopIds = new Set(items.map(i => i.shop_id || (i.shops && i.shops[0]?.id)).filter(Boolean))
        if (shopIds.size > 1) {
          alert('DigiBazaar Express only allows items from a SINGLE store per order. Please remove multi-store items or choose pickup.')
          setLoading(false)
          return
        }
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
        lat: 23.0125,
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
          </div>

          <div className="checkout-card delivery-card clean-card">
            <div className="card-header-icon">
              <div>
                <h3>Delivery</h3>
              </div>
              <span className="delivery-badge">{deliveryOption === 'pickup' ? 'Pickup' : 'Home Delivery'}</span>
            </div>
            <div className="delivery-summary-card compact">
              <div className="delivery-summary-row">
                <span>ETA</span>
                <strong>{getETA()}</strong>
              </div>
              <div className="delivery-summary-row">
                <span>Fee</span>
                <strong>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</strong>
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
