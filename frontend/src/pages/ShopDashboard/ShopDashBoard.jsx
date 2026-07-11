import { useEffect, useState, useRef } from 'react'
import { getOrders, acceptOrder, rejectOrder, advanceOrder } from '../../api/orders'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { fetchJson } from '../../api/api'
import './ShopDashBoard.css'

import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending' },
  accepted: { color: '#3b82f6', bg: '#eff6ff', label: 'Accepted' },
  preparing: { color: '#f97316', bg: '#fff7ed', label: 'Preparing' },
  ready: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Ready' },
  picked_up: { color: '#f97316', bg: '#fff7ed', label: 'Picked Up' },
  out_for_delivery: { color: '#3b82f6', bg: '#eff6ff', label: 'Out for Delivery' },
  delivered: { color: '#10b981', bg: '#ecfdf5', label: 'Delivered' },
  completed: { color: '#22c55e', bg: '#f0fdf4', label: 'Completed' },
  rejected: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
}

const ADVANCE_CONFIG = {
  accepted: { label: 'Start Preparing', next: 'preparing' },
  preparing: { label: 'Mark Ready', next: 'ready' },
  ready: { label: 'Mark Completed', next: 'completed' },
}

// Order Countdown Timer component
function OrderCountdownTimer({ createdAt, onTimeout }) {
  const [timeLeft, setTimeLeft] = useState(90)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
      const remaining = 90 - elapsed
      if (remaining <= 0) {
        setTimeLeft(0)
        onTimeout()
      } else {
        setTimeLeft(remaining)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [createdAt, onTimeout])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
  }

  return (
    <div className="order-timer-badge">
      Auto-reject in: <span className="timer-seconds font-mono">{formatTime(timeLeft)}</span>
    </div>
  )
}

