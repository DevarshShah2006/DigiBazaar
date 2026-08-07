import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, TTL } from '../../api/api'
import './NearbyShops.css'

function NearbyShops() {
  const navigate = useNavigate()
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadShopsAndPreviews() {
      try {
        const data = await apiFetch('/shops/', {}, TTL.STATIC)
        const items = Array.isArray(data) ? data : (data.results || data || [])
        const targetShops = items.slice(0, 4)

        // Fetch top 3 preview products for each shop dynamically in parallel
        const shopsWithPreviews = await Promise.all(
          targetShops.map(async (shop) => {
            try {
              const res = await apiFetch(`/products/?shop_id=${shop.id}&page_size=3`, {}, TTL.SHORT)
              const products = Array.isArray(res) ? res : (res?.results || [])
              return { ...shop, previewProducts: products.slice(0, 3) }
            } catch {
              return { ...shop, previewProducts: [] }
            }
          })
        )

        if (isMounted) {
          setShops(shopsWithPreviews)
        }
      } catch {
        if (isMounted) setShops([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadShopsAndPreviews()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) return (
    <section className="nearby-shops">
      <div className="nearby-header">
        <h2>Shops Near You</h2>
      </div>
      <div className="nearby-grid">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="shop-skel" />
        ))}
      </div>
    </section>
  )

  if (!shops.length) return null

  return (
    <section className="nearby-shops">
      <div className="nearby-header">
        <h2>Shops Near You</h2>
      </div>

      <div className="nearby-grid">
        {shops.map(shop => {
          const ratingNum = Number((shop && shop.rating) || 0)
          const ratingDisplay = Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : '4.5'
          const previewProducts = Array.isArray(shop?.previewProducts) ? shop.previewProducts : []
          const badge = shop?.badge || (shop?.is_best_seller ? 'Bestseller' : null)

          return (
            <div key={shop.id} className="shop-card">
              <div className="shop-card__left">
                <div className="shop-card__header">
                  <div>
                    <h3>{shop.name}</h3>
                    <div className="shop-card__meta">
                      <span className="shop-rating">{ratingDisplay} ★</span>
                      {shop.category_details?.[0]?.name && (
                        <span className="shop-category-tag">{shop.category_details[0].name}</span>
                      )}
                    </div>
                  </div>
                  {badge && <span className="shop-badge">{badge}</span>}
                </div>

                <div className="shop-gallery">
                  {[0, 1, 2].map((idx) => {
                    const product = previewProducts[idx]
                    if (product && product.image_url) {
                      return (
                        <div key={product.id || idx} className="shop-gallery__item" title={product.name}>
                          <img
                            src={product.image_url}
                            alt={product.name}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextSibling.style.display = 'flex'
                            }}
                          />
                          <div className="shop-gallery__fallback" style={{ display: 'none' }}>
                            {product.name?.charAt(0) || 'P'}
                          </div>
                        </div>
                      )
                    }
                    if (product) {
                      return (
                        <div key={product.id || idx} className="shop-gallery__item shop-gallery__fallback" title={product.name}>
                          {product.name?.charAt(0) || 'P'}
                        </div>
                      )
                    }
                    return (
                      <div key={idx} className="shop-gallery__item shop-gallery__empty-slot">
                        <span style={{ fontSize: '11px', color: '#999' }}>Stocking</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="shop-card__right">
                <button
                  type="button"
                  className="enter-store-btn"
                  onClick={() => navigate(`/shops/${shop.id}`)}
                >
                  Enter Store
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default NearbyShops
