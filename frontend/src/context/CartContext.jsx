import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const CartContext = createContext(null)

function loadCartFromStorage() {
  try {
    const stored = localStorage.getItem('digibazaar_cart')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCartFromStorage)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('digibazaar_cart', JSON.stringify(items))
    } catch {
      // ignore localStorage failures
    }
  }, [items])

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      if (!product || !product.id) return prev  // guard: ignore invalid products

      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i)
      }
      return [...prev, { ...product, quantity }]
    })
  }, [])


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

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      isOpen, setIsOpen, total, itemCount
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
    }
  }

  return ctx
}
