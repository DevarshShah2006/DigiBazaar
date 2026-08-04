import './CartPageShared.css'

function QuantitySelector({ quantity, onDecrease, onIncrease }) {
  return (
    <div className="quantity-selector">
      <button className="quantity-selector__button" onClick={onDecrease} disabled={quantity <= 1}>−</button>
      <span className="quantity-selector__value">{quantity}</span>
      <button className="quantity-selector__button" onClick={onIncrease}>+</button>
    </div>
  )
}

export default QuantitySelector