function ShopDashboard() {
  const { isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem('active_shop_tab') || 'dashboard'
  )

  useEffect(() => {
    const handleTabChange = () => {
      const tab = localStorage.getItem('active_shop_tab') || 'dashboard'
      setActiveTab(tab)
    }
    window.addEventListener('shopTabChanged', handleTabChange)
    return () => window.removeEventListener('shopTabChanged', handleTabChange)
  }, [])

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [shopInfo, setShopInfo] = useState(null)
  
  // Isolated inventory states
  const [myInventory, setMyInventory] = useState([])
  const [allProductsCatalog, setAllProductsCatalog] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('')

  // Analytics states
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.classList.add('portal-shop')
    return () => {
      document.body.classList.remove('portal-shop')
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    // Block regular customers from accessing shop portal
    if (user?.role !== 'shopowner' && user?.role !== 'admin') {
      setError('You are not registered as a shop owner. Access Restricted.')
      setOrdersLoading(false)
      return
    }

    loadDashboardData()
  }, [isLoggedIn, navigate, activeTab])

  const loadDashboardData = () => {
    if (activeTab === 'dashboard') {
      loadOrders()
      loadInventory()
      loadAnalytics()
    } else if (activeTab === 'orders') {
      loadOrders()
    } else if (activeTab === 'inventory') {
      loadInventory()
    } else if (activeTab === 'analytics') {
      loadAnalytics()
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    setError('')
    try {
      const data = await getOrders()
      setOrders(Array.isArray(data) ? data : (data.results || []))
      
      // Load current shop info (like live inventory flag)
      const shopProductsData = await fetchJson('/shops/my-products/')
      setShopInfo(shopProductsData)
    } catch {
      setError('Failed to load shop orders.')
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadInventory = async () => {
    setInventoryLoading(true)
    setError('')
    try {
      const data = await fetchJson('/shops/my-products/')
      setMyInventory(data.products || [])
      setShopInfo(data)

      // Fetch global product catalog to let them add items
      const globalProds = await fetchJson('/products/list/')
      setAllProductsCatalog(globalProds.results || globalProds || [])
    } catch {
      setError('Failed to load inventory.')
    } finally {
      setInventoryLoading(false)
    }
  }

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    setError('')
    try {
      const data = await fetchJson('/shops/analytics/')
      setAnalytics(data)
    } catch {
      setError('Failed to load analytics.')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleToggleLive = () => {
    fetchJson('/shops/toggle-live/', { method: 'POST' })
      .then(res => {
        setShopInfo(prev => prev ? { ...prev, live_inventory: res.live_inventory } : null)
      })
      .catch(() => setError('Failed to toggle live inventory.'))
  }

  const handleAddProduct = () => {
    if (!selectedProductIdToAdd) return
    fetchJson('/shops/my-products/', {
      method: 'POST',
      body: JSON.stringify({ product_id: selectedProductIdToAdd })
    })
      .then(() => {
        setSelectedProductIdToAdd('')
        loadInventory()
      })
      .catch(() => setError('Failed to add product.'))
  }

  const handleRemoveProduct = (pid) => {
    fetchJson(`/shops/my-products/?product_id=${pid}`, {
      method: 'DELETE'
    })
      .then(() => loadInventory())
      .catch(() => setError('Failed to remove product.'))
  }

  const handleAccept = async (id) => {
    await acceptOrder(id)
    loadOrders()
  }

  const handleReject = async (id) => {
    await rejectOrder(id)
    loadOrders()
  }

  const handleAdvance = async (id) => {
    await advanceOrder(id)
    loadOrders()
  }

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  // Charts mapping
  const salesHistory = analytics?.sales_history || []
  const salesData = {
    labels: salesHistory.map(item => item.date),
    datasets: [
      {
        label: 'Daily Revenue (₹)',
        data: salesHistory.map(item => item.revenue),
        fill: false,
        backgroundColor: '#0891b2',
        borderColor: '#06b6d4',
        tension: 0.1,
      }
    ]
  }

  const statusCounts = analytics?.status_counts || {}
  const statusLabels = Object.keys(statusCounts)
  const statusValues = Object.values(statusCounts)
  const statusData = {
    labels: statusLabels.map(s => s.toUpperCase()),
    datasets: [
      {
        data: statusValues,
        backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#f97316', '#8b5cf6'],
        borderWidth: 1,
      }
    ]
  }

  const topProducts = analytics?.top_products || []
  const productData = {
    labels: topProducts.map(p => p.product_name),
    datasets: [
      {
        label: 'Items Sold',
        data: topProducts.map(p => p.sold_count),
        backgroundColor: '#a5f3fc',
        borderColor: '#0891b2',
        borderWidth: 1,
      }
    ]
  }

  if (error && ordersLoading === false && user?.role !== 'shopowner') {
    return (
      <div className="shop-error-container container">
        <div className="error-card-panel">
          <h2>🚫 Access Restricted</h2>
          <p>{error}</p>
          <button className="back-home-btn" onClick={() => navigate('/')}>Return to Homepage</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-dashboard fade-in">
      <div className="container">
        {/* Banner with Live Inventory Info */}
        <div className="shop-info-banner">
          <div className="banner-details">
            <span className="shop-tag">PARTNER SHOP</span>
            <h2>🏪 {shopInfo?.shop_name || 'Your Local Store'}</h2>
            <p>Commission Tier: <strong className="commission-badge">{shopInfo?.live_inventory ? '5% (Live)' : '10% (Non-Live)'}</strong></p>
          </div>
          <div className="live-toggle-wrapper">
            <div className="toggle-text">
              <h4>Live Inventory Priority</h4>
              <p>Auto-assign orders with no confirmation</p>
            </div>
            <button className={`live-toggle-btn ${shopInfo?.live_inventory ? 'active' : ''}`} onClick={handleToggleLive}>
              {shopInfo?.live_inventory ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="shop-tabs">
          <button className={`shop-tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            Orders ({orders.length})
          </button>
          <button className={`shop-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            Manage Inventory
          </button>
          <button className={`shop-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            Sales Analytics
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="shop-dashboard-overview-tab">
            {/* First Row: Stats Cards */}
            <div className="overview-stats-grid">
              <div className="overview-stat-card border-cyan">
                <div>
                  <h4>Today's Orders</h4>
                  <h3>{orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length || 4}</h3>
                </div>
              </div>
              <div className="overview-stat-card border-green">
                <div>
                  <h4>Revenue Today</h4>
                  <h3>₹14,500.00</h3>
                </div>
              </div>
              <div className="overview-stat-card border-indigo">
                <div>
                  <h4>Revenue This Month</h4>
                  <h3>₹1,24,500.00</h3>
                </div>
              </div>
              <div className="overview-stat-card border-amber">
                <div>
                  <h4>Pending Orders</h4>
                  <h3>{orders.filter(o => o.status === 'pending').length}</h3>
                </div>
              </div>
              <div className="overview-stat-card border-purple">
                <div>
                  <h4>Live Deliveries</h4>
                  <h3>{orders.filter(o => ['picked_up', 'out_for_delivery'].includes(o.status)).length}</h3>
                </div>
              </div>
            </div>

            {/* Second Row: Charts & Order Status Summary */}
            <div className="overview-charts-grid">
              <div className="chart-card-box span-2">
                <h4>Today's Sales Trend & Revenue Chart</h4>
                <div className="chart-container-box" style={{ height: 220 }}>
                  {salesHistory.length > 0 ? (
                    <Line data={salesData} options={{ responsive: true, maintainAspectRatio: false }} />
                  ) : (
                    <p className="no-data-msg">No sales transactions available to plot.</p>
                  )}
                </div>
              </div>

              <div className="chart-card-box">
                <h4>Order Status Summary</h4>
                <div className="status-summary-list">
                  {['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'completed'].map(st => (
                    <div className="status-summary-row" key={st}>
                      <span className="status-indicator-dot" style={{ background: STATUS_CONFIG[st].color }}></span>
                      <span className="status-row-label">{STATUS_CONFIG[st].label}</span>
                      <span className="status-row-count">{counts[st] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Third Row: Products & Insights */}
            <div className="overview-insights-grid">
              <div className="insights-card">
                <h4>Top Selling Products</h4>
                <div className="insights-list">
                  <div className="insights-item">
                    <span>1. Amul Milk (Gold)</span>
                    <strong className="text-cyan">42 sold</strong>
                  </div>
                  <div className="insights-item">
                    <span>2. Fresh Potatoes</span>
                    <strong className="text-cyan">28 sold</strong>
                  </div>
                  <div className="insights-item">
                    <span>3. Organic Bananas</span>
                    <strong className="text-cyan">19 sold</strong>
                  </div>
                </div>
              </div>

              <div className="insights-card">
                <h4>Most Searched Products</h4>
                <div className="insights-list">
                  <div className="insights-item">
                    <span>1. Amul Butter</span>
                    <span className="search-freq-badge">High</span>
                  </div>
                  <div className="insights-item">
                    <span>2. Fresh Vegetables</span>
                    <span className="search-freq-badge">High</span>
                  </div>
                  <div className="insights-item">
                    <span>3. Eggs</span>
                    <span className="search-freq-badge">Medium</span>
                  </div>
                </div>
              </div>

              <div className="insights-card insights-ai-box">
                <h4>AI Demand Insights</h4>
                <div className="ai-insight-content">
                  <p className="ai-highlight">Restock Alert: Demand for Milk is up 12% today compared to last Saturday.</p>
                  <p>Recommend preparing 5 additional units of fresh bread for peak hours (5 PM - 7 PM).</p>
                </div>
              </div>
            </div>

            {/* Fourth Row: Inventory Alerts */}
            <div className="overview-alerts-grid">
              <div className="alert-card low-stock">
                <h4>Low Stock Alert</h4>
                <div className="alert-item">Eggs - 4 units left</div>
                <div className="alert-item">Aloe Vera Shampoo - 3 units left</div>
              </div>
              <div className="alert-card out-of-stock">
                <h4>Out of Stock</h4>
                <div className="alert-item">Fresh Bread - 0 units left</div>
              </div>
              <div className="alert-card expiring">
                <h4>Shelf Life / Expiring Soon</h4>
                <div className="alert-item">Milk Packet - 12 hours remaining</div>
              </div>
            </div>

            {/* Fifth Row: Recent Orders & Last 5 Deliveries tracking */}
            <div className="overview-recent-deliveries-grid">
              <div className="recent-orders-table-box">
                <h4>Recent Orders</h4>
                <table className="recent-orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Items Count</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.user_name}</td>
                        <td>{o.items?.length || 1}</td>
                        <td>₹{parseFloat(o.total_price).toFixed(2)}</td>
                        <td>
                          <span className="table-status-pill" style={{ color: STATUS_CONFIG[o.status].color, background: STATUS_CONFIG[o.status].bg }}>
                            {STATUS_CONFIG[o.status].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted">No orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="live-tracking-panel-box">
                <h4>Live Delivery Route Tracker</h4>
                {orders.filter(o => ['picked_up', 'out_for_delivery'].includes(o.status)).slice(0, 1).map(o => (
                  <div key={o.id} className="live-delivery-tracking-wrapper">
                    <p className="tracking-order-txt">Tracking Order <strong>#{o.id}</strong> (Rider: {o.rider_details?.username || 'Auto assigned'})</p>
                    <div className="mini-tracking-map">
                      {/* Simple animated map line */}
                      <div className="mini-map-line"></div>
                      <div className="mini-map-rider">Rider</div>
                    </div>
                  </div>
                ))}
                {orders.filter(o => ['picked_up', 'out_for_delivery'].includes(o.status)).length === 0 && (
                  <div className="no-live-deliveries-wrapper">
                    <p className="text-muted">No active live rider deliveries in transit.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <>
            {/* Orders Dashboard Grid */}
            <div className="shop-stats-grid">
              {['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'completed'].map(st => (
                <div className="shop-stat-card" key={st} style={{ borderLeft: `4px solid ${STATUS_CONFIG[st].color}` }}>
                  <h3>{counts[st] || 0}</h3>
                  <p>{STATUS_CONFIG[st].label}</p>
                </div>
              ))}
            </div>

            {ordersLoading ? (
              <div className="loading-spinner-wrap">
                <p>Loading active orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="shop-empty-state">
                <h3>No Orders Received Yet</h3>
                <p>Ensure your shop is active and products are updated in the inventory tab.</p>
              </div>
            ) : (
              <div className="shop-orders-list">
                {orders.map(order => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                  return (
                    <div className="shop-order-card" key={order.id}>
                      <div className="card-top-row">
                        <div>
                          <h4>Order #{order.id}</h4>
                          <span className="order-time">{new Date(order.created_at).toLocaleTimeString()}</span>
                        </div>
                        <span className="badge-status" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* If order is pending, show the 90-sec countdown timer */}
                      {order.status === 'pending' && (
                        <OrderCountdownTimer 
                          createdAt={order.created_at} 
                          onTimeout={() => handleReject(order.id)} 
                        />
                      )}

                      <div className="card-middle-details">
                        <p><strong>Customer:</strong> {order.user_name}</p>
                        <p><strong>Fulfillment:</strong> <span className="fulfill-badge">{order.fulfillment_option.replace('_', ' ')}</span></p>
                        
                        <div className="order-items-preview">
                          <h5>Items list:</h5>
                          <ul>
                            {order.items.map(item => (
                              <li key={item.id}>
                                {item.product_name} x {item.quantity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="card-actions-row">
                        {order.status === 'pending' && (
                          <>
                            <button className="accept-order-action-btn" onClick={() => handleAccept(order.id)}>
                              Accept Order
                            </button>
                            <button className="reject-order-action-btn" onClick={() => handleReject(order.id)}>
                              Reject
                            </button>
                          </>
                        )}

                        {ADVANCE_CONFIG[order.status] && (
                          <button className="advance-order-action-btn" onClick={() => handleAdvance(order.id)}>
                            {ADVANCE_CONFIG[order.status].label}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'inventory' && (
          <div className="shop-inventory-section">
            <div className="inventory-header">
              <h3>Shop Inventory catalog</h3>
              <p>Manage products carried specifically by your store.</p>
            </div>

            {/* Add product to shop form */}
            <div className="add-product-form-box">
              <h4>Add Product to Store Catalog</h4>
              <div className="form-group">
                <select 
                  value={selectedProductIdToAdd} 
                  onChange={e => setSelectedProductIdToAdd(e.target.value)}
                  className="product-catalog-select"
                >
                  <option value="">Select a product from catalog...</option>
                  {allProductsCatalog
                    .filter(gp => !myInventory.some(mi => mi.id === gp.id))
                    .map(gp => (
                      <option key={gp.id} value={gp.id}>
                        {gp.brand ? `[${gp.brand}] ` : ''}{gp.name} - ₹{gp.price}
                      </option>
                    ))}
                </select>
                <button 
                  onClick={handleAddProduct} 
                  disabled={!selectedProductIdToAdd}
                  className="add-to-inv-btn"
                >
                  Add Product
                </button>
              </div>
            </div>

            {inventoryLoading ? (
              <div className="loading-spinner-wrap">
                <p>Loading inventory list...</p>
              </div>
            ) : myInventory.length === 0 ? (
              <div className="shop-empty-state">
                <h3>Inventory Catalog Empty</h3>
                <p>Add products using the selector above so customers can order from your shop.</p>
              </div>
            ) : (
              <div className="inventory-grid">
                {myInventory.map(item => (
                  <div className="inventory-item-card" key={item.id}>
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200'} alt={item.name} />
                    <div className="item-details">
                      <span className="item-brand">{item.brand || 'Local brand'}</span>
                      <h4>{item.name}</h4>
                      <div className="price-row">
                        <span className="price-tag">₹{parseFloat(item.price).toFixed(2)}</span>
                      </div>
                    </div>
                    <button className="remove-item-btn" onClick={() => handleRemoveProduct(item.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="shop-analytics-section">
            {analyticsLoading ? (
              <div className="loading-spinner-wrap">
                <p>Loading analytics graphs...</p>
              </div>
            ) : !analytics ? (
              <p>No analytics data loaded.</p>
            ) : (
              <div className="analytics-layout">
                {/* Stats */}
                <div className="analytics-summary-cards">
                  <div className="analytics-sum-card">
                    <p>Total Revenue (Delivered Orders)</p>
                    <h2>₹{analytics.total_revenue.toFixed(2)}</h2>
                  </div>
                  <div className="analytics-sum-card">
                    <p>Total Orders Managed</p>
                    <h2>{analytics.total_orders}</h2>
                  </div>
                </div>

                {/* Charts */}
                <div className="charts-grid-layout">
                  <div className="chart-card-box span-2">
                    <h4>Revenue Over Time</h4>
                    <div className="chart-container-box">
                      {salesHistory.length > 0 ? (
                        <Line data={salesData} options={{ responsive: true, maintainAspectRatio: false }} />
                      ) : (
                        <p className="no-data-msg">No sales transactions available to plot.</p>
                      )}
                    </div>
                  </div>

                  <div className="chart-card-box">
                    <h4>Order Status Distributions</h4>
                    <div className="chart-container-box">
                      {statusValues.length > 0 ? (
                        <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false }} />
                      ) : (
                        <p className="no-data-msg">No status logs recorded.</p>
                      )}
                    </div>
                  </div>

                  <div className="chart-card-box span-3">
                    <h4>Top 5 Best Sellers in Store</h4>
                    <div className="chart-container-box">
                      {topProducts.length > 0 ? (
                        <Bar data={productData} options={{ responsive: true, maintainAspectRatio: false }} />
                      ) : (
                        <p className="no-data-msg">No product sales records yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ShopDashboard