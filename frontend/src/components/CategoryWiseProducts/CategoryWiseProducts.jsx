import { useEffect, useState } from 'react'
import { apiFetch, TTL } from '../../api/api'
import ProductCard from '../ProductCard/ProductCard'
import { withGroupedVariants } from '../../utils/productVariants'
import './CategoryWiseProducts.css'

function CategoryWiseProducts() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiFetch('/categories/', {}, TTL.STATIC),
      apiFetch('/products/?page_size=120', {}, TTL.NORMAL),
    ])
      .then(([cats, productsData]) => {
        const categories = (cats || []).slice(0, 4)
        const allProducts = withGroupedVariants(productsData?.results || productsData || [])

        return categories.map(cat => {
          const categoryKey = (cat.slug || cat.name || '').toString().toLowerCase()
          const categoryProducts = allProducts.filter(prod => {
            const productCategorySlug = (prod.category_slug || '').toString().toLowerCase()
            const productCategoryName = (prod.category_name || '').toString().toLowerCase()
            return productCategorySlug === categoryKey || productCategoryName === categoryKey
          }).slice(0, 6)

          return { category: cat, products: categoryProducts }
        })
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
