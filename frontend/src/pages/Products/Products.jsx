import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchJson } from '../../api/api'
import ProductCard from '../../components/ProductCard/ProductCard'
import './Products.css'

function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')

  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (q) params.q = q
    if (category) params.category = category
    const qs = new URLSearchParams(params).toString()
    fetchJson(`/products/search/?${qs}`)
      .then(data => {
        setProducts(Array.isArray(data) ? data : (data.results || []))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [q, category])

  const handleSearch = (e) => {
    e.preventDefault()
    const next = {}
    if (searchInput.trim()) next.q = searchInput.trim()
    if (category) next.category = category
    setSearchParams(next)
  }

  return (
    <div className="products-page">
      <div className="products-header">
        <div className="container">
          <h1 className="products-title">
            {q ? `Results for "${q}"` : category ? `Category: ${category}` : 'All Products'}
          </h1>
          <form className="products-search" onSubmit={handleSearch}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products…"
              className="products-search-input"
            />
            <button type="submit" className="products-search-btn">Search</button>
          </form>
        </div>
      </div>

      <div className="container">
        {loading ? (
          <div className="products-grid">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: 300 }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            <p>😕 No products found.</p>
            <button onClick={() => setSearchParams({})}>Clear filters</button>
          </div>
        ) : (
          <>
            <p className="products-count">{products.length} products found</p>
            <div className="products-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Products
