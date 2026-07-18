import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { fetchJson } from '../../api/api'
import { useNavigate } from 'react-router-dom'
import './Cart.css'

function Cart() {
  const { items, removeItem, updateQuantity, clearCart, total, isOpen, setIsOpen } = useCart()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const handleCheckout = () => {
    setIsOpen(false)
    if (!isLoggedIn) {
      navigate('/login')
    } else {
      navigate('/checkout')
    }
  }


  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'cart-overlay--open' : ''}`} onClick={() => setIsOpen(false)} />

      <aside className={`cart-panel ${isOpen ? 'cart-panel--open' : ''}`}>
        <div className="cart-header">
          <h2 className="cart-title">Your Cart <span className="cart-count">{items.length}</span></h2>
          <button className="cart-close" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p className="cart-empty-title">Your cart is empty</p>
            <button onClick={() => { setIsOpen(false); navigate('/products') }}>
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item__info">
                    <p className="cart-item__name">{item.name}</p>
                    <p className="cart-item__price">₹{parseFloat(item.price).toFixed(2)}</p>
                    {item.shop_name && (
                      <p className="cart-item__shop">Shop: {item.shop_name}</p>
                    )}
                  </div>
                  <div className="cart-item__controls">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    <button className="cart-item__remove" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <strong>₹{total.toFixed(2)}</strong>
              </div>
              <button className="cart-checkout-btn" onClick={handleCheckout}>
                {isLoggedIn ? 'Place Order' : 'Login to Checkout'}
              </button>
              <button className="cart-clear-btn" onClick={clearCart}>Clear Cart</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

export default Cart
