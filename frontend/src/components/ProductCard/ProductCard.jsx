import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { getQuantityText } from '../../utils/productVariants'
import './ProductCard.css'

const PLACEHOLDER_COLORS = [
  '#f3f9f3', '#fdf5f3', '#f2f7fd', '#fcf4ec', '#fcf3f6', '#fdfaf0',
]

function ProductCard({ product, showAddToCart = true }) {
  const { items, addItem, updateQuantity } = useCart()
  const navigate = useNavigate()
  const variants = useMemo(() => product.variants?.length ? product.variants : [product], [product])
  const [selectedId, setSelectedId] = useState(variants[0]?.id)
  const [imageFailed, setImageFailed] = useState(false)
  const selectedProduct = variants.find(item => String(item.id) === String(selectedId)) || variants[0] || product
  const cartItem = items.find(item => String(item.id) === String(selectedProduct?.id))
  const cartQuantity = cartItem?.quantity || 0

  // Product data can contain an expired or placeholder image URL.  Do not
  // remove the entire card when that image fails: every home-page collection
  // uses this component, so a failed image would otherwise make the whole
  // collection appear empty.
  if (!selectedProduct) return null

  const colorIndex = selectedProduct.id % PLACEHOLDER_COLORS.length
  const bgColor = PLACEHOLDER_COLORS[colorIndex]
  const hasDiscount = selectedProduct.mrp && parseFloat(selectedProduct.mrp) > parseFloat(selectedProduct.price)
  const discountPercent = selectedProduct.discount_percent ||
    (hasDiscount ? ((parseFloat(selectedProduct.mrp) - parseFloat(selectedProduct.price)) / parseFloat(selectedProduct.mrp)) * 100 : 0)

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(selectedProduct)
  }

  const changeQuantity = (e, quantity) => {
    e.stopPropagation()
    updateQuantity(selectedProduct.id, quantity)
  }

  const handleVariantChange = (e) => {
    e.stopPropagation()
    setImageFailed(false)
    setSelectedId(e.target.value)
  }

  return (
    <div className="product-card" onClick={() => navigate(`/products/${selectedProduct.id}`)}>
      <div className="product-card__image-wrap" style={{ background: bgColor }}>
        {!imageFailed && selectedProduct.image_url ? (
          <img
            src={selectedProduct.image_url}
            alt={selectedProduct.name}
            className="product-card__image"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="product-card__image-fallback" aria-hidden="true">
            {selectedProduct.name?.trim().charAt(0).toUpperCase() || 'P'}
          </span>
        )}

        {discountPercent > 0 && (
          <span className="product-card__discount-badge">
            {Math.round(discountPercent)}% OFF
          </span>
        )}

        {selectedProduct.rating !== null && selectedProduct.rating !== undefined ? (
          parseFloat(selectedProduct.rating) >= 4.5 && (
            <span className="product-card__badge">Top Rated</span>
          )
        ) : (
          <span className="product-card__badge product-card__badge--new">New</span>
        )}
      </div>

      <div className="product-card__body">
        <h3 className="product-card__name">{product.display_name || selectedProduct.name}</h3>
        <p className="product-card__brand">{selectedProduct.brand || 'Local Brand'}</p>

        {variants.length > 1 ? (
          <select
            className="product-card__variant-select"
            value={selectedProduct.id}
            onClick={e => e.stopPropagation()}
            onChange={handleVariantChange}
          >
            {variants.map(variant => (
              <option key={variant.id} value={variant.id}>
                {variant.variant_label || getQuantityText(variant)}
              </option>
            ))}
          </select>
        ) : (
          <span className="product-card__single-unit">{getQuantityText(selectedProduct)}</span>
        )}

        <div className="product-card__footer">
          <div className="product-card__price-box">
            <div className="product-card__price-row">
              <span className="product-card__price">₹{parseFloat(selectedProduct.price).toFixed(2)}</span>
              {hasDiscount && (
                <span className="product-card__mrp">
                  ₹{parseFloat(selectedProduct.mrp).toFixed(2)}
                </span>
              )}
            </div>
            <span className="product-card__unit">/ {getQuantityText(selectedProduct)}</span>
          </div>

          {showAddToCart && (cartQuantity > 0 ? (
            <div className="product-card__quantity-control" onClick={e => e.stopPropagation()}>
              <button onClick={e => changeQuantity(e, cartQuantity - 1)} aria-label="Decrease quantity">−</button>
              <span>Added · {cartQuantity}</span>
              <button onClick={e => changeQuantity(e, cartQuantity + 1)} aria-label="Increase quantity">+</button>
            </div>
          ) : (
            <button className="product-card__add-btn" onClick={handleAdd}>
              + Add
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProductCard
