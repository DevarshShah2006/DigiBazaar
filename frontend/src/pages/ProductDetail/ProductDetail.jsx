import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchJson } from '../../api/api'
import { useCart } from '../../context/CartContext'
import './ProductDetail.css'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchJson(`/products/detail/${id}/`),
      fetchJson(`/products/${id}/shops/`),
    ]).then(([prod, rankedShops]) => {
      setProduct(prod)
      setShops(rankedShops.results || rankedShops || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])


  if (loading) return (
    <div className="product-detail container">
      <div className="pd-skeleton" />
    </div>
  )

  if (!product) return (
    <div className="product-detail container">
      <p>Product not found.</p>
      <button onClick={() => navigate('/products')}>← Back to Products</button>
    </div>
  )

  return (
    <div className="product-detail">
      <div className="container">
        <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>

        <div className="pd-main">
          <div className="pd-image-wrap">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="pd-image" />
            ) : (
              <div className="pd-image-placeholder">🛒</div>
            )}
          </div>

          <div className="pd-info">
            {product.category_name && (
              <span className="pd-category">{product.category_name}</span>
            )}
            <h1 className="pd-name">{product.name}</h1>
            {product.brand && <p className="pd-brand">by {product.brand}</p>}

            <div className="pd-price-row">
              <span className="pd-price">₹{parseFloat(product.price).toFixed(2)}</span>
              {product.rating > 0 && (
                <span className="pd-rating">⭐ {parseFloat(product.rating).toFixed(1)}</span>
              )}
            </div>

            {product.description && (
              <p className="pd-description">{product.description}</p>
            )}

            <div className="pd-meta">
              {product.shelf_life && <span className="pd-tag">🕒 Shelf life: {product.shelf_life}</span>}
              {product.warranty && <span className="pd-tag">🛡️ Warranty: {product.warranty}</span>}
              {product.guarantee && <span className="pd-tag">✅ Guarantee: {product.guarantee}</span>}
            </div>

            <button className="pd-add-btn" onClick={() => addItem(product)}>
              🛒 Add to Cart
            </button>
          </div>
        </div>

        {/* Ranked Shops */}
        {shops.length > 0 && (
          <section className="pd-shops">
            <h2 className="pd-shops-title">🏪 Available at these Shops</h2>
            <p className="pd-shops-sub">Ranked by distance, rating & price</p>
            <div className="pd-shops-grid">
              {shops.slice(0, 6).map((shop, i) => (
                <div className="pd-shop-card" key={shop.id}>
                  <div className="pd-shop-rank">#{i + 1}</div>
                  <div className="pd-shop-info">
                    <h4>{shop.name}</h4>
                    <p>{shop.address}</p>
                    <div className="pd-shop-meta">
                      <span>⭐ {parseFloat(shop.rating).toFixed(1)}</span>
                      {shop.tier === 'premium' && <span className="pd-shop-premium">👑 Premium</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default ProductDetail
