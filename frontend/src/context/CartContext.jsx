import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { fetchJson } from '../api/api'

const CartContext = createContext(null)

function loadCartFromStorage() {
  try {
    const stored = localStorage.getItem('digibazaar_cart')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function loadWishlistFromStorage() {
  try {
    const raw = localStorage.getItem('digibazaar_wishlist')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCartFromStorage)
  const [wishlist, setWishlist] = useState(loadWishlistFromStorage)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('digibazaar_cart', JSON.stringify(items))
    } catch {
      // ignore localStorage failures
    }
  }, [items])

  useEffect(() => {
    try {
      localStorage.setItem('digibazaar_wishlist', JSON.stringify(wishlist))
    } catch {
      // ignore
    }
  }, [wishlist])

  const addItem = useCallback(async (product, quantity = 1) => {
    try {
      // If product has no id, just add it
      if (!product || !product.id) {
        setItems(prev => {
          const existing = prev.find(i => i.id === product.id)
          if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i)
          return [...prev, { ...product, quantity }]
        })
        return { status: 'added' }
      }

      // Helper: parse distance value from shop record
      const parseDistance = (value) => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const match = value.match(/\d+(\.\d+)?/)
          return match ? parseFloat(match[0]) : null
        }
        return null
      }

      // Fetch shops where this product is available and check distance
      const shopsRes = await fetchJson(`/products/${product.id}/shops/`)
      const shopsList = Array.isArray(shopsRes) ? shopsRes : (shopsRes.results || shopsRes || [])
      const nearby = shopsList.some(s => {
        const d = parseDistance(s?.distance || s?.distance_km)
        return d !== null && d <= 3
      })

      if (!nearby) {
        const wantsWishlist = window.confirm('This product does not appear to be available in nearby shops (within 3 km).\nWould you like to add it to your wishlist instead?')
        if (wantsWishlist) {
          // store minimal product info via wishlist state helper
          const entry = { id: product.id, name: product.name || product.title || '', price: product.price || 0, image_url: product.image_url || null }
          const exists = wishlist.find(x => x.id === product.id)
          if (exists) {
            try { alert('Product already in your wishlist') } catch (e) {}
            return { status: 'wishlisted', already: true }
          }
          setWishlist(prev => [...prev, entry])
          try { alert('Added to your wishlist') } catch (e) {}
          return { status: 'wishlisted', already: false }
        }
        return { status: 'not_added' }
      }

      // Nearby availability found — add to cart normally
      setItems(prev => {
        const existing = prev.find(i => i.id === product.id)
        if (existing) {
          return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i)
        }
        return [...prev, { ...product, quantity }]
      })
      return { status: 'added' }
    } catch (err) {
      // On any error verifying nearby availability, do nothing (per user preference)
      try {
        // eslint-disable-next-line no-alert
        alert('Could not verify nearby availability. Product was not added to the cart.')
      } catch (e) {}
      return { status: 'error' }
    }
  }, [wishlist])


  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) {
      setItems(prev => prev.filter(i => i.id !== productId))
    } else {
      setItems(prev => prev.map(i => i.id === productId ? { ...i, quantity } : i))
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const total = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const wishlistCount = wishlist.length

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      isOpen, setIsOpen, total, itemCount,
      wishlist, setWishlist, wishlistCount
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (ctx === null || ctx === undefined) {
    // Provide a safe fallback to avoid runtime errors when CartProvider
    // is not mounted. This should not be necessary in normal app usage.
    // eslint-disable-next-line no-console
    console.warn('useCart() called without a CartProvider - returning fallback')
    return {
      items: [],
      addItem: () => {},
      removeItem: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
      isOpen: false,
      setIsOpen: () => {},
      total: 0,
      itemCount: 0
      , wishlist: [], setWishlist: () => {}, wishlistCount: 0
    }
  }

  return ctx
}
