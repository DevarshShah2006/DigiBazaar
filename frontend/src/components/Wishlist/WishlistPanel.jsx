import './Wishlist.css'
import { useState } from 'react'
import { useCart } from '../../context/CartContext'

function WishlistPanel({ isOpen, onClose }) {
  const { wishlist, setWishlist, addItem } = useCart()
  const [processingId, setProcessingId] = useState(null)

  const removeItem = (id) => {
    setWishlist(prev => prev.filter(i => i.id !== id))
  }

  const handleAddToCart = async (it) => {
    setProcessingId(it.id)
    try {
      const res = await addItem(it, 1)
      if (res?.status === 'added') {
        // remove from wishlist
        setWishlist(prev => prev.filter(x => x.id !== it.id))
        try { alert('Added to cart') } catch (e) {}
      } else if (res?.status === 'wishlisted') {
        try { alert('Product saved to wishlist') } catch (e) {}
      } else if (res?.status === 'not_added') {
        try { alert('Product not added to cart') } catch (e) {}
      } else {
        try { alert('Could not add product to cart') } catch (e) {}
      }
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <>
      <div className={`wishlist-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`wishlist-panel ${isOpen ? 'open' : ''}`}>
        <div className="wishlist-header">
          <h3>Wishlist</h3>
          <button className="wishlist-close" onClick={onClose}>✕</button>
        </div>

        {(!wishlist || wishlist.length === 0) ? (
          <div className="wishlist-empty">Your wishlist is empty</div>
        ) : (
          <div className="wishlist-items">
            {wishlist.map(it => (
              <div className="wishlist-item" key={it.id}>
                <img src={it.image_url || '/placeholder-product.svg'} alt={it.name} />
                <div className="wishlist-item-info">
                  <p className="wishlist-item-name">{it.name}</p>
                  <p className="wishlist-item-price">₹{parseFloat(it.price || 0).toFixed(2)}</p>
                </div>
                <div className="wishlist-item-actions">
                  <button onClick={() => { removeItem(it.id) }} disabled={processingId === it.id}>Remove</button>
                  <button onClick={() => handleAddToCart(it)} disabled={processingId === it.id}>
                    {processingId === it.id ? 'Adding...' : 'Add to cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  )
}

export default WishlistPanel
