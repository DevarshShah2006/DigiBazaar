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

  const hasDiscount = product.mrp && parseFloat(product.mrp) > parseFloat(product.price)
  const discountPercent = product.discount_percent || 
    (hasDiscount ? ((parseFloat(product.mrp) - parseFloat(product.price)) / parseFloat(product.mrp)) * 100 : 0)

  return (
    <div className="product-card" onClick={() => navigate(`/products/${product.id}`)}>
      <div className="product-card__image-wrap" style={{ background: bgColor, position: 'relative' }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-card__image"
            onError={e => { 
              e.target.onerror = null; 
              e.target.src = '/placeholder-product.svg'; 
            }}
          />
        ) : (
          <img
            src="/placeholder-product.svg"
            alt="Placeholder"
            className="product-card__image"
          />
        )}
        
        {discountPercent > 0 && (
          <span className="product-card__discount-badge" style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: '#ff4d4f',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            zIndex: 1
          }}>
            {Math.round(discountPercent)}% OFF
          </span>
        )}

        {product.rating !== null && product.rating !== undefined ? (
          parseFloat(product.rating) >= 4.5 && (
            <span className="product-card__badge">Top Rated</span>
          )
        ) : (
          <span className="product-card__badge" style={{ background: '#10b981', color: 'white' }}>New</span>
        )}
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__brand">{product.brand || 'Local Brand'}</p>
        
        <div className="product-card__footer">
          <div className="product-card__price-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="product-card__price">₹{parseFloat(product.price).toFixed(2)}</span>
              {hasDiscount && (
                <span className="product-card__mrp" style={{ textDecoration: 'line-through', color: '#888', fontSize: '0.75rem' }}>
                  ₹{parseFloat(product.mrp).toFixed(2)}
                </span>
              )}
            </div>
            <span className="product-card__unit" style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
              / {product.quantity_label || '1 unit'}
            </span>
          </div>
          {showAddToCart && (
            <button className="product-card__add-btn" onClick={handleAdd}>
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard
