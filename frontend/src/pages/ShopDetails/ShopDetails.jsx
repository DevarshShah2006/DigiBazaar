import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiFetch, TTL } from '../../api/api'
import ProductCard from '../../components/ProductCard/ProductCard'
import OfferCards from '../../components/OfferCards/OfferCards'
import { withGroupedVariants } from '../../utils/productVariants'
import './ShopDetails.css'

const FALLBACK_BANNER = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80'
const categoryIcons = ['', '', '', '', '', '', '', '', '', '']

function ShopDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [favorite, setFavorite] = useState(false)
  const [vegOnly, setVegOnly] = useState(false)
  const [stockOnly, setStockOnly] = useState(false)
  const [filters, setFilters] = useState({ category: '', min: '', max: '', brand: '', rating: '', discount: '', order: '-review_count' })
  const query = searchParams.get('q') || ''

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiFetch(`/shops/detail/${id}/`, {}, TTL.NORMAL),
      apiFetch(`/products/?shop=${id}&page_size=100`, {}, TTL.SHORT),
    ]).then(([shopData, productData]) => {
      setShop(shopData)
      const items = productData?.results || productData || shopData?.product_details || []
      setProducts(withGroupedVariants(items))
    }).finally(() => setLoading(false))
  }, [id])

  const categories = useMemo(() => {
    const details = shop?.category_details || []
    if (details.length) return details.map(c => ({ name: c.name, slug: c.slug || c.name }))
    return [...new Set(products.map(p => p.category_name).filter(Boolean))].map(name => ({ name, slug: name }))
  }, [shop, products])

  const visibleProducts = useMemo(() => products.filter(product => {
    const p = product.variants?.[0] || product
    const inCategory = !filters.category || p.category_name === filters.category || p.category_slug === filters.category
    const inQuery = !query || `${p.name} ${p.brand || ''}`.toLowerCase().includes(query.toLowerCase())
    const inPrice = (!filters.min || Number(p.price) >= Number(filters.min)) && (!filters.max || Number(p.price) <= Number(filters.max))
    const inBrand = !filters.brand || (p.brand || '').toLowerCase().includes(filters.brand.toLowerCase())
    const inRating = !filters.rating || Number(p.rating || 0) >= Number(filters.rating)
    const inDiscount = !filters.discount || Number(p.discount_percent || 0) >= Number(filters.discount)
    const inVeg = !vegOnly || p.food_type === 'veg' || p.food_type === 'vegetarian'
    return inCategory && inQuery && inPrice && inBrand && inRating && inDiscount && inVeg && (!stockOnly || p.in_stock !== false)
  }).sort((a, b) => {
    const left = a.variants?.[0] || a; const right = b.variants?.[0] || b
    if (filters.order === 'price') return Number(left.price) - Number(right.price)
    if (filters.order === '-price') return Number(right.price) - Number(left.price)
    if (filters.order === '-rating') return Number(right.rating || 0) - Number(left.rating || 0)
    if (filters.order === '-created_at') return String(right.created_at).localeCompare(String(left.created_at))
    return Number(right.review_count || 0) - Number(left.review_count || 0)
  }), [products, filters, vegOnly, stockOnly, query])

  const grouped = useMemo(() => categories.map(category => ({ ...category, products: visibleProducts.filter(p => (p.variants?.[0] || p).category_name === category.name) })).filter(group => group.products.length), [categories, visibleProducts])
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))
  const clearFilters = () => { setFilters({ category: '', min: '', max: '', brand: '', rating: '', discount: '', order: '-review_count' }); setVegOnly(false); setStockOnly(false); setSearchParams({}) }
  const scrollToCategory = category => { updateFilter('category', category.name); document.getElementById(`category-${category.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const name = shop?.name || 'Shop'
  const distance = shop?.distance || '1.8 km'

  if (loading) return <div className="shop-view container fade-in"><div className="shop-skeleton shimmer" /><div className="shop-skeleton-grid">{Array.from({ length: 4 }).map((_, i) => <div className="shop-skeleton shimmer" key={i} />)}</div></div>
  if (!shop) return <div className="shop-view container shop-empty"><h1>Shop unavailable</h1><Link to="/">Return home</Link></div>

  return <div className="shop-view fade-in">
    <div className="container">
      <nav className="shop-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>›</span><Link to="/#shops">Shops</Link><span>›</span><strong>{name}</strong></nav>
      <section className="shop-hero">
        <img className="shop-hero__banner" src={shop.banner_url || FALLBACK_BANNER} alt="" onError={e => { e.currentTarget.src = FALLBACK_BANNER }} />
        <div className="shop-hero__content">
          <div className="shop-hero__logo">{shop.logo_url ? <img src={shop.logo_url} alt={`${name} logo`} /> : <span>{name.charAt(0)}</span>}</div>
          <div className="shop-hero__summary"><div className="shop-title-row"><h1>{name}</h1><button className={`shop-heart ${favorite ? 'active' : ''}`} onClick={() => setFavorite(!favorite)} aria-label="Save shop">{favorite ? '♥' : '♡'}</button></div>
            <p>{shop.description || `Your neighbourhood source for carefully selected ${shop.shop_type || 'grocery'} essentials.`}</p>
            <div className="shop-quick-meta"><span>★ {Number(shop.rating || 4.5).toFixed(1)} ({shop.review_count || 'New'} reviews)</span><span>◷ {shop.avg_preparation_time_mins || 15}–{(shop.avg_preparation_time_mins || 15) + 10} mins</span><span>⌖ {distance}</span><span className={shop.is_open === false ? 'closed' : 'open'}>● {shop.is_open === false ? 'Closed' : 'Open'}</span></div>
          </div>
        </div>
        <div className="shop-hero__details"><span><b>Categories</b>{categories.map(c => c.name).join(' · ') || 'Everyday essentials'}</span><span><b>Minimum order</b>₹{Number(shop.min_order_amount || 0).toFixed(0)}</span><span><b>Store timings</b>{shop.opening_time || '9:00 AM'} – {shop.closing_time || '9:00 PM'}</span><span><b>Contact</b>{shop.address || 'Contact shop for details'}</span></div>
      </section>
      <section className="shop-category-nav" aria-label="Shop categories">{categories.map((category, index) => <button key={category.slug} onClick={() => scrollToCategory(category)}>{category.name}</button>)}</section>
    </div>
    <section className="shop-filter-bar"><div className="container shop-filter-bar__inner">
      <select value={filters.category} onChange={e => updateFilter('category', e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      <input aria-label="Minimum price" type="number" placeholder="Min ₹" value={filters.min} onChange={e => updateFilter('min', e.target.value)} />
      <input aria-label="Maximum price" type="number" placeholder="Max ₹" value={filters.max} onChange={e => updateFilter('max', e.target.value)} />
      <input aria-label="Brand" placeholder="Brand" value={filters.brand} onChange={e => updateFilter('brand', e.target.value)} />
      <select value={filters.rating} onChange={e => updateFilter('rating', e.target.value)}><option value="">Any rating</option><option value="4">4★ & above</option><option value="4.5">4.5★ & above</option></select>
      <select value={filters.discount} onChange={e => updateFilter('discount', e.target.value)}><option value="">Any discount</option><option value="10">10% off+</option><option value="20">20% off+</option></select>
      <select value={filters.order} onChange={e => updateFilter('order', e.target.value)}><option value="-review_count">Popularity</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option><option value="-rating">Rating</option><option value="-created_at">New arrivals</option></select>
      <label className="filter-toggle"><input type="checkbox" checked={vegOnly} onChange={e => setVegOnly(e.target.checked)} />Veg only</label><label className="filter-toggle"><input type="checkbox" checked={stockOnly} onChange={e => setStockOnly(e.target.checked)} />In stock</label><button onClick={clearFilters}>Clear</button>
    </div></section>
    <div className="container shop-products"><div className="shop-section-heading"><div><h2>{query ? `Results for “${query}”` : `From ${name}`}</h2><p>{visibleProducts.length} products available today</p></div></div>
      {grouped.length ? grouped.map(group => <section id={`category-${group.slug}`} className="shop-product-group" key={group.slug}><h2>{group.name}</h2><div className="shop-products-grid">{group.products.map(product => <ProductCard product={product} key={product.id} />)}</div></section>) : <div className="shop-empty"><p>No products match these filters.</p><button onClick={clearFilters}>Clear filters</button></div>}
      <section className="shop-offers"><h2>Offers from {name}</h2><OfferCards /></section>
      <section className="shop-reviews"><div><h2>Customer reviews</h2><p>See what local shoppers love about this shop.</p><div className="review-score">★ {Number(shop.rating || 4.5).toFixed(1)} <span>Based on {shop.review_count || 'recent'} reviews</span></div></div><div className="rating-bars">{[5, 4, 3, 2, 1].map((rating, i) => <div key={rating}><span>{rating} ★</span><i><b style={{ width: `${Math.max(10, 82 - i * 18)}%` }} /></i></div>)}</div><button className="review-button" onClick={() => navigate('/my-orders')}>Write a review</button></section>
      {visibleProducts.length > 0 && <section className="shop-recommended"><h2>You may also like</h2><div>{visibleProducts.slice(0, 6).map(product => <ProductCard product={product} key={`rec-${product.id}`} />)}</div></section>}
    </div>
  </div>
}

export default ShopDetails
