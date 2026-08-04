import { useNavigate } from 'react-router-dom'
import './CategoryCarousel.css'

const LOCAL_FALLBACK_ICON = '/placeholder-product.svg'

function CategoryCarousel({ categories }) {
  const navigate = useNavigate()
  const items = (categories || []).filter(cat => Number(cat.product_count || 0) > 0)

  if (items.length === 0) return null

  return (
    <section className="category-carousel">
      <div className="category-carousel__header">
        <h2>Shop by Category</h2>
      </div>

      <div className="category-carousel__track">
        {items.map(item => (
          <button
            key={item.id || item.slug || item.name}
            className="category-card"
            type="button"
            onClick={() => navigate(`/products?category=${encodeURIComponent(item.slug || item.name)}`)}
          >
            <div className="category-card__icon">
              <img
                src={item.image_url || LOCAL_FALLBACK_ICON}
                alt={item.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = LOCAL_FALLBACK_ICON
                }}
              />
            </div>
            <span className="category-card__name">{item.name}</span>
            <span className="category-card__count">{item.product_count} products</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default CategoryCarousel
