import { Routes, Route } from 'react-router-dom'
import Home from '../pages/Home/Home'
import Login from '../pages/Login/Login'
import Signup from '../pages/Signup/Signup'
import ShopDashboard from '../pages/ShopDashboard/ShopDashBoard'
import Products from '../pages/Products/Products'
import ProductDetail from '../pages/ProductDetail/ProductDetail'
import MyOrders from '../pages/MyOrders/MyOrders'
import OrderConfirmation from '../pages/OrderConfirmation/OrderConfirmation'

function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/products' element={<Products />} />
      <Route path='/products/:id' element={<ProductDetail />} />
      <Route path='/login' element={<Login />} />
      <Route path='/signup' element={<Signup />} />
      <Route path='/dashboard' element={<ShopDashboard />} />
      <Route path='/my-orders' element={<MyOrders />} />
      <Route path='/order-confirmation/:orderId' element={<OrderConfirmation />} />
    </Routes>
  )
}


export default AppRoutes
