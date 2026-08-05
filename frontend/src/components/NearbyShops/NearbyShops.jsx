import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, TTL } from '../../api/api'
import './NearbyShops.css'

function NearbyShops() {
  const navigate = useNavigate()
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

  const USER_LAT = 23.0125
  const USER_LONG = 72.5575

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null
    const R = 6371 // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const getShopDistance = shop => {
    const raw = parseDistance(shop?.distance || shop?.distance_km)
    if (raw !== null) return raw
    if (shop?.lat && shop?.long) {
      const computed = calculateDistance(USER_LAT, USER_LONG, parseFloat(shop.lat), parseFloat(shop.long))
      if (computed !== null && !isNaN(computed)) return computed
    }
    return 1.8
  }

  useEffect(() => {
    apiFetch('/shops/', {}, TTL.STATIC)
      .then(data => {
        const items = Array.isArray(data) ? data : (data.results || data || [])
        const withDist = items.map(shop => ({
          ...shop,
          computed_distance: getShopDistance(shop)
        }))
        const nearby = withDist.filter(s => s.computed_distance <= 10).slice(0, 4)
        setShops(nearby.length ? nearby : withDist.slice(0, 4))
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
          const distVal = shop.computed_distance !== undefined ? shop.computed_distance : getShopDistance(shop)
          const distanceLabel = distVal ? `${distVal.toFixed(1)} km` : '1.8 km'
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
