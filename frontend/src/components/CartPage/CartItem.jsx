import QuantitySelector from './QuantitySelector'
import './CartPageShared.css'

function CartItem({ item, onQuantityChange, onRemove }) {
  const subtotal = parseFloat(item.price || 0) * item.quantity
  return (
    <div className="cart-item-card">
      <div className="cart-item-card__media">
        <img
          src={item.image_url || '/placeholder-product.svg'}
          alt={item.name}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-product.svg' }}
        />
      </div>
      <div className="cart-item-card__body">
        <div className="cart-item-card__top">
          <div>
            <p className="cart-item-card__title">{item.name}</p>
            <p className="cart-item-card__vendor">{item.shop_name || item.brand || 'Local Partner'}</p>
          </div>
          <p className="cart-item-card__price">₹{parseFloat(item.price).toFixed(2)}</p>
        </div>

        <div className="cart-item-card__meta">
          <QuantitySelector
            quantity={item.quantity}
            onDecrease={() => onQuantityChange(item.quantity - 1)}
            onIncrease={() => onQuantityChange(item.quantity + 1)}
          />
          <button className="cart-item-card__remove" onClick={onRemove}>Delete</button>
        </div>

        <div className="cart-item-card__bottom">
          <span>Subtotal</span>
          <strong>₹{subtotal.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  )
}

export default CartItem
