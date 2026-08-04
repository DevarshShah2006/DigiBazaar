import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RecommendationSection from '../../components/RecommendationSection/RecommendationSection'
import TrendingSection from '../../components/TrendingSection/TrendingSection'
import ProductCard from '../../components/ProductCard/ProductCard'
import HeroBanner from '../../components/HeroBanner/HeroBanner'
import CategoryCarousel from '../../components/CategoryCarousel/CategoryCarousel'
import OfferCards from '../../components/OfferCards/OfferCards'
import NearbyShops from '../../components/NearbyShops/NearbyShops'
import ErrorBoundary from '../../components/ErrorBoundary/ErrorBoundary'
import CategoryWiseProducts from '../../components/CategoryWiseProducts/CategoryWiseProducts'
import { apiFetch, TTL } from '../../api/api'
import { getCategories } from '../../api/products'
import { withGroupedVariants } from '../../utils/productVariants'
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

  // Hero is provided by a dedicated component (HeroBanner)

  useEffect(() => {
    getCategories()
      .then(data => {
        setCategories((data || []).filter(cat => Number(cat.product_count || 0) > 0))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch('/products/new_arrivals/?page_size=8', {}, TTL.SHORT)
      .then(data => {
        const prods = (data.results || data || [])
        setNewArrivals(withGroupedVariants(prods).slice(0, 8))
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

  

  return (
    <div className="home fade-in">
      <section className="hero-section">
        <div className="container">
          <HeroBanner />
        </div>
      </section>

      <section className="categories-section">
        <div className="container">
          <CategoryCarousel categories={categories} />
        </div>
      </section>

      <section className="promo-section">
        <div className="container">
          <OfferCards />
        </div>
      </section>

      <div className="container">
        <ErrorBoundary>
          <TrendingSection />
        </ErrorBoundary>
      </div>

      {newArrivals.length > 0 && (
        <div className="container" style={{ marginTop: '40px', marginBottom: '20px' }}>
          <section className="new-arrivals-section">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 className="section-title" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4c8631' }}>New Arrivals</h2>
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
        <ErrorBoundary>
          <RecommendationSection />
        </ErrorBoundary>

        <ErrorBoundary>
          <CategoryWiseProducts />
        </ErrorBoundary>

        <ErrorBoundary>
          <NearbyShops />
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default Home
