import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Home from '../pages/Home/Home'
import Login from '../pages/Login/Login'
import Signup from '../pages/Signup/Signup'
import ShopDashboard from '../pages/ShopDashboard/ShopDashBoard'
import Products from '../pages/Products/Products'
import ProductDetail from '../pages/ProductDetail/ProductDetail'
import MyOrders from '../pages/MyOrders/MyOrders'
import OrderConfirmation from '../pages/OrderConfirmation/OrderConfirmation'
import RiderPortal from '../pages/RiderPortal/RiderPortal'
import Checkout from '../pages/Checkout/Checkout'
import AdminDashboard from '../pages/AdminDashboard/AdminDashboard'

// Redirects logged-in users away from login/signup pages to their dashboard
function GuestRoute({ children }) {
  const { user } = useAuth()
  if (!user) return children

  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'shopowner') return <Navigate to="/dashboard" replace />
  if (user.role === 'rider') return <Navigate to="/rider" replace />
  return <Navigate to="/" replace />
}

// Requires any authenticated user
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// Requires admin role
function AdminRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// Requires shopowner or admin role
function ShopOwnerRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== 'shopowner' && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// Requires rider role
function RiderRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== 'rider' && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// Smart home redirect: if logged in as a special role, go to their portal
function HomeOrPortal() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  if (user?.role === 'shopowner') return <Navigate to="/dashboard" replace />
  if (user?.role === 'rider') return <Navigate to="/rider" replace />
  return (
    <RequireAuth>
      <Home />
    </RequireAuth>
  )
}
import CartPage from '../pages/Cart/CartPage'
import RequireAuth from '../components/Auth/RequireAuth'

function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<HomeOrPortal />} />
      <Route path='/products' element={<Products />} />
      <Route path='/products/:id' element={<ProductDetail />} />

      <Route path='/login' element={<GuestRoute><Login /></GuestRoute>} />
      <Route path='/signup' element={<GuestRoute><Signup /></GuestRoute>} />

      <Route path='/dashboard' element={<ShopOwnerRoute><ShopDashboard /></ShopOwnerRoute>} />
      <Route path='/rider' element={<RiderRoute><RiderPortal /></RiderRoute>} />
      <Route path='/admin' element={<AdminRoute><AdminDashboard /></AdminRoute>} />

      <Route path='/checkout' element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path='/my-orders' element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
      <Route path='/order-confirmation/:orderId' element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
      <Route path='/cart' element={<ProtectedRoute><CartPage /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}

export default AppRoutes
