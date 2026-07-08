import { useCart } from '../../context/CartContext'
import { useNavigate } from 'react-router-dom'
import './ProductCard.css'

const PLACEHOLDER_COLORS = [
  '#f3f9f3','#fdf5f3','#f2f7fd','#fcf4ec','#fcf3f6','#fdfaf0'
]

function ProductCard({ product, showAddToCart = true }) {
  const { addItem } = useCart()
  const navigate = useNavigate()

  const colorIndex = product.id % PLACEHOLDER_COLORS.length
  const bgColor = PLACEHOLDER_COLORS[colorIndex]

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(product)
  }

  return (
    <div className="product-card" onClick={() => navigate(`/products/${product.id}`)}>
      <div className="product-card__image-wrap" style={{ background: bgColor }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-card__image"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <span className="product-card__emoji">🛒</span>
        )}
        {product.rating >= 4.5 && (
          <span className="product-card__badge">⭐ Top Rated</span>
        )}
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        {product.brand && (
          <p className="product-card__brand">Local Farmers</p> /* Hardcoding to match the screenshot vibe */
        )}
        <div className="product-card__footer">
          <div className="product-card__price-box">
            <span className="product-card__price">₹{parseFloat(product.price).toFixed(2)}</span>
            <span className="product-card__unit">/ per kg</span>
          </div>
          {showAddToCart && (
            <button className="product-card__add-btn" onClick={handleAdd}>
              + Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard
