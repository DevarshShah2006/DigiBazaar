import { BrowserRouter as Router, Link, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import AppRoutes from './routes/AppRoutes'
import Cart from './components/Cart/Cart'
import './App.css'

function Navbar() {
  const { user, logout, isLoggedIn } = useAuth()
  const { itemCount, setIsOpen } = useCart()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <Link to="/" className="nav-logo">
        🛒 <span>DigiBazaar</span>
      </Link>

      <nav className="nav-links">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/products" className="nav-link">Products</Link>
        {isLoggedIn && (
          <>
            <Link to="/my-orders" className="nav-link">My Orders</Link>
            <Link to="/dashboard" className="nav-link nav-link--dashboard">Shop Dashboard</Link>
          </>
        )}
      </nav>

      <div className="nav-actions">
        <button
          className="nav-cart-btn"
          onClick={() => setIsOpen(true)}
          title="Cart"
        >
          🛒 {itemCount > 0 && <span className="nav-cart-badge">{itemCount}</span>}
        </button>

        {isLoggedIn ? (
          <div className="nav-user">
            <span className="nav-user-name">👤 {user?.username}</span>
            <button className="nav-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div className="nav-auth-btns">
            <Link to="/login" className="nav-btn nav-btn--outline">Login</Link>
            <Link to="/signup" className="nav-btn nav-btn--filled">Sign Up</Link>
          </div>
        )}
      </div>
    </header>
  )
}

function AppInner() {
  return (
    <>
      <Navbar />
      <Cart />
      <main>
        <AppRoutes />
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <span>🛒 DigiBazaar — AI-Powered Local Shopping</span>
          <span style={{ color: '#888', fontSize: '13px' }}>Built with ❤️ by the DigiBazaar team</span>
        </div>
      </footer>
    </>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppInner />
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
