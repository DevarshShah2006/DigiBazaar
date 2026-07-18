import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchJson } from '../../api/api'
import ProductCard from '../../components/ProductCard/ProductCard'
import './Products.css'

function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // URL parameters sync
  const qParam = searchParams.get('q') || ''
  const catParam = searchParams.get('category') || ''
  const subcatParam = searchParams.get('subcategory') || ''

  // Product list & pagination states
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [nextPageUrl, setNextPageUrl] = useState(null)

  // Input states
  const [searchInput, setSearchInput] = useState(qParam)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [ordering, setOrdering] = useState('name')

  // Load categories list on mount
  useEffect(() => {
    fetchJson('/categories/')
      .then(data => {
        setCategories(data || [])
      })
      .catch(() => {})
  }, [])

  // Derive unique subcategories from the current active category
  useEffect(() => {
    if (catParam) {
      // Find selected category slug in loaded categories to get its name
      const activeCatObj = categories.find(c => c.slug === catParam || c.name === catParam)
      const catName = activeCatObj ? activeCatObj.name : catParam
      
      // Fetch products in that category to extract their subcategories
      // This ensures we always show correct subcategories
      fetchJson(`/products/?category=${encodeURIComponent(catName)}&page_size=100`)
        .then(data => {
          const prods = data.results || data || []
          const subSet = new Set()
          prods.forEach(p => {
            if (p.subcategory_name) subSet.add(p.subcategory_name)
          })
          setSubcategories(Array.from(subSet))
        })
        .catch(() => setSubcategories([]))
    } else {
      setSubcategories([])
    }
  }, [catParam, categories])

  // Reset inputs when URL params change
  useEffect(() => {
    setSearchInput(qParam)
  }, [qParam])

  // Core API query effect — runs whenever filters or sorting criteria change
  useEffect(() => {
    setLoading(true)
    
    // Construct query parameters
    const params = {}
    if (qParam) params.search = qParam
    if (catParam) params.category = catParam
    if (subcatParam) params.subcategory = subcatParam
    if (minPrice) params.min_price = minPrice
    if (maxPrice) params.max_price = maxPrice
    if (ordering) params.ordering = ordering

    const qs = new URLSearchParams(params).toString()
    
    fetchJson(`/products/?${qs}`)
      .then(data => {
        setProducts(data.results || [])
        setTotalCount(data.count || (data.results ? data.results.length : 0))
        // API returns full URL for next page (e.g. http://.../api/products/?page=2)
        // Convert to relative path
        if (data.next) {
          const urlObj = new URL(data.next)
          setNextPageUrl(urlObj.pathname + urlObj.search)
        } else {
          setNextPageUrl(null)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [qParam, catParam, subcatParam, minPrice, maxPrice, ordering])

  // Handler for primary search form
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const nextParams = {}
    if (searchInput.trim()) nextParams.q = searchInput.trim()
    if (catParam) nextParams.category = catParam
    setSearchParams(nextParams)
  }

  // Load next page and append products
  const handleLoadMore = () => {
    if (!nextPageUrl || loadingMore) return
    setLoadingMore(true)

    fetchJson(nextPageUrl)
      .then(data => {
        setProducts(prev => [...prev, ...(data.results || [])])
        if (data.next) {
          const urlObj = new URL(data.next)
          setNextPageUrl(urlObj.pathname + urlObj.search)
        } else {
          setNextPageUrl(null)
        }
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }

  // Set category filter
  const handleCategorySelect = (catSlug) => {
    const nextParams = {}
    if (qParam) nextParams.q = qParam
    if (catSlug) nextParams.category = catSlug
    setSearchParams(nextParams)
  }

  // Set subcategory filter
  const handleSubcategorySelect = (subcatName) => {
    const nextParams = {}
    if (qParam) nextParams.q = qParam
    if (catParam) nextParams.category = catParam
    if (subcatName) nextParams.subcategory = subcatName
    setSearchParams(nextParams)
  }

  // Apply price range
  const handlePriceApply = (e) => {
    e.preventDefault()
    // Triggering useEffect by updating minPrice/maxPrice states
  }

  // Clear single active filter
  const clearFilter = (key) => {
    const nextParams = { ...Object.fromEntries(searchParams.entries()) }
    if (key === 'category') {
      delete nextParams.category
      delete nextParams.subcategory
    } else if (key === 'subcategory') {
      delete nextParams.subcategory
    } else if (key === 'q') {
      delete nextParams.q
      setSearchInput('')
    } else if (key === 'price') {
      setMinPrice('')
      setMaxPrice('')
    }
    setSearchParams(nextParams)
  }

  // Reset all filters
  const resetAllFilters = () => {
    setSearchInput('')
    setMinPrice('')
    setMaxPrice('')
    setOrdering('name')
    setSearchParams({})
  }

  return (
    <div className="products-page fade-in">
      <div className="products-header">
        <div className="container">
          <h1 className="products-title">
            {catParam ? `Explore ${catParam}` : qParam ? `Search: "${qParam}"` : 'All Products'}
          </h1>
          
          <form className="products-search" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search products, brands, essentials…"
              className="products-search-input"
            />
            <button type="submit" className="products-search-btn">Search</button>
          </form>

          {/* Active filter badges */}
          {(catParam || subcatParam || qParam || minPrice || maxPrice) && (
            <div className="active-filters">
              {catParam && (
                <span className="filter-pill">
                  Category: {catParam}
                  <span className="filter-pill-clear" onClick={() => clearFilter('category')}>✕</span>
                </span>
              )}
              {subcatParam && (
                <span className="filter-pill">
                  Subcategory: {subcatParam}
                  <span className="filter-pill-clear" onClick={() => clearFilter('subcategory')}>✕</span>
                </span>
              )}
              {qParam && (
                <span className="filter-pill">
                  Keyword: {qParam}
                  <span className="filter-pill-clear" onClick={() => clearFilter('q')}>✕</span>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="filter-pill">
                  Price: ₹{minPrice || 0} - ₹{maxPrice || '∞'}
                  <span className="filter-pill-clear" onClick={() => clearFilter('price')}>✕</span>
                </span>
              )}
              <span className="filter-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }} onClick={resetAllFilters}>
                Clear All
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="container">
        <div className="products-main-layout">
          {/* Sidebar Filters */}
          <aside className="filter-sidebar">
            <div className="filter-group">
              <h4 className="filter-group-title">Categories</h4>
              <div className="category-list">
                <button 
                  className={`category-list-btn ${!catParam ? 'active' : ''}`}
                  onClick={() => handleCategorySelect('')}
                >
                  <span>All Categories</span>
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`category-list-btn ${catParam === cat.slug || catParam === cat.name ? 'active' : ''}`}
                    onClick={() => handleCategorySelect(cat.slug)}
                  >
                    <span>{cat.name}</span>
                    <span className="category-count-badge">{cat.product_count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategory selector (Req #10) */}
            {catParam && subcategories.length > 0 && (
              <div className="filter-group">
                <h4 className="filter-group-title">Subcategory</h4>
                <select 
                  className="subcategory-list-select"
                  value={subcatParam}
                  onChange={e => handleSubcategorySelect(e.target.value)}
                >
                  <option value="">All Subcategories</option>
                  {subcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Price filter inputs */}
            <div className="filter-group">
              <h4 className="filter-group-title">Price Range</h4>
              <form onSubmit={handlePriceApply}>
                <div className="price-range-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="price-input"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="price-input"
                  />
                </div>
              </form>
            </div>
          </aside>

          {/* Main Products Listing Area */}
          <main className="products-list-content">
            <div className="products-toolbar">
              <p className="products-count">
                Showing {products.length} of {totalCount} products
              </p>
              
              <div className="sort-select-box">
                <span>Sort by:</span>
                <select 
                  value={ordering} 
                  onChange={e => setOrdering(e.target.value)}
                  className="sort-dropdown"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="-name">Name (Z-A)</option>
                  <option value="price">Price: Low to High</option>
                  <option value="-price">Price: High to Low</option>
                  <option value="-rating">Highest Rated</option>
                  <option value="-review_count">Most Popular</option>
                  <option value="-discount_percent">Biggest Discount</option>
                </select>
              </div>
            </div>

            {loading && products.length === 0 ? (
              <div className="products-grid">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="skeleton-card" style={{ height: 300 }} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="products-empty">
                <p>😕 No products match your selected filters.</p>
                <button onClick={resetAllFilters}>Clear all filters</button>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {products.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {nextPageUrl && (
                  <div className="pagination-container">
                    <button 
                      className="load-more-btn" 
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading more products...' : 'Load More Products'}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Products
