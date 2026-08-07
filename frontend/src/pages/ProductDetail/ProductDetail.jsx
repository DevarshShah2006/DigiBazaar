import { useEffect, useMemo, useState } from 'react'
import { Heart, ShoppingBag, Clock, CheckCircle2, Star } from 'lucide-react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { apiFetch, TTL } from '../../api/api'
import { useCart } from '../../context/CartContext'
import { getProductBaseName, getProductGroupKey, getQuantityText } from '../../utils/productVariants'
import './ProductDetail.css'

const valueOrNA = (value) => {
  if (value === null || value === undefined || value === '' || String(value).toLowerCase() === 'nan') return 'N/A'
  return value
}

const numberOrNA = (value, digits = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(digits) : 'N/A'
}

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navShopId = location.state?.shopId
  const { items, addItem, updateQuantity } = useCart()
  const [product, setProduct] = useState(null)
  const [variants, setVariants] = useState([])
  const [relatedProducts, setRelatedProducts] = useState([])
  const [shops, setShops] = useState([])
  const [selectedShopId, setSelectedShopId] = useState(navShopId || null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setProduct(null)
    setShops([])
    setVariants([])
    setRelatedProducts([])
    setSelectedImage(0)
    setImageFailed(false)

    async function loadProduct() {
      try {
        // Step 1: Fetch main product details first
        const prod = await apiFetch(`/products/detail/${id}/`, {}, TTL.NORMAL).catch(() => null)
        if (cancelled) return

        if (!prod || !prod.id || prod.detail) {
          setProduct(null)
          setLoading(false)
          return
        }

        // Render main product details INSTANTLY
        setProduct(prod)
        setLoading(false)

        // Step 2: Fetch shops, variants, and related products in background without blocking main view
        const baseName = getProductBaseName(prod) || prod.name
        const category = prod.category_slug || prod.category_name || prod.category

        const [rankedShops, variantData, categoryData] = await Promise.all([
          apiFetch(`/products/${id}/shops/`, {}, TTL.SHORT).catch(() => null),
          baseName ? apiFetch(`/products/?search=${encodeURIComponent(baseName)}&page_size=30`, {}, TTL.SHORT).catch(() => null) : Promise.resolve(null),
          category ? apiFetch(`/products/?category=${encodeURIComponent(category)}&page_size=12`, {}, TTL.SHORT).catch(() => null) : Promise.resolve(null),
        ])
        if (cancelled) return

        const availableShops = Array.isArray(rankedShops) ? rankedShops : (rankedShops?.results || [])
        setShops(availableShops)
        const matchedNavShop = navShopId ? availableShops.find(s => String(s.id) === String(navShopId)) : null
        setSelectedShopId(matchedNavShop?.id || availableShops[0]?.id || navShopId || null)

        const groupKey = getProductGroupKey(prod)
        const matchingVariants = (variantData?.results || (Array.isArray(variantData) ? variantData : []) || [])
          .filter(item => item && item.id && getProductGroupKey(item) === groupKey)
          .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
        setVariants(matchingVariants.length > 1 ? matchingVariants : [])

        const categoryList = categoryData?.results || (Array.isArray(categoryData) ? categoryData : []) || []
        setRelatedProducts(categoryList.filter(item => item && item.id && String(item.id) !== String(prod.id)).slice(0, 4))
      } catch {
        if (!cancelled) {
          setProduct(null)
          setLoading(false)
        }
      }
    }

    loadProduct()
    return () => {
      cancelled = true
    }
  }, [id])

  const images = useMemo(() => {
    const allImages = Array.isArray(product?.images) ? product.images.filter(Boolean) : []
    return [...new Set([product?.image_url, ...allImages].filter(Boolean))]
  }, [product])
  const rawCatName = product?.category_name
  const displayCategory = (rawCatName && String(rawCatName).toLowerCase() === 'homegrown') ? 'Snacks & Munchies' : rawCatName
  const categoryName = valueOrNA(displayCategory)
  const isGrocery = String(product?.category_name || product?.category_slug || '').toLowerCase() === 'grocery'
  const price = numberOrNA(product?.price, 2)
  const mrp = numberOrNA(product?.mrp, 2)
  const canShowDiscount = Number.isFinite(Number(product?.mrp)) && Number.isFinite(Number(product?.price)) && Number(product.mrp) > Number(product.price)
  const nutrition = product?.nutrition_info && typeof product.nutrition_info === 'object' ? product.nutrition_info : {}
  const selectedShop = shops.find(shop => String(shop.id) === String(selectedShopId)) || null
  const cartItem = items.find(item => String(item.id) === String(product?.id))
  const cartQuantity = cartItem?.quantity || 0

  if (loading) return <div className="product-detail container"><div className="pd-skeleton" /></div>
  if (!product || !product.id) return (
    <div className="product-detail container" style={{ padding: '60px 20px', textAlign: 'center' }}>
      <h2>Product not found</h2>
      <p style={{ color: '#666', marginTop: '8px', marginBottom: '24px' }}>The product you are looking for does not exist or has been removed.</p>
      <button 
        className="pd-add-btn" 
        style={{ margin: '0 auto', maxWidth: '200px' }} 
        onClick={() => navigate('/products')}
      >
        Back to Products
      </button>
    </div>
  )

  const activeImage = images[selectedImage]
  const highlights = [
    `Origin: ${valueOrNA(product.country_of_origin)}`,
    `Shelf Life: ${valueOrNA(product.shelf_life)}`,
    product.storage_instructions ? valueOrNA(product.storage_instructions) : `Type: ${valueOrNA(product.food_type)}`,
    `Brand: ${valueOrNA(product.brand)}`,
  ]

  return (
    <main className="product-detail">
      <div className="container">
        <nav className="pd-breadcrumb" aria-label="Breadcrumb">
          <button onClick={() => navigate('/')}>Home</button><span>›</span>
          <button onClick={() => navigate(`/products?category=${encodeURIComponent(product.category_slug || product.category_name || '')}`)}>{categoryName}</button><span>›</span>
          <span>{valueOrNA(product.name)}</span>
        </nav>

        <section className="pd-hero">
          <div className="pd-gallery">
            <div className="pd-image-wrap">
              {activeImage && !imageFailed ? <img src={activeImage} alt={product.name} className="pd-image" onError={() => setImageFailed(true)} /> : <div className="pd-image-placeholder">{product.name?.charAt(0) || 'P'}</div>}
              <button className={`pd-wishlist pd-wishlist--image ${saved ? 'is-saved' : ''}`} onClick={() => setSaved(!saved)} aria-label="Save product"><Heart size={21} fill={saved ? 'currentColor' : 'none'} /></button>
            </div>
            {images.length > 1 && <div className="pd-thumbnails">{images.map((image, index) => <button key={image} className={index === selectedImage ? 'active' : ''} onClick={() => { setSelectedImage(index); setImageFailed(false) }}><img src={image} alt={`${product.name} ${index + 1}`} /></button>)}</div>}
          </div>

          <div className="pd-info">
            <span className="pd-category">{categoryName}</span>
            <h1 className="pd-name">{valueOrNA(product.name)}</h1>
            <p className="pd-brand">Brand: <strong>{valueOrNA(product.brand)}</strong></p>
            <div className="pd-price-row"><span className="pd-price">₹{price}</span>{canShowDiscount && <><div className="pd-price-divider" /><div><span className="pd-save-label">SAVE</span><strong className="pd-save">₹{numberOrNA(Number(product.mrp) - Number(product.price), 0)}</strong></div></>}</div>
            <div className="pd-mrp-row"><span className="pd-mrp">MRP ₹{mrp}</span>{canShowDiscount && <span className="pd-discount">{numberOrNA(product.discount_percent, 0)}% OFF</span>}</div>

            {variants.length > 1 && <div className="pd-variant-area"><span>Select Quantity</span><div className="pd-variants">{variants.map(variant => <button key={variant.id} className={String(variant.id) === String(product.id) ? 'active' : ''} onClick={() => navigate(`/products/${variant.id}`)}>{getQuantityText(variant)}</button>)}</div></div>}

            <div className="pd-delivery"><Clock size={20} /><div><strong>Delivery in 10–15 mins</strong><span>To your saved delivery location · Free on orders above ₹499</span></div></div>
            {shops.length > 0 && <section className="pd-shops" aria-label="Available shops"><h2>Available at</h2><div className="pd-shops-list">{shops.slice(0, 4).map(shop => <button key={shop.id} className={String(shop.id) === String(selectedShopId) ? 'active' : ''} onClick={() => setSelectedShopId(shop.id)}><span><strong>{valueOrNA(shop.name)}</strong><small>{valueOrNA(shop.address)}</small></span><em>{Number.isFinite(Number(shop.rating)) ? `★ ${Number(shop.rating).toFixed(1)}` : 'N/A'}</em></button>)}</div></section>}
            <div className="pd-actions">{cartQuantity > 0 ? <div className="pd-quantity-control"><span>Added to Cart</span><div><button onClick={() => updateQuantity(product.id, cartQuantity - 1)} aria-label="Decrease quantity">−</button><strong>{cartQuantity}</strong><button onClick={() => updateQuantity(product.id, cartQuantity + 1)} aria-label="Increase quantity">+</button></div></div> : <button className="pd-add-btn" onClick={() => addItem({ ...product, shop_id: selectedShop?.id || null, shop_name: selectedShop?.name || null })}><ShoppingBag size={18} /> Add to Cart</button>}<button className={`pd-wishlist ${saved ? 'is-saved' : ''}`} onClick={() => setSaved(!saved)} aria-label="Save product"><Heart size={20} fill={saved ? 'currentColor' : 'none'} /></button></div>
            <div className="pd-highlights"><h2>Product Highlights</h2><div>{highlights.map(item => <span key={item}><CheckCircle2 size={14} /> {item}</span>)}</div></div>
          </div>
        </section>

        <section className={`pd-details ${!isGrocery ? 'pd-details--single' : ''}`}>
          {isGrocery && <div className="pd-nutrition"><h2>Nutrition (per 100g)</h2>{Object.keys(nutrition).length ? Object.entries(nutrition).map(([label, value]) => <p key={label}><span>{label}</span><strong>{valueOrNA(value)}</strong></p>) : <p><span>Nutritional values</span><strong>N/A</strong></p>}</div>}
          <div className="pd-about"><h2>About the Product</h2><p>{valueOrNA(product.description)}</p>{isGrocery && <p><strong>Ingredients:</strong> {valueOrNA(product.ingredients)}</p>}</div>
        </section>

        <section className="pd-rating-section"><h2>Customer Rating</h2><div className="pd-rating-card"><strong>{numberOrNA(product.rating, 1)}</strong><div><span className="pd-stars">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} fill={star <= Math.round(Number(product.rating) || 0) ? 'currentColor' : 'none'} />)}</span><small>Based on {valueOrNA(product.review_count)} verified ratings</small></div></div></section>

        {relatedProducts.length > 0 && <section className="pd-related"><div className="pd-related-heading"><div><h2>Frequently Bought Together</h2><p>Complete your basket with these popular picks from {categoryName}.</p></div></div><div className="pd-related-grid">{relatedProducts.map(item => <article className="pd-related-card" key={item.id} onClick={() => navigate(`/products/${item.id}`)}><div>{item.image_url ? <img src={item.image_url} alt={item.name} onError={event => { event.currentTarget.style.display = 'none' }} /> : <span>{item.name?.charAt(0) || 'P'}</span>}</div><small>{valueOrNA(item.brand)}</small><h3>{valueOrNA(item.name)}</h3><strong>₹{numberOrNA(item.price, 0)}</strong></article>)}</div></section>}
      </div>
    </main>
  )
}

export default ProductDetail
