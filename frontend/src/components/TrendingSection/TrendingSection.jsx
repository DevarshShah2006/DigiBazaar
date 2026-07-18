import { useEffect, useState, useRef } from 'react'
import { fetchJson } from '../../api/api'
import ProductCard from '../ProductCard/ProductCard'
import './TrendingSection.css'

function TrendingSection() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    fetchJson('/products/featured/?limit=12')
      .then(data => {
        const prods = data.results || data || []
        setProducts(prods.slice(0, 12))
        setLoading(false)
      })
      .catch(() => {
        fetchJson('/products/?limit=12').then(d => {
          setProducts((d.results || d || []).slice(0, 12))
          setLoading(false)
        })
      })
  }, [])

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' })
    }
  }

  if (loading) return (
    <section className="trending-section">
      <div className="section-header">
        <h2 className="section-title">✨ Featured Products</h2>
      </div>
      <div className="trending-skeleton">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    </section>
  )

  if (!products.length) return null

  return (
    <section className="trending-section">
      <div className="section-header">
        <div className="section-title-group">
          <h2 className="section-title">✨ Featured Products</h2>
          <p className="section-subtitle">Our curated selection of top-rated items</p>
        </div>
        <div className="scroll-btns">
          <button className="scroll-btn" onClick={() => scroll(-1)}>‹</button>
          <button className="scroll-btn" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="trending-scroll" ref={scrollRef}>
        {products.map(product => (
          <div className="trending-item" key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default TrendingSection
