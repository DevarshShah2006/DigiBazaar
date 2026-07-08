import { useEffect, useState } from 'react'
import { fetchJson } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import ProductCard from '../ProductCard/ProductCard'
import './RecommendationSection.css'

function RecommendationSection() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = user ? `/recommend/${user.id}/` : null
    const fallback = () => fetchJson('/products/').then(d => (d.results || d || []).slice(0, 8))

    if (url) {
      fetchJson(url)
        .then(data => {
          const prods = Array.isArray(data) ? data : (data.results || [])
          if (prods.length > 0) {
            setProducts(prods.slice(0, 8))
          } else {
            return fallback().then(setProducts)
          }
        })
        .catch(() => fallback().then(setProducts))
        .finally(() => setLoading(false))
    } else {
      fallback().then(prods => {
        setProducts(prods)
        setLoading(false)
      })
    }
  }, [user])

  if (loading) return (
    <section className="rec-section">
      <div className="section-header">
        <h2 className="section-title">🤖 {user ? 'Recommended for You' : 'Popular Products'}</h2>
      </div>
      <div className="rec-grid">
        {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton-card rec-skeleton" />)}
      </div>
    </section>
  )

  if (!products.length) return null

  return (
    <section className="rec-section">
      <div className="section-header" style={{ padding: '0 24px' }}>
        <div className="section-title-group">
          <h2 className="section-title">
            {user ? '🤖 Recommended for You' : '⭐ Popular Products'}
          </h2>
          <p className="section-subtitle">
            {user ? 'Powered by our AI — based on your order history' : 'Our most loved picks'}
          </p>
        </div>
      </div>
      <div className="rec-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export default RecommendationSection
