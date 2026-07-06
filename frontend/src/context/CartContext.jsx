import { createContext, useState } from 'react'

export const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  const addToCart = item => setCart(prev => [...prev, item])
  const removeFromCart = itemId => setCart(prev => prev.filter(item => item.id !== itemId))

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  )
}
