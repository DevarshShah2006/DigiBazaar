import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiFetch, TTL } from '../../api/api'
import ProductCard from '../ProductCard/ProductCard'
import { withGroupedVariants } from '../../utils/productVariants'
import './RecommendationSection.css'

function RecommendationSection() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Fetch products from the instant food category (request limit=20 to ensure we have enough unique products after grouping variants)
        const data = await apiFetch('/categories/instant-food/products/?limit=20', {}, TTL.NORMAL)
        const prods = Array.isArray(data) ? data : (data.results || data || [])
        
        if (!cancelled) setProducts(withGroupedVariants(prods || []).slice(0, 8))
      } catch (err) {
        if (!cancelled) {
          // Fallback to recommended products API
          const fallbackData = await apiFetch('/products/recommended/?limit=8', {}, TTL.SHORT).catch(() => [])
          const prods = (fallbackData.results || fallbackData || [])
          setProducts(withGroupedVariants(prods || []).slice(0, 8))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <section className="rec-section">
      <div className="section-header" style={{ padding: '0 24px' }}>
        <div className="section-title-group">
          <h2 className="section-title">{user ? 'Recommended for You' : 'Popular Products'}</h2>
          <p className="section-subtitle">Quick and delicious instant foods based on your taste</p>
        </div>
        <div className="section-actions"><a href="/products?category=instant-food" className="view-all">View All ▸</a></div>
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
            {user ? 'Quick and delicious instant foods based on your taste' : 'Quick and delicious instant foods'}
          </p>
        </div>
        <div className="section-actions"><a href="/products?category=instant-food" className="view-all">View All ▸</a></div>
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
