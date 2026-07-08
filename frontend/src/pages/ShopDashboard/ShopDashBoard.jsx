import { useEffect, useState } from 'react'
import { getOrders, acceptOrder, rejectOrder } from '../../api/orders'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { fetchJson } from '../../api/api'
import './ShopDashBoard.css'

// Chart.js registration & imports
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
  pending: { color: '#f59e0b', bg: '#fffbeb', label: '⏳ Pending' },
  accepted: { color: '#3b82f6', bg: '#eff6ff', label: '✅ Accepted' },
  preparing: { color: '#f97316', bg: '#fff7ed', label: '👨‍🍳 Preparing' },
  ready: { color: '#8b5cf6', bg: '#f5f3ff', label: '🔔 Ready' },
  completed: { color: '#22c55e', bg: '#f0fdf4', label: '🎉 Completed' },
  rejected: { color: '#ef4444', bg: '#fef2f2', label: '❌ Rejected' },
}

function ShopDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('orders')
  
  // Analytics State
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  async function loadOrders() {
    try {
      setLoading(true)
      setError('')
      const data = await getOrders()
      setOrders(Array.isArray(data) ? data : (data.results || []))
    } catch {
      setError('Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalytics() {
    try {
      setAnalyticsLoading(true)
      setError('')
      const data = await fetchJson('/shops/analytics/')
      setAnalytics(data)
    } catch {
      setError('Failed to load analytics.')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return }
    if (activeTab === 'orders') {
      loadOrders()
    } else if (activeTab === 'analytics') {
      loadAnalytics()
    }
  }, [isLoggedIn, activeTab])

  const handleAccept = async (id) => {
    await acceptOrder(id)
    loadOrders()
  }

  const handleReject = async (id) => {
    await rejectOrder(id)
    loadOrders()
  }

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  // Formulate Chart Data
  const salesHistory = analytics?.sales_history || []
  const salesData = {
    labels: salesHistory.map(item => item.date),
    datasets: [
      {
        label: 'Daily Revenue (₹)',
        data: salesHistory.map(item => item.revenue),
        fill: false,
        backgroundColor: '#1b5e20',
        borderColor: '#43a047',
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
        backgroundColor: [
          '#f59e0b', // pending
          '#3b82f6', // accepted
          '#22c55e', // completed
          '#ef4444', // rejected
          '#f97316', // preparing
          '#8b5cf6'  // ready
        ],
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
        backgroundColor: '#aed581',
        borderColor: '#7cb342',
        borderWidth: 1,
      }
    ]
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__title">🏪 Shop Dashboard</h1>
            <p className="dashboard__sub">Manage and analyze your shop performance</p>
          </div>
          
          <div className="dashboard__tab-buttons">
            <button 
              className={`tab-btn ${activeTab === 'orders' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              📋 Orders
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📈 Analytics
            </button>
          </div>
        </div>

        {error && <div className="dashboard__error">{error}</div>}

        {activeTab === 'orders' ? (
          <>
            {/* Summary cards */}
            <div className="dashboard__stats">
              {['pending', 'accepted', 'completed', 'rejected'].map(status => (
                <div className="dash-stat" key={status}
                  style={{ borderTop: `3px solid ${STATUS_CONFIG[status].color}` }}>
                  <span className="dash-stat__count">{counts[status] || 0}</span>
                  <span className="dash-stat__label">{STATUS_CONFIG[status].label}</span>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="dashboard__orders">
                {Array(3).fill(0).map((_, i) => <div key={i} className="order-skeleton" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="dashboard__empty">
                <p>📭 No orders yet.</p>
                <p>Orders will appear here when customers place them.</p>
              </div>
            ) : (
              <div className="dashboard__orders">
                {orders.map(order => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                  return (
                    <div className="order-card" key={order.id}>
                      <div className="order-card__header">
                        <div>
                          <h3 className="order-card__id">Order #{order.id}</h3>
                          <p className="order-card__date">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <span className="order-card__status"
                          style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                      </div>

                      <div className="order-card__body">
                        <div className="order-card__info">
                          <span>👤 <strong>Customer:</strong> {order.user_name}</span>
                          <span>🏪 <strong>Shop:</strong> {order.shop_name}</span>
                          {order.items && order.items.length > 0 && (
                            <div className="order-card__items-preview">
                              <strong>Items:</strong>
                              <ul>
                                {order.items.map(item => (
                                  <li key={item.id}>
                                    {item.product_name} x{item.quantity} (₹{parseFloat(item.price_at_order).toFixed(2)})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {order.status === 'pending' && (
                        <div className="order-card__actions">
                          <button className="order-btn order-btn--accept" onClick={() => handleAccept(order.id)}>
                            ✅ Accept Order
                          </button>
                          <button className="order-btn order-btn--reject" onClick={() => handleReject(order.id)}>
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="dashboard__analytics-tab">
            {analyticsLoading ? (
              <div className="dashboard__loading">
                <div className="loading-spinner"></div>
                <p>Aggregating sales and business analytics data...</p>
              </div>
            ) : !analytics ? (
              <div className="dashboard__empty">
                <p>😕 Failed to aggregate analytics data.</p>
              </div>
            ) : (
              <div className="analytics-content">
                {/* Stats row */}
                <div className="analytics-stats-grid">
                  <div className="stat-card">
                    <h4>Total Revenue</h4>
                    <span className="stat-value">₹{analytics.total_revenue.toFixed(2)}</span>
                  </div>
                  <div className="stat-card">
                    <h4>Total Orders Placed</h4>
                    <span className="stat-value">{analytics.total_orders}</span>
                  </div>
                </div>

                {/* Charts grid */}
                <div className="charts-grid">
                  <div className="chart-card chart-card--span-2">
                    <h3>📈 Revenue Over Time</h3>
                    {salesHistory.length > 0 ? (
                      <div className="chart-container">
                        <Line data={salesData} options={{ responsive: true, maintainAspectRatio: false }} />
                      </div>
                    ) : (
                      <p className="no-data">No completed sales records yet to plot over time.</p>
                    )}
                  </div>

                  <div className="chart-card">
                    <h3>🍰 Order Status Distribution</h3>
                    {statusValues.length > 0 ? (
                      <div className="chart-container">
                        <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false }} />
                      </div>
                    ) : (
                      <p className="no-data">No order logs available.</p>
                    )}
                  </div>

                  <div className="chart-card chart-card--span-3">
                    <h3>🏆 Top 5 Best Selling Products</h3>
                    {topProducts.length > 0 ? (
                      <div className="chart-container">
                        <Bar data={productData} options={{ responsive: true, maintainAspectRatio: false }} />
                      </div>
                    ) : (
                      <p className="no-data">No product sales records yet.</p>
                    )}
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