import { useEffect, useState } from 'react'
import { fetchJson } from '../../api/api'
import './NearbyShops.css'

function NearbyShops() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)

  const parseDistance = value => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const match = value.match(/\d+(\.\d+)?/)
      return match ? parseFloat(match[0]) : null
    }
    return null
  }

  const within3km = shop => {
    const distanceValue = parseDistance(shop?.distance || shop?.distance_km)
    return distanceValue === null ? false : distanceValue <= 3
  }

  useEffect(() => {
    fetchJson('/shops/')
      .then(data => {
        const items = Array.isArray(data) ? data : (data.results || data || [])
        const nearby = items.filter(within3km).slice(0, 2)
        setShops(nearby)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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
          const ratingDisplay = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '0.0'
          const estTime = shop?.estimated_time || '25 mins'
          const distanceValue = parseDistance(shop?.distance || shop?.distance_km)
          const distanceLabel = distanceValue !== null ? `${distanceValue.toFixed(1)} km` : (shop?.distance || '2.4 km')
          const previewProducts = Array.isArray(shop?.product_details) ? shop.product_details.slice(0, 3) : []
          const nextDelivery = shop?.next_delivery || 'Today, 2PM'
          const badge = shop?.badge || (shop?.is_best_seller ? 'Bestseller' : null)

          return (
            <div key={shop.id} className="shop-card">
              <div className="shop-card__left">
                <div className="shop-card__header">
                  <div>
                    <h3>{shop.name}</h3>
                    <div className="shop-card__meta">
                      <span className="shop-rating">{ratingDisplay} ★</span>
                      <span>{estTime}</span>
                      <span>{distanceLabel}</span>
                    </div>
                  </div>
                  {badge && <span className="shop-badge">{badge}</span>}
                </div>

                <div className="shop-gallery">
                  {previewProducts.length > 0 ? previewProducts.map((product, idx) => (
                    <img
                      key={idx}
                      src={product.image_url || '/placeholder-product.svg'}
                      alt={product.name || `product-${idx}`}
                    />
                  )) : (
                    <div className="shop-gallery__empty">No preview available</div>
                  )}
                </div>
              </div>

              <div className="shop-card__right">
                <div className="next-delivery">
                  <span>NEXT DELIVERY</span>
                  <strong>{nextDelivery}</strong>
                </div>
                <button
                  type="button"
                  className="enter-store-btn"
                  onClick={() => alert('This feature is for a future version.')}
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
