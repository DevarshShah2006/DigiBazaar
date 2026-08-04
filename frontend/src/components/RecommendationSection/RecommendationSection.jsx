import { useEffect, useState } from 'react'
import { fetchJson } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import ProductCard from '../ProductCard/ProductCard'
import { withGroupedVariants } from '../../utils/productVariants'
import './RecommendationSection.css'

function RecommendationSection() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const url = user ? `/recommend/${user.id}/` : null
    const fallback = () => fetchJson('/products/?page_size=30').then(d => (d.results || d || []))

    async function load() {
      try {
        let prods = []
        if (url) {
          const data = await fetchJson(url)
          prods = Array.isArray(data) ? data : (data.results || [])
        }

        // If no personalized prods, fetch general products from DB
        if (!prods || prods.length === 0) {
          prods = await fallback()
        }

        if (!cancelled) setProducts(withGroupedVariants(prods || []).slice(0, 8))
      } catch (err) {
        if (!cancelled) {
          const prods = await fallback().catch(() => [])
          setProducts(withGroupedVariants(prods || []).slice(0, 8))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [user])

  if (loading) return (
    <section className="rec-section">
      <div className="section-header" style={{ padding: '0 24px' }}>
        <div className="section-title-group">
          <h2 className="section-title">{user ? 'Recommended for You' : 'Popular Products'}</h2>
          <p className="section-subtitle">Curated daily essentials based on your taste</p>
        </div>
        <div className="section-actions"><a href="/products?recommended=1" className="view-all">View All ▸</a></div>
      </div>
      <div className="rec-grid">
        {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton-card rec-skeleton" />)}
      </div>
    </section>
  )

  return (
    <section className="rec-section">
      <div className="section-header" style={{ padding: '0 24px' }}>
        <div className="section-title-group">
          <h2 className="section-title">
            {user ? 'Recommended for You' : '⭐ Popular Products'}
          </h2>
          <p className="section-subtitle">
            {user ? 'Curated daily essentials based on your taste' : 'Our most loved picks'}
          </p>
        </div>
        <div className="section-actions"><a href="/products?recommended=1" className="view-all">View All ▸</a></div>
      </div>

      <div className="rec-grid">
        {products && products.length > 0 ? (
          products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          Array(8).fill(0).map((_, i) => <div key={i} className="skeleton-card rec-skeleton" />)
        )}
      </div>
    </section>
  )
}

export default RecommendationSection
