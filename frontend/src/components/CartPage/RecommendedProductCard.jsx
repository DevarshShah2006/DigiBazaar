import { useCart } from '../../context/CartContext'
import './CartPageShared.css'

function RecommendedProductCard({ product }) {
  const { addItem } = useCart()

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(product)
  }

  return (
    <div className="recommended-card">
      <div className="recommended-card__media">
        <img
          src={product.image_url || '/placeholder-product.svg'}
          alt={product.name}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-product.svg' }}
        />
      </div>
      <div className="recommended-card__body">
        <p className="recommended-card__title">{product.name}</p>
        <p className="recommended-card__price">₹{parseFloat(product.price).toFixed(2)}</p>
        <button className="recommended-card__add" onClick={handleAdd}>+ Add</button>
      </div>
    </div>
  )
}

export default RecommendedProductCard
