import { useEffect, useState } from 'react'
import { fetchJson } from '../../api/api'
import ProductCard from '../ProductCard/ProductCard'
import { withGroupedVariants } from '../../utils/productVariants'
import './CategoryWiseProducts.css'

function CategoryWiseProducts() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchJson('/categories/')
      .then(cats => {
        const categories = (cats || []).slice(0, 4)
        return Promise.all(categories.map(cat => {
          const categoryFilter = cat.slug || cat.name || cat.id
          return fetchJson(`/products/?category=${encodeURIComponent(categoryFilter)}&page_size=30`)
            .then(d => {
              const rawProds = d.results || d || []
              const grouped = withGroupedVariants(rawProds).slice(0, 6)
              return { category: cat, products: grouped }
            })
            .catch(() => ({ category: cat, products: [] }))
        }))
      })
      .then(results => {
        if (!cancelled) setBlocks(results || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <section className="category-wise-section">
      <div className="section-header">
        <h2 className="section-title">Browse by Category</h2>
      </div>
      <div className="category-wise-placeholder">Loading categories...</div>
    </section>
  )

  if (!blocks.length) return null

  return (
    <section className="category-wise-section">
      <div className="category-wise-inner">
        {blocks.map(block => (
          <div key={block.category.id} className="category-block">
            <div className="category-block__header">
              <div>
                <h3>{block.category.name}</h3>
                <p className="category-subtitle">Farm to table, delivered in minutes</p>
              </div>
              <div className="category-actions"><a href={`/products?category=${encodeURIComponent(block.category.slug || block.category.name)}`} className="view-all">View All Items ▸</a></div>
            </div>

            <div className="category-products-grid">
              {block.products.length ? (
                block.products.map(p => (
                  <div className="category-product-wrap" key={p.id}>
                    <ProductCard product={p} />
                  </div>
                ))
              ) : (
                <div className="no-products">No products found</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CategoryWiseProducts
