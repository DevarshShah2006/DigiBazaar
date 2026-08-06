import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, fetchJson, TTL } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import AddressCard from '../../components/CartPage/AddressCard'
import CartItem from '../../components/CartPage/CartItem'
import DeliveryOption from '../../components/CartPage/DeliveryOption'
import OrderSummary from '../../components/CartPage/OrderSummary'
import RecommendedProductCard from '../../components/CartPage/RecommendedProductCard'
import './CartPage.css'

const DELIVERY_OPTIONS = [
  { id: 'home', title: 'Home Delivery', subtitle: 'Today, 5-7 PM', label: 'FREE' },
  { id: 'pickup', title: 'Pickup', subtitle: 'Ready in 20m', label: 'FREE' }
]

const DEFAULT_ADDRESS = '42 Oak Valley, Apt 12B, Central Square'
const PROMO_CODES = {
  WELCOME50: { discountPercent: 50, firstOrderOnly: true },
  SAVE20: { discountPercent: 20 },
  FLAT10: { discountPercent: 10 }
}
const SMALL_ORDER_THRESHOLD = 100
const SMALL_ORDER_FEE = 49

function CartPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()
  const { items, total, updateQuantity, removeItem, addItem, clearCart } = useCart()
  const [deliveryOption, setDeliveryOption] = useState(
    localStorage.getItem('digibazaar_cart_delivery_option') || 'home'
  )
  const [address, setAddress] = useState(
    localStorage.getItem('digibazaar_cart_delivery_address') || localStorage.getItem('delivery_address') || DEFAULT_ADDRESS
  )
  const [coordinates, setCoordinates] = useState(
    localStorage.getItem('delivery_coordinates') && localStorage.getItem('delivery_coordinates') !== 'null'
      ? localStorage.getItem('delivery_coordinates')
      : null
  )
  const [savedAddresses, setSavedAddresses] = useState([
    localStorage.getItem('digibazaar_cart_delivery_address') || localStorage.getItem('delivery_address') || DEFAULT_ADDRESS,
    'NID Campus Hostel Block B, Paldi, Ahmedabad - 380007'
  ])
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [detectingAddress, setDetectingAddress] = useState(false)
  const [newAddressText, setNewAddressText] = useState('')
  const [showAddressInput, setShowAddressInput] = useState(false)
  const [recommended, setRecommended] = useState([])
  const [discountCode, setDiscountCode] = useState(
    localStorage.getItem('digibazaar_cart_discount_code') || ''
  )
  const [discountApplied, setDiscountApplied] = useState(
    localStorage.getItem('digibazaar_cart_discount_applied') === 'true'
  )
  const [discountAmount, setDiscountAmount] = useState(
    parseFloat(localStorage.getItem('digibazaar_cart_discount_amount') || '0') || 0
  )
  const [discountMessage, setDiscountMessage] = useState('')
  const [hasPreviousOrders, setHasPreviousOrders] = useState(null)

  const itemsTotal = useMemo(() => total, [total])
  const deliveryFee = 0
  const smallOrderCharge = deliveryOption === 'home' && itemsTotal > 0 && itemsTotal < SMALL_ORDER_THRESHOLD
    ? SMALL_ORDER_FEE
    : 0
  const totalPayable = Math.max(itemsTotal + deliveryFee + smallOrderCharge - discountAmount, 0)

  useEffect(() => {
    const syncAddress = () => {
      setAddress(localStorage.getItem('delivery_address') || DEFAULT_ADDRESS)
    }

    window.addEventListener('addressUpdated', syncAddress)
    return () => window.removeEventListener('addressUpdated', syncAddress)
  }, [])

  useEffect(() => {
    if (!discountApplied) {
      setDiscountAmount(0)
      return
    }
    const promo = PROMO_CODES[discountCode.trim().toUpperCase()]
    if (!promo) {
      setDiscountApplied(false)
      setDiscountAmount(0)
      return
    }
    setDiscountAmount(itemsTotal * (promo.discountPercent / 100))
  }, [discountApplied, discountCode, itemsTotal])

  useEffect(() => {
    if (!isLoggedIn) {
      setHasPreviousOrders(false)
      return
    }

    fetchJson('/orders/my-orders/')
      .then(data => {
        const orders = Array.isArray(data) ? data : (data?.results || [])
        setHasPreviousOrders(orders.length > 0)
      })
      .catch(() => setHasPreviousOrders(false))
  }, [isLoggedIn])

  useEffect(() => {
    localStorage.setItem('digibazaar_cart_delivery_option', deliveryOption)
  }, [deliveryOption])

  useEffect(() => {
    localStorage.setItem('digibazaar_cart_discount_code', discountCode)
    localStorage.setItem('digibazaar_cart_discount_applied', discountApplied ? 'true' : 'false')
    localStorage.setItem('digibazaar_cart_discount_amount', discountAmount.toFixed(2))
  }, [discountCode, discountApplied, discountAmount])

  useEffect(() => {
    apiFetch('/products/recommended/?limit=4', {}, TTL.NORMAL)
      .then(data => {
        const products = data || []
        setRecommended(products.slice(0, 4))
      })
      .catch(() => {
        setRecommended([])
      })
  }, [])

  const handleDeliveryChange = (optionId) => {
    setDeliveryOption(optionId)
  }

  const handleApplyDiscount = async () => {
    const code = discountCode.trim().toUpperCase()
    if (!code) {
      setDiscountMessage('Enter a discount code')
      setDiscountApplied(false)
      return
    }

    const promo = PROMO_CODES[code]
    if (!promo) {
      setDiscountApplied(false)
      setDiscountAmount(0)
      setDiscountMessage('Invalid promo code')
      return
    }

    if (itemsTotal <= 0) {
      setDiscountApplied(false)
      setDiscountAmount(0)
      setDiscountMessage('Add items to your cart before applying a promo code')
      return
    }

    let userHasPreviousOrders = hasPreviousOrders
    if (promo.firstOrderOnly && isLoggedIn && userHasPreviousOrders === null) {
      const data = await fetchJson('/orders/my-orders/')
      const orders = Array.isArray(data) ? data : (data?.results || [])
      userHasPreviousOrders = orders.length > 0
      setHasPreviousOrders(userHasPreviousOrders)
    }

    if (promo.firstOrderOnly && userHasPreviousOrders) {
      setDiscountApplied(false)
      setDiscountAmount(0)
      setDiscountMessage('This promo code is only valid for first-time users.')
      return
    }

    setDiscountCode(code)
    setDiscountApplied(true)
    setDiscountAmount(itemsTotal * (promo.discountPercent / 100))
    setDiscountMessage(`${code} applied: ${promo.discountPercent}% off`)
  }

  const handleDiscountCodeChange = (value) => {
    setDiscountCode(value)
    setDiscountApplied(false)
    setDiscountAmount(0)
    setDiscountMessage('')
  }

  const setCartAddress = (newAddress, coords = null) => {
    setAddress(newAddress)
    localStorage.setItem('digibazaar_cart_delivery_address', newAddress)
    localStorage.setItem('delivery_address', newAddress)
    if (coords) {
      setCoordinates(coords)
      localStorage.setItem('delivery_coordinates', coords)
    } else {
      setCoordinates(null)
      localStorage.removeItem('delivery_coordinates')
    }
    window.dispatchEvent(new Event('addressUpdated'))
  }

  const handleSelectAddress = (addr) => {
    setCartAddress(addr)
    setCoordinates(null)
    localStorage.removeItem('delivery_coordinates')
    setShowAddressInput(false)
    setAddressPickerOpen(false)
    if (!savedAddresses.includes(addr)) {
      const updatedAddresses = [...savedAddresses, addr]
      setSavedAddresses(updatedAddresses)
      localStorage.setItem('saved_addresses', JSON.stringify(updatedAddresses))
    }
  }

  const handleAddNewAddress = () => {
    const trimmed = newAddressText.trim()
    if (!trimmed) {
      setDiscountMessage('Please enter a delivery address to save.')
      return
    }
    setCartAddress(trimmed)
    const updatedAddresses = savedAddresses.includes(trimmed)
      ? savedAddresses
      : [...savedAddresses, trimmed]
    setSavedAddresses(updatedAddresses)
    localStorage.setItem('saved_addresses', JSON.stringify(updatedAddresses))
    setNewAddressText('')
    setShowAddressInput(false)
    setAddressPickerOpen(false)
  }

  const handleDetectLocation = () => {
    setDetectingAddress(true)
    setShowAddressInput(false)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6)
          const lng = position.coords.longitude.toFixed(6)
          const coords = `${lat}, ${lng}`
          setCoordinates(coords)
          localStorage.setItem('delivery_coordinates', coords)
          setDetectingAddress(false)
          setShowAddressInput(true)
          setDiscountMessage('')
        },
        (error) => {
          console.error('Geolocation error:', error)
          const fallback = '7B, Paldi Cross Roads, Ahmedabad, Gujarat - 380007'
          setCartAddress(fallback)
          setCoordinates(null)
          localStorage.removeItem('delivery_coordinates')
          setDetectingAddress(false)
          setShowAddressInput(false)
          setDiscountMessage('')
          alert('Unable to detect location. Please enter address manually.')
        }
      )
    } else {
      const fallback = '7B, Paldi Cross Roads, Ahmedabad, Gujarat - 380007'
      setCartAddress(fallback)
      setCoordinates(null)
      localStorage.removeItem('delivery_coordinates')
      setDetectingAddress(false)
      setShowAddressInput(false)
      setDiscountMessage('')
      alert('Geolocation not supported. Please enter address manually.')
    }
  }

  const handleAddressChange = () => {
    setAddressPickerOpen(prev => !prev)
    setShowAddressInput(false)
    setNewAddressText('')
  }

  const handleSaveAddressWithCoordinates = () => {
    const trimmed = newAddressText.trim()
    if (!trimmed) {
      setDiscountMessage('Please enter a delivery address to save.')
      return
    }
    setCartAddress(trimmed, coordinates)
    const updatedAddresses = savedAddresses.includes(trimmed)
      ? savedAddresses
      : [...savedAddresses, trimmed]
    setSavedAddresses(updatedAddresses)
    localStorage.setItem('saved_addresses', JSON.stringify(updatedAddresses))
    setNewAddressText('')
    setShowAddressInput(false)
    setAddressPickerOpen(false)
  }

  const handleProceed = () => {
    if (items.length === 0) return
    if (discountApplied && discountCode.trim().toUpperCase() === 'WELCOME50' && hasPreviousOrders) {
      setDiscountApplied(false)
      setDiscountAmount(0)
      setDiscountMessage('This promo code is only valid for first-time users.')
      return
    }
    if (!isLoggedIn) {
      navigate('/login')
    } else {
      navigate('/checkout')
    }
  }

  return (
    <div className="cart-page">
      <div className="cart-page__layout container">
        <div className="cart-page__main">
          <section className="cart-section cart-section--review">
            <div className="cart-section__header">
              <div>
                <p className="cart-eyebrow">Review Your Cart</p>
                <h1 className="cart-heading">You have {items.reduce((sum, item) => sum + item.quantity, 0)} items from {new Set(items.map(item => item.shop_name || 'local partner')).size} organic partners.</h1>
              </div>
              {items.length > 0 && (
                <button className="cart-clear-link" onClick={clearCart}>Clear Cart</button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="cart-empty-state">
                <p>Your cart is currently empty.</p>
                <button className="cart-empty-action" onClick={() => navigate('/')}>Continue Shopping</button>
              </div>
            ) : (
              <div className="cart-items-list">
                {items.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onQuantityChange={(quantity) => updateQuantity(item.id, quantity)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            )}

            <section className="cart-section cart-section--delivery">
              <div className="cart-section__header">
                <div>
                  <p className="cart-eyebrow">Delivery Method</p>
                  <h2 className="section-heading">Choose one delivery option</h2>
                </div>
              </div>
              <div className="delivery-options">
                {DELIVERY_OPTIONS.map(option => (
                  <DeliveryOption
                    key={option.id}
                    option={option}
                    selected={deliveryOption === option.id}
                    onSelect={() => handleDeliveryChange(option.id)}
                  />
                ))}
              </div>

              <AddressCard address={address} coordinates={coordinates} onChange={handleAddressChange} />
              {addressPickerOpen && (
                <div className="address-picker-panel cart-address-picker">
                  <button
                    className="detect-location-btn"
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingAddress}
                    style={{ marginBottom: '12px' }}
                  >
                    {detectingAddress ? 'Detecting Location…' : 'Detect Current Location'}
                  </button>
                  
                  {showAddressInput && coordinates && (
                    <>
                      <div style={{ marginBottom: '12px', padding: '10px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#0369a1', fontWeight: '600' }}>
                          Coordinates Captured: <strong>{coordinates}</strong>
                        </p>
                        <p style={{ margin: '0', fontSize: '12px', color: '#0891b2' }}>
                          Please enter your address below:
                        </p>
                      </div>
                      <div className="add-new-address-form">
                        <input
                          type="text"
                          placeholder="Enter your full address..."
                          value={newAddressText}
                          onChange={(e) => setNewAddressText(e.target.value)}
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button onClick={handleSaveAddressWithCoordinates} style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>
                            Save Address
                          </button>
                          <button onClick={() => { setShowAddressInput(false); setNewAddressText(''); }} style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {!showAddressInput && (
                    <>
                      <div className="saved-addresses-list">
                        {savedAddresses.map((addr, idx) => (
                          <label key={idx} className="address-label-card">
                            <input
                              type="radio"
                              name="cart_address_choice"
                              checked={address === addr}
                              onChange={() => handleSelectAddress(addr)}
                            />
                            <span>{addr}</span>
                          </label>
                        ))}
                      </div>
                      <div className="add-new-address-form">
                        <input
                          type="text"
                          placeholder="Enter new delivery address"
                          value={newAddressText}
                          onChange={(e) => setNewAddressText(e.target.value)}
                        />
                        <button onClick={handleAddNewAddress}>Save Address</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </section>
        </div>

        <aside className="cart-page__sidebar">
          <OrderSummary
            itemsTotal={itemsTotal}
            deliveryFee={deliveryFee}
            smallOrderCharge={smallOrderCharge}
            discountAmount={discountAmount}
            totalPayable={totalPayable}
            discountCode={discountCode}
            setDiscountCode={handleDiscountCodeChange}
            onApplyDiscount={handleApplyDiscount}
            discountApplied={discountApplied}
            discountMessage={discountMessage}
            onProceed={handleProceed}
            disabled={items.length === 0}
          />
        </aside>
      </div>

      <section className="recommended-section container">
        <div className="recommended-header">
          <div>
            <p className="cart-eyebrow">🍿 Quick Add Munchies & Dairy</p>
            <h2 className="section-heading">Recommended Munchies, Snacks & Dairy</h2>
          </div>
        </div>
        <div className="recommended-grid">
          {recommended.map(product => (
            <RecommendedProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default CartPage
