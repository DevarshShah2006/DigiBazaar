import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RecommendationSection from '../../components/RecommendationSection/RecommendationSection'
import TrendingSection from '../../components/TrendingSection/TrendingSection'
import ProductCard from '../../components/ProductCard/ProductCard'
import { fetchJson } from '../../api/api'
import './Home.css'

const CAROUSEL_SLIDES = [
  {
    title: "Fresh Groceries in 15 Minutes!",
    desc: "We connect you to 18 active local stores within a 3km radius. Super fast delivery, fresh products.",
    badge: "15 MIN EXPRESS",
    bgClass: "slide-express",
    actionText: "Shop Now",
    image: "https://images.unsplash.com/photo-1594968973184-9040a5a79963?q=80&w=600&auto=format&fit=crop"
  },
  {
    title: "Special Inaugural Discount!",
    desc: "Get Flat 10% Off your first purchase. Use promo code WELCOME10 at the checkout panel.",
    badge: "WELCOME OFFER",
    bgClass: "slide-discount",
    actionText: "Claim Coupon",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=600&auto=format&fit=crop"
  },
  {
    title: "Support Your Neighborhood Shop Owners",
    desc: "Buy directly from local vendors. 100% of revenue goes directly to support local community businesses.",
    badge: "DIRECT LOCAL COMMERCE",
    bgClass: "slide-support",
    actionText: "Explore Shops",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop"
  }
]

function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchJson('/categories/')
      .then(data => {
        setCategories(data.slice(0, 11) || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchJson('/products/new_arrivals/?limit=8')
      .then(data => {
        const prods = data.results || data || []
        setNewArrivals(prods.slice(0, 8))
      })
      .catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length)
  }

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)
  }

  const slide = CAROUSEL_SLIDES[currentSlide]

  return (
    <div className="home fade-in">
      <section className="hero-carousel-section">
        <div className="container">
          <div className={`hero-carousel-slide ${slide.bgClass}`}>
            <button className="carousel-control-btn prev" onClick={handlePrevSlide} aria-label="Previous slide">
              Prev
            </button>
            <button className="carousel-control-btn next" onClick={handleNextSlide} aria-label="Next slide">
              Next
            </button>

            <div className="carousel-content-grid">
              <div className="slide-text-side">
                <span className="slide-badge">{slide.badge}</span>
                <h1 className="slide-title">{slide.title}</h1>
                <p className="slide-desc">{slide.desc}</p>

                <form className="hero-search-form" onSubmit={handleSearch}>
                  <div className="search-input-wrap" style={{ paddingLeft: '0px' }}>
                    <input
                      type="text"
                      placeholder="Search for fresh foods, bakery or dairy..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '16px' }}
                    />
                  </div>
                  <button type="submit">{slide.actionText}</button>
                </form>
              </div>

              <div className="slide-image-side">
                <div className="slide-img-frame">
                  <img src={slide.image} alt={slide.title} />
                  <div className="floating-3d-tag">Near You</div>
                </div>
              </div>
            </div>
          </div>

          <div className="carousel-indicators">
            {CAROUSEL_SLIDES.map((_, idx) => (
              <span
                key={idx}
                className={`indicator-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">Fresh produce and goods delivered in minutes</p>
            </div>
            <button className="view-all-btn" onClick={() => navigate('/products')}>Show All</button>
          </div>

          <div className="categories-strip">
            <button
              className="category-chip offers-chip-special"
              onClick={() => navigate('/checkout')}
            >
              <h4 className="category-chip__name">Offers</h4>
              <span className="category-chip__count">WELCOME10</span>
            </button>

            {categories.map((cat, i) => (
              <button
                key={cat.slug}
                className={`category-chip cat-color-${i % 6}`}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
              >
                <h4 className="category-chip__name">{cat.name}</h4>
                <span className="category-chip__count">{cat.product_count} items</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="promo-section">
        <div className="container">
          <div className="promo-grid">
            <div className="promo-card promo-card--green">
              <h3>GET 10% SAVINGS INSTANTLY</h3>
              <p>Type coupon code WELCOME10 during platform checkout to apply discount.</p>
            </div>
            <div className="promo-card promo-card--red">
              <h3>LOCAL EXPRESS SHIPPING</h3>
              <p>Auto-allocates the closest rider to deliver from your chosen shop.</p>
            </div>
            <div className="promo-card promo-card--yellow">
              <h3>FAIRNESS-WINDOW ALLOCATION</h3>
              <p>Supports local stores by prioritizing reliability scores and prep speed.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <TrendingSection />
      </div>

      {newArrivals.length > 0 && (
        <div className="container" style={{ marginTop: '40px', marginBottom: '20px' }}>
          <section className="new-arrivals-section">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 className="section-title" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>🆕 New Arrivals</h2>
                <p className="section-subtitle" style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '4px' }}>Just added to our shelves</p>
              </div>
            </div>
            <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {newArrivals.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="container">
        <RecommendationSection />
      </div>

      <section className="bottom-cta">
        <div className="container">
          <div className="bottom-cta-inner">
            <div className="bottom-cta-text">
              <h2>Ready to Fill Your Cart with Freshness?</h2>
              <p>Support your local businesses, select pickup or express rider deliveries, and experience lightning fast commerce.</p>
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
