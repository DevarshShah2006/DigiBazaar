import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RecommendationSection from '../../components/RecommendationSection/RecommendationSection'
import TrendingSection from '../../components/TrendingSection/TrendingSection'
import { fetchJson } from '../../api/api'
import './Home.css'

const CATEGORY_ICONS = {
  'fruits': '🍎', 'vegetables': '🥦', 'dairy': '🥛', 'bakery': '🍞',
  'snacks': '🍿', 'beverages': '☕', 'meat': '🥩', 'seafood': '🐟',
  'fashion': '👗', 'electronics': '📱', 'grocery': '🛒', 'health': '💊',
  'beauty': '💄', 'home': '🏠', 'sports': '⚽', 'toys': '🧸',
  'books': '📚', 'default': '📦'
}

function getCategoryIcon(name = '') {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return CATEGORY_ICONS.default
}

function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetchJson('/products/')
      .then(data => {
        const prods = data.results || data || []
        const catMap = {}
        prods.forEach(p => {
          if (p.category_name && !catMap[p.category_name]) {
            catMap[p.category_name] = { name: p.category_name, slug: p.category_slug }
          }
        })
        setCategories(Object.values(catMap).slice(0, 10))
      })
      .catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="home fade-in-up">
      {/* ── FRESHMART-STYLE HERO ── */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-card">
            {/* The giant text in the background */}
            <h1 className="hero-giant-text">DigiBazaar</h1>
            
            {/* The floating cutout delivery person */}
            <div className="hero-center-image">
              <img 
                src="https://images.unsplash.com/photo-1594968973184-9040a5a79963?q=80&w=600&auto=format&fit=crop" 
                alt="Delivery Person" 
                style={{ mixBlendMode: 'multiply', borderRadius: '50%', objectFit: 'cover', width: 350, height: 450, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
              />
            </div>

            <div className="hero-left-content">
              <p className="hero-desc">
                Shop from thousands of farm-fresh fruits, vegetables, dairy, and daily essentials at unbeatable prices.
              </p>
              <form className="hero-search-form" onSubmit={handleSearch}>
                <input 
                  type="text" 
                  placeholder="Search Grocery Items..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button type="submit">Shop Now &nbsp; →</button>
              </form>
            </div>

            <div className="hero-right-content">
              <div className="hero-floating-card">
                <div className="hero-floating-image">
                  <img src="https://images.unsplash.com/photo-1518843875459-f738682238a6?q=80&w=200&auto=format&fit=crop" alt="Vegetables" />
                </div>
                <div className="hero-floating-info">
                  <h4>Fresh Vegetables</h4>
                  <div className="price-row">
                    <span className="price">₹18.00</span>
                    <span className="old-price">₹24.00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-badge hero-badge-top">Same-Day Delivery</div>
          </div>
        </div>
      </section>

      {/* ── PROMO BANNERS ── */}
      <section className="promo-section">
        <div className="container">
          <div className="promo-grid">
            <div className="promo-card promo-card--green">
              <h3>NEW HERE? ENJOY 10% OFF YOUR FIRST ORDER!</h3>
              <p>Sign up today and get instant savings on your first grocery purchase.</p>
              <button>→</button>
            </div>
            <div className="promo-card promo-card--red">
              <h3>FREE DELIVERY ON ORDERS OVER ₹500</h3>
              <p>Stock up on your weekly groceries and save more with free delivery.</p>
              <button>→</button>
            </div>
            <div className="promo-card promo-card--yellow">
              <h3>FRESH GROCERIES FOR YOUR FAMILY</h3>
              <p>We deliver exactly what you need straight to your door.</p>
              <button>→</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── POPULAR CATEGORIES ── */}
      {categories.length > 0 && (
        <section className="categories-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Popular Categories</h2>
              <button className="view-all-btn" onClick={() => navigate('/products')}>Show All &nbsp; →</button>
            </div>
            <div className="categories-strip">
              {categories.map((cat, i) => (
                <button
                  key={cat.slug}
                  className={`category-chip cat-color-${i % 6}`}
                  onClick={() => navigate(`/products?category=${cat.slug}`)}
                >
                  <div className="category-chip__icon">{getCategoryIcon(cat.name)}</div>
                  <h4 className="category-chip__name">{cat.name}</h4>
                  <span className="category-chip__count">Explore</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING (Today's Fresh Picks) ── */}
      <div className="container">
        <TrendingSection />
      </div>

      {/* ── RECOMMENDATIONS ── */}
      <div className="container">
        <RecommendationSection />
      </div>

      {/* ── READY TO FILL YOUR CART ── */}
      <section className="bottom-cta">
        <div className="container">
          <div className="bottom-cta-inner">
            <div className="bottom-cta-text">
              <h2>Ready To Fill Your Cart With Freshness?</h2>
              <p>Shop from local stores, daily essentials, and exclusive deals delivered straight to your door.</p>
              <button className="cta-action-btn" onClick={() => navigate('/signup')}>Join DigiBazaar Today</button>
            </div>
            <div className="bottom-cta-image">
              <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop" alt="Fresh Groceries" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
