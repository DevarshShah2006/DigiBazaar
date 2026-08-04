import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchJson } from '../../api/api'
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
const VALID_DISCOUNT_CODE = 'FRESH2024'
const DISCOUNT_RATE = 0.10
const SMALL_ORDER_THRESHOLD = 1000
const SMALL_ORDER_FEE = 49

function CartPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()
  const { items, total, updateQuantity, removeItem, addItem, clearCart } = useCart()
  const [deliveryOption, setDeliveryOption] = useState('home')
  const [address, setAddress] = useState(
    localStorage.getItem('delivery_address') || DEFAULT_ADDRESS
  )
  const [recommended, setRecommended] = useState([])
  const [discountCode, setDiscountCode] = useState('')
  const [discountApplied, setDiscountApplied] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountMessage, setDiscountMessage] = useState('')

  const itemsTotal = useMemo(() => total, [total])
  const deliveryFee = 0
  const smallOrderCharge = itemsTotal > 0 && itemsTotal < SMALL_ORDER_THRESHOLD ? SMALL_ORDER_FEE : 0
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
      setDiscountMessage('')
      return
    }
    setDiscountAmount(Math.min(itemsTotal * DISCOUNT_RATE, 250))
  }, [discountApplied, itemsTotal])

  useEffect(() => {
    fetchJson('/products/?page_size=4')
      .then(data => {
        const products = data.results || data || []
        setRecommended(products.slice(0, 4))
      })
      .catch(() => {
        setRecommended([])
      })
  }, [])

  const handleDeliveryChange = (optionId) => {
    setDeliveryOption(optionId)
  }

  const handleApplyDiscount = () => {
    const code = discountCode.trim().toUpperCase()
    if (!code) {
      setDiscountMessage('Enter a discount code')
      setDiscountApplied(false)
      return
    }

    if (code === VALID_DISCOUNT_CODE && itemsTotal > 0) {
      setDiscountApplied(true)
      setDiscountMessage('Coupon applied successfully')
      return
    }

    setDiscountApplied(false)
    setDiscountAmount(0)
    setDiscountMessage('Invalid promo code')
  }

  const handleProceed = () => {
    if (items.length === 0) return
    if (!isLoggedIn) {
      navigate('/login')
    } else {
      navigate('/checkout')
    }
  }

  const handleAddressChange = () => {
    alert('Change address feature will be added soon.')
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

              <AddressCard address={address} onChange={handleAddressChange} />
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
            setDiscountCode={setDiscountCode}
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
            <p className="cart-eyebrow">Before you go...</p>
            <h2 className="section-heading">Recommended Products</h2>
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
