import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getOrders, acceptOrder, rejectOrder, advanceOrder } from '../../api/orders'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { fetchJson, apiFetch, TTL } from '../../api/api'
import RouteMap from '../../components/RouteMap/RouteMap'
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
  cancelled: { color: '#6b7280', bg: '#f3f4f6', label: 'Cancelled' },
  cancellation_requested: { color: '#f59e0b', bg: '#fffbeb', label: 'Cancel Requested' },
  failed: { color: '#dc2626', bg: '#fef2f2', label: 'Failed' },
}

const ADVANCE_CONFIG = {
  accepted: { label: 'Start Preparing', next: 'preparing' },
  preparing: { label: 'Mark Ready', next: 'ready' },
  ready: { label: 'Mark Completed', next: 'completed' },
}

// Order Countdown Timer component — triggers backend timeout when time runs out
function OrderCountdownTimer({ createdAt, onTimeout }) {
  const TIMEOUT_SECS = 60  // 1 minute
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECS)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
      const remaining = TIMEOUT_SECS - elapsed
      if (remaining <= 0 && !expired) {
        setTimeLeft(0)
        setExpired(true)
        onTimeout()
      } else if (remaining > 0) {
        setTimeLeft(remaining)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [createdAt, onTimeout, expired])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
  }

  return (
    <div className={`order-timer-badge ${timeLeft <= 20 ? 'urgent' : ''}`}>
      {timeLeft > 0
        ? <>Auto-reject in: <span className="timer-seconds font-mono">{formatTime(timeLeft)}</span></>
        : <span style={{color:'#ef4444', fontWeight: 700}}>Timed out - routing to next shop...</span>
      }
    </div>
  )
}

function PaginationControls({ currentPage, totalPages, onPageChange }) {
  const page = currentPage || 1
  const total = totalPages || 1
  
  const handlePageClick = (p) => {
    onPageChange(p)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 20 }}>
      <button
        disabled={page <= 1}
        onClick={() => handlePageClick(page - 1)}
        style={{
          padding: '8px 18px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: page <= 1 ? '#f1f5f9' : '#ffffff',
          color: page <= 1 ? '#94a3b8' : '#0f172a',
          fontWeight: '700',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          boxShadow: page <= 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        Previous
      </button>
      <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700', padding: '0 8px' }}>
        Page {page} of {total}
      </span>
      <button
        disabled={page >= total}
        onClick={() => handlePageClick(page + 1)}
        style={{
          padding: '8px 18px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: page >= total ? '#f1f5f9' : '#ffffff',
          color: page >= total ? '#94a3b8' : '#0f172a',
          fontWeight: '700',
          cursor: page >= total ? 'not-allowed' : 'pointer',
          boxShadow: page >= total ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        Next
      </button>
    </div>
  )
}

function ShopDashboard() {
  const { isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    // Set localStorage active_shop_tab to dashboard and notify sidebar on mount
    localStorage.setItem('active_shop_tab', 'dashboard')
    window.dispatchEvent(new Event('shopTabChanged'))

    const handleTabChange = () => {
      const tab = localStorage.getItem('active_shop_tab') || 'dashboard'
      setActiveTab(tab)
    }
    const handleStatusSync = () => {
      apiFetch('/shops/my-products/', {}, TTL.SHORT).then(data => {
        if (data) setShopInfo(data)
      }).catch(() => {})
    }
    window.addEventListener('shopTabChanged', handleTabChange)
    window.addEventListener('shopStatusChanged', handleStatusSync)
    window.addEventListener('liveInventoryToggled', handleStatusSync)
    return () => {
      window.removeEventListener('shopTabChanged', handleTabChange)
      window.removeEventListener('shopStatusChanged', handleStatusSync)
      window.removeEventListener('liveInventoryToggled', handleStatusSync)
    }
  }, [])

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalCount, setOrdersTotalCount] = useState(0)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [shopInfo, setShopInfo] = useState(null)
  
  // Isolated inventory states
  const [myInventory, setMyInventory] = useState([])
  const [allProductsCatalog, setAllProductsCatalog] = useState([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryPage, setInventoryPage] = useState(1)
  const [inventoryTotalCount, setInventoryTotalCount] = useState(0)
  const [inventoryTotalPages, setInventoryTotalPages] = useState(1)
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('')
  const [editingItem, setEditingItem] = useState(null)

  // Analytics states
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [forecastData, setForecastData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  
  // Dynamic Dashboard States
  const [revenueToday, setRevenueToday] = useState(null)
  const [revenueMonth, setRevenueMonth] = useState(null)
  const [topProductsList, setTopProductsList] = useState([])
  const [searchTrends, setSearchTrends] = useState([])
  const [lowStockList, setLowStockList] = useState([])
  const [outOfStockList, setOutOfStockList] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])
  const [slowMovingProducts, setSlowMovingProducts] = useState([])
  const [weatherData, setWeatherData] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [error, setError] = useState('')

  // New Tab States: Reports, CRM, Promotions, Growth, Settings
  const [reportsData, setReportsData] = useState(null)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('30d')

  const [crmData, setCrmData] = useState(null)
  const [crmLoading, setCrmLoading] = useState(false)
  const [crmPage, setCrmPage] = useState(1)
  const [crmTotalCount, setCrmTotalCount] = useState(0)
  const [crmTotalPages, setCrmTotalPages] = useState(1)

  const [promotionsData, setPromotionsData] = useState(null)
  const [promotionsLoading, setPromotionsLoading] = useState(false)
  const [newPromoCode, setNewPromoCode] = useState('')
  const [newPromoDiscount, setNewPromoDiscount] = useState(10)
  const [newPromoMinOrder, setNewPromoMinOrder] = useState(0)

  const [growthData, setGrowthData] = useState(null)
  const [growthLoading, setGrowthLoading] = useState(false)

  const [settingsData, setSettingsData] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)

  useEffect(() => {
    document.body.classList.add('portal-shop')
    return () => {
      document.body.classList.remove('portal-shop')
    }
  }, [])

  // Auth guard — only runs once on mount (role check handled by AppRoutes already)
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    // Initial data load for default tab (dashboard)
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  // Reload data whenever active tab changes (after initial mount)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (isLoggedIn) {
      loadDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleTabClick = (tabName) => {
    localStorage.setItem('active_shop_tab', tabName)
    setActiveTab(tabName)
    window.dispatchEvent(new Event('shopTabChanged'))
  }

  const loadDashboardData = () => {
    if (activeTab === 'dashboard') {
      loadOrders()
      loadInventory()
      loadAnalytics()
      loadDemandForecast()
      loadDashboardOverviewData()
    } else if (activeTab === 'orders') {
      loadOrders()
    } else if (activeTab === 'inventory') {
      loadInventory()
      loadDemandForecast()
    } else if (activeTab === 'analytics') {
      loadAnalytics()
      loadDemandForecast()
    } else if (activeTab === 'reports') {
      loadSalesReport()
    } else if (activeTab === 'customers') {
      loadCustomerCRM()
    } else if (activeTab === 'promotions') {
      loadPromotions()
    } else if (activeTab === 'growth') {
      loadGrowthData()
    } else if (activeTab === 'settings') {
      loadSettingsData()
    }
  }

  const loadSalesReport = async (period = reportPeriod) => {
    setReportsLoading(true)
    setError('')
    try {
      const data = await apiFetch(`/shop/dashboard/reports/?period=${period}`, {}, TTL.SHORT)
      setReportsData(data)
    } catch {
      setError('Failed to load sales report.')
    } finally {
      setReportsLoading(false)
    }
  }

  const loadCustomerCRM = async (page = crmPage) => {
    setCrmLoading(true)
    setError('')
    try {
      const data = await apiFetch(`/shop/dashboard/customers/?page=${page}`, {}, TTL.SHORT)
      const crm = data || { customers: [] }
      setCrmData(crm)
      setCrmTotalCount(crm.total_count || (crm.customers ? crm.customers.length : 0))
      setCrmTotalPages(crm.total_pages || 1)
      setCrmPage(crm.current_page || page)
    } catch {
      setError('Failed to load customer CRM data.')
    } finally {
      setCrmLoading(false)
    }
  }

  const loadPromotions = async () => {
    setPromotionsLoading(true)
    setError('')
    try {
      const data = await apiFetch('/shop/dashboard/promotions/', {}, TTL.SHORT)
      setPromotionsData(data)
    } catch {
      setError('Failed to load promotions.')
    } finally {
      setPromotionsLoading(false)
    }
  }

  const loadGrowthData = async () => {
    setGrowthLoading(true)
    setError('')
    try {
      const data = await apiFetch('/shop/dashboard/growth/', {}, TTL.SHORT)
      setGrowthData(data)
    } catch {
      setError('Failed to load growth hub data.')
    } finally {
      setGrowthLoading(false)
    }
  }

  const loadSettingsData = async () => {
    setSettingsLoading(true)
    setError('')
    try {
      const data = await apiFetch('/shop/dashboard/settings/', {}, TTL.SHORT)
      setSettingsData(data)
    } catch {
      setError('Failed to load store settings.')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSendCustomerOffer = (customerId, discountPct = 15) => {
    fetchJson('/shop/dashboard/customers/send-offer/', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, discount_pct: discountPct })
    })
      .then(res => {
        alert(res.message || 'Targeted 15% coupon dispatched to customer!')
        setCrmData(prev => {
          if (!prev || !prev.customers) return prev
          return {
            ...prev,
            customers: prev.customers.map(c => {
              if (c.id === customerId) {
                return {
                  ...c,
                  dispatched_coupon: {
                    code: res.coupon_code || `WINBACK_${customerId}`,
                    discount_value: discountPct,
                    valid_until: res.valid_until || ''
                  },
                  tags: Array.from(new Set(['15% Offer Active', ...(c.tags || [])]))
                }
              }
              return c
            })
          }
        })
        loadCustomerCRM()
      })
      .catch(err => alert("Failed to dispatch offer: " + (err.message || err)))
  }

  const handleCreatePromo = (e) => {
    e.preventDefault()
    if (!newPromoCode.trim()) return
    fetchJson('/shop/dashboard/promotions/', {
      method: 'POST',
      body: JSON.stringify({
        code: newPromoCode.trim(),
        discount_value: newPromoDiscount,
        min_order_value: newPromoMinOrder,
        discount_type: 'percentage'
      })
    })
      .then(res => {
        alert(res.message)
        setNewPromoCode('')
        loadPromotions()
      })
      .catch(err => alert("Failed to create promotion: " + (err.message || err)))
  }

  const handleToggleCoupon = (couponId) => {
    fetchJson(`/shop/dashboard/promotions/?coupon_id=${couponId}`, {
      method: 'DELETE'
    })
      .then(res => {
        alert(res.message)
        loadPromotions()
      })
      .catch(err => alert("Failed to toggle coupon: " + (err.message || err)))
  }

  const handleUpgradeTier = () => {
    fetchJson('/shop/dashboard/growth/upgrade/', {
      method: 'POST',
      body: JSON.stringify({ tier: 'premium', payment_amount: 5000 })
    })
      .then(res => {
        alert(res.message)
        loadGrowthData()
        loadOrders()
        window.location.reload()
      })
      .catch(err => alert("Upgrade failed: " + (err.message || err)))
  }

  const handleSaveSettings = (e) => {
    e.preventDefault()
    if (!settingsData) return
    setSettingsSaving(true)
    fetchJson('/shop/dashboard/settings/', {
      method: 'PUT',
      body: JSON.stringify(settingsData)
    })
      .then(res => {
        alert(res.message)
        loadSettingsData()
      })
      .catch(err => alert("Failed to save settings: " + (err.message || err)))
      .finally(() => setSettingsSaving(false))
  }

  const handleDownloadCSVReport = () => {
    if (!reportsData || !reportsData.daily_series) return
    const headers = ['Date', 'Sales (INR)']
    const rows = reportsData.daily_series.map(row => [row.date, row.sales])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `DigiBazaar_Sales_Report_${reportsData.period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const loadDashboardOverviewData = async () => {
    setOverviewLoading(true)
    try {
      const [revToday, revMonth, topProds, trends, lowS, outS, expP, slowM, weather] = await Promise.all([
        apiFetch('/shop/dashboard/revenue-today/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/revenue-month/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/top-products/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/search-trends/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/low-stock/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/out-of-stock/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/expiring-products/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/slow-moving/', {}, TTL.SHORT),
        apiFetch('/shop/dashboard/weather/', {}, TTL.WEATHER),
      ])
      setRevenueToday(revToday || null)
      setRevenueMonth(revMonth || null)
      setTopProductsList(Array.isArray(topProds) ? topProds : [])
      setSearchTrends(Array.isArray(trends) ? trends : [])
      setLowStockList(Array.isArray(lowS) ? lowS : [])
      setOutOfStockList(Array.isArray(outS) ? outS : [])
      setExpiringProducts(Array.isArray(expP) ? expP : [])
      setSlowMovingProducts(Array.isArray(slowM) ? slowM : [])
      setWeatherData(weather)
    } catch (err) {
      console.error("Failed to load dashboard overview stats", err)
    } finally {
      setOverviewLoading(false)
    }
  }

  const loadOrders = async (page = ordersPage) => {
    setOrdersLoading(true)
    setError('')
    try {
      const data = await getOrders(page)
      if (data && data.orders) {
        setOrders(data.orders)
        setOrdersTotalCount(data.total_count || data.orders.length)
        setOrdersTotalPages(data.total_pages || 1)
        setOrdersPage(data.current_page || page)
      } else if (Array.isArray(data)) {
        setOrders(data)
        setOrdersTotalCount(data.length)
        setOrdersTotalPages(1)
      }
      
      // Load current shop info (like live inventory flag) - use cached API
      const shopProductsData = await apiFetch('/shops/my-products/', {}, TTL.SHORT)
      setShopInfo(shopProductsData)
    } catch {
      setError('Failed to load shop orders.')
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadInventory = async (page = inventoryPage) => {
    setInventoryLoading(true)
    setError('')
    try {
      const data = await apiFetch(`/shops/my-products/?page=${page}`, {}, TTL.SHORT)
      const inventory = data || { products: [] }
      setMyInventory(inventory.products || [])
      setShopInfo(inventory)
      setInventoryTotalCount(inventory.total_count || (inventory.products ? inventory.products.length : 0))
      setInventoryTotalPages(inventory.total_pages || 1)
      setInventoryPage(inventory.current_page || page)

      // Asynchronously fetch global product catalog once for product creation without blocking inventory page rendering
      if (allProductsCatalog.length === 0) {
        apiFetch('/products/list/', {}, TTL.NORMAL).then(globalProds => {
          setAllProductsCatalog(globalProds?.results || globalProds || [])
        }).catch(() => {})
      }
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
      const data = await apiFetch('/shops/analytics/', {}, TTL.SHORT)
      setAnalytics(data || { total_revenue: 0, total_orders: 0, status_counts: {}, sales_history: [], top_products: [] })
    } catch {
      setError('Failed to load analytics.')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const loadDemandForecast = async () => {
    setForecastLoading(true)
    setError('')
    try {
      const data = await apiFetch('/shops/demand-forecast/', {}, TTL.SHORT)
      setForecastData(data || { forecast_today: [], forecast_history: [], metrics: {} })
    } catch {
      setError('Failed to load demand forecast.')
    } finally {
      setForecastLoading(false)
    }
  }

  const handleToggleLive = () => {
    fetchJson('/shops/toggle-live/', { method: 'POST' })
      .then(res => {
        if (res) setShopInfo(prev => prev ? { ...prev, live_inventory: res.live_inventory } : prev)
        window.dispatchEvent(new Event('liveInventoryToggled'))
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

  const handleSaveEdit = (e) => {
    e.preventDefault()
    if (!editingItem) return

    fetchJson('/shops/my-products/', {
      method: 'PUT',
      body: JSON.stringify({
        product_id: editingItem.id,
        name: editingItem.name,
        brand: editingItem.brand,
        quantity_label: editingItem.quantity_label,
        price: editingItem.price,
        stock: editingItem.stock,
        min_stock: editingItem.min_stock,
        max_stock: editingItem.max_stock,
        expiry_date: editingItem.expiry_date
      })
    })
      .then(() => {
        loadInventory()
        apiFetch('/shops/demand-forecast/', {}, TTL.SHORT).then(setForecastData).catch(() => {})
        setEditingItem(null)
      })
      .catch((err) => {
        alert("Failed to update inventory fields: " + (err.message || err))
      })
  }

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    if (!isLoggedIn) return
    const refreshInterval = setInterval(() => {
      if (activeTab === 'dashboard' || activeTab === 'orders') {
        loadOrders(ordersPage)
      }
    }, 30000)
    return () => clearInterval(refreshInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, activeTab, ordersPage])

  const handleAccept = async (id) => {
    try {
      await acceptOrder(id)
      loadOrders(ordersPage)
    } catch (e) {
      alert('Failed to accept order: ' + (e?.message || 'Server error'))
    }
  }

  const handleReject = async (id) => {
    try {
      const res = await rejectOrder(id)
      if (res?.rerouted) {
        alert(`Order rejected. Rerouted to: ${res.new_order?.shop_name || 'next shop'}`)
      }
      loadOrders(ordersPage)
    } catch (e) {
      alert('Failed to reject order: ' + (e?.message || 'Server error'))
    }
  }

  const handleAdvance = async (id) => {
    try {
      await advanceOrder(id)
      loadOrders(ordersPage)
    } catch (e) {
      alert('Failed to advance order: ' + (e?.message || 'Server error'))
    }
  }

  // Called by countdown timer — trigger backend auto-timeout/reroute
  const handleOrderTimeout = async () => {
    try {
      const res = await fetchJson('/orders/timeout/', {
        method: 'POST',
        body: JSON.stringify({ timeout_seconds: 60 })
      })
      if (res && res.total_processed > 0) {
        loadOrders(ordersPage)
      }
    } catch {
      // Silent fail — don't alert user on background timeout check
    }
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
      <div className="shop-error-container container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="error-card-panel" style={{ background: '#1e293b', padding: '36px', borderRadius: '16px', border: '1px solid #334155', maxWidth: '520px', margin: '0 auto', color: '#fff' }}>
          <h2 style={{ fontSize: '22px', color: '#f43f5e', marginBottom: '12px' }}>Access Restricted</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
            You are currently logged in as <strong>{user?.username || 'Customer'}</strong> ({user?.role || 'customer'}). This section is reserved for verified Shop Owners.
          </p>
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', textAlign: 'left', marginBottom: '24px', fontSize: '13px', border: '1px solid #334155' }}>
            <p style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '6px' }}>💡 How to log in as a Shop Owner:</p>
            <p style={{ color: '#cbd5e1', margin: '4px 0' }}>• Click <strong>Log In as Shop Owner</strong> below</p>
            <p style={{ color: '#cbd5e1', margin: '4px 0' }}>• Use Phone Number: <strong style={{ color: '#f59e0b' }}>9000000037</strong> (H&M Satellite)</p>
            <p style={{ color: '#cbd5e1', margin: '4px 0' }}>• OTP: <strong style={{ color: '#f59e0b' }}>123456</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="back-home-btn" style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { logout(); navigate('/login'); }}>
              Log In as Shop Owner
            </button>
            <button className="back-home-btn" style={{ padding: '10px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-dashboard fade-in">
      <div className="container">
        {/* Banner with Store Info */}
        <div className="shop-info-banner">
          <div className="banner-details">
            <span className="shop-tag">PARTNER SHOP</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>{shopInfo?.shop_name || 'Your Local Store'}</h2>
              <span style={{
                background: shopInfo?.live_inventory ? '#dcfce7' : '#f1f5f9',
                color: shopInfo?.live_inventory ? '#15803d' : '#64748b',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: `1px solid ${shopInfo?.live_inventory ? '#86efac' : '#cbd5e1'}`
              }}>
                Live Inventory Status: {shopInfo?.live_inventory ? 'On' : 'Off'}
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Commission Tier: <strong className="commission-badge" style={{ color: '#0891b2' }}>{shopInfo?.commission_pct ? `${shopInfo.commission_pct}% (${shopInfo.tier === 'premium' ? 'Gold' : shopInfo.live_inventory ? 'Live' : 'Standard'})` : '...'}</strong>
            </p>
            {weatherData && (
              <div className="weather-widget" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e0f2fe', border: '1px solid #bae6fd', padding: '5px 14px', borderRadius: 16, fontSize: '0.82rem', marginTop: 8, color: '#0369a1' }}>
                <span><strong>{weatherData.city}</strong></span>
                <strong style={{ color: '#0284c7', fontSize: '0.95rem' }}>{weatherData.temp}°C</strong>
                <span>• {weatherData.condition}</span>
                {weatherData.windspeed > 0 && <span style={{ color: '#0369a1', fontSize: '0.78rem' }}>{weatherData.windspeed} km/h wind</span>}
                {weatherData.is_raining && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>Rain Alert</span>}
                {weatherData.source === 'fallback' && <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>(offline)</span>}
              </div>
            )}
          </div>
        </div>

        {/* Tab selector */}
        <div className="shop-tabs" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className={`shop-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabClick('dashboard')}>
            Overview
          </button>
          <button className={`shop-tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabClick('orders')}>
            Orders ({ordersTotalCount || orders.length})
          </button>
          <button className={`shop-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => handleTabClick('inventory')}>
            Inventory
          </button>
          <button className={`shop-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => handleTabClick('analytics')}>
            Analytics
          </button>
          <button className={`shop-tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabClick('reports')}>
            Sales Reports
          </button>
          <button className={`shop-tab-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => handleTabClick('customers')}>
            Customer CRM
          </button>
          <button className={`shop-tab-btn ${activeTab === 'promotions' ? 'active' : ''}`} onClick={() => handleTabClick('promotions')}>
            Promotions
          </button>
          <button className={`shop-tab-btn ${activeTab === 'growth' ? 'active' : ''}`} onClick={() => handleTabClick('growth')}>
            Growth Hub
          </button>
          <button className={`shop-tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabClick('settings')}>
            Settings
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="shop-dashboard-overview-tab">
            {overviewLoading ? (
              <div className="loading-spinner-wrap" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <p>Loading dashboard operational data...</p>
              </div>
            ) : (
              <>
                {/* First Row: Small Rectangle Stats Cards (Side by Side) */}
                <div className="overview-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <div className="overview-stat-card border-cyan">
                    <div>
                      <h4>Today's Orders</h4>
                      <h3>{orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</h3>
                    </div>
                  </div>
                  <div className="overview-stat-card border-green">
                    <div>
                      <h4>Revenue Today</h4>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <h3>₹{(revenueToday?.revenue_today || 0.00).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        {revenueToday && (
                          <span className={revenueToday.status === 'up' ? "text-green" : "text-red"} style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {revenueToday.status === 'up' ? '▲' : '▼'} {revenueToday.percentage_change}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="overview-stat-card border-indigo">
                    <div>
                      <h4>Revenue This Month</h4>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <h3>₹{(revenueMonth?.revenue_month || 0.00).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        {revenueMonth && (
                          <span className={revenueMonth.status === 'up' ? "text-green" : "text-red"} style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {revenueMonth.status === 'up' ? '▲' : '▼'} {revenueMonth.percentage_change}%
                          </span>
                        )}
                      </div>
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
                      {topProductsList.length > 0 ? (
                        topProductsList.map((item, idx) => (
                          <div className="insights-item" key={idx}>
                            <span>{idx + 1}. {item.product_name}</span>
                            <strong className="text-cyan">{item.sold_count} sold</strong>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted" style={{ padding: '10px 0' }}>No products sold yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="insights-card">
                    <h4>Market Search Trends (Google Trends)</h4>
                    <div className="insights-list">
                      {searchTrends.length > 0 ? (
                        searchTrends.map((item, idx) => (
                          <div className="insights-item" key={idx}>
                            <span>{idx + 1}. {item.keyword}</span>
                            <span className="search-freq-badge" style={{
                              background: item.trend_score >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              color: item.trend_score >= 80 ? '#10b981' : '#3b82f6'
                            }}>
                              Score: {item.trend_score}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted" style={{ padding: '10px 0' }}>No search trends loaded.</p>
                      )}
                    </div>
                  </div>

                  <div className="insights-card insights-ai-box">
                    <h4>Demand Forecast (Tomorrow)</h4>
                    <div className="forecast-summary-list" style={{ marginTop: 10 }}>
                      {forecastLoading ? (
                        <p className="text-muted">Calculating forecast...</p>
                      ) : forecastData?.forecast_today ? (
                        forecastData.forecast_today.slice(0, 4).map(fc => (
                          <div className="insights-item" key={fc.product_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                              <span style={{ fontWeight: '500' }}>{fc.product_name}</span>
                              <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                {Math.round(fc.predicted_tomorrow)} Expected tomorrow
                              </div>
                            </div>
                            <span className={fc.percentage_change >= 0 ? "text-green" : "text-red"} style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                              {fc.percentage_change >= 0 ? '▲' : '▼'} {Math.abs(fc.percentage_change)}%
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted">No forecast data generated.</p>
                      )}
                      {forecastData?.forecast_today?.length === 0 && !forecastLoading && (
                        <p className="text-muted">No forecast data available.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fourth Row: Inventory & Operational Alert Cards (Side by Side) */}
                <div className="overview-alerts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  {forecastData?.forecast_today?.some(fc => fc.status === 'restock_required') && (
                    <div className="alert-card out-of-stock" style={{ border: '1px solid #ef4444', borderLeft: '4px solid #ef4444' }}>
                      <h4 style={{ color: '#dc2626' }}>Stock Deficit Alerts</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {forecastData.forecast_today
                          .filter(fc => fc.status === 'restock_required')
                          .slice(0, 3)
                          .map(fc => (
                            <div className="alert-item" key={fc.product_id} style={{ color: '#dc2626', fontSize: '0.8rem' }}>
                              <strong>{fc.product_name}</strong>: demand {Math.round(fc.predicted_tomorrow)}, stock {fc.current_stock}. Reorder: <strong>{fc.reorder_recommended}</strong>.
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="alert-card low-stock">
                    <h4>Low Stock Alert</h4>
                    {lowStockList.length > 0 ? (
                      lowStockList.map((item, idx) => (
                        <div className="alert-item" key={idx} style={{ color: '#b45309' }}>
                          [Stock Low] {item.product_name} - {item.remaining} left
                        </div>
                      ))
                    ) : (
                      <div className="alert-item" style={{ color: '#10b981' }}>All stock levels normal</div>
                    )}
                  </div>
                  
                  <div className="alert-card out-of-stock">
                    <h4>Out of Stock</h4>
                    {outOfStockList.length > 0 ? (
                      outOfStockList.map((item, idx) => (
                        <div className="alert-item" key={idx} style={{ color: '#ef4444' }}>
                          [Out of Stock] {item.product_name}
                        </div>
                      ))
                    ) : (
                      <div className="alert-item" style={{ color: '#10b981' }}>All items in stock</div>
                    )}
                  </div>
                  
                  <div className="alert-card expiring">
                    <h4>Shelf Life / Expiring Soon</h4>
                    {expiringProducts.length > 0 ? (
                      expiringProducts.map((item, idx) => (
                        <div className="alert-item" key={idx} style={{ color: '#f59e0b' }}>
                          [Expiring] {item.product_name} - {item.remaining}
                        </div>
                      ))
                    ) : (
                      <div className="alert-item" style={{ color: '#10b981' }}>No items expiring soon</div>
                    )}
                  </div>

                  <div className="alert-card border-purple" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', padding: 15, borderRadius: 8 }}>
                    <h4 style={{ color: '#7c3aed', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Slow Moving Products</h4>
                    {slowMovingProducts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {slowMovingProducts.map((item, idx) => (
                          <div key={idx} style={{ fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                            <div style={{ fontWeight: '500', color: '#0f172a' }}>{item.product_name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Sold: {item.sold_count} (30d) | Stock: {item.current_stock}</div>
                            <div style={{ color: '#7c3aed', fontWeight: '500', marginTop: 3 }}>
                              Suggestion: <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => alert(`Marketing Campaign Created: ${item.recommendation} for ${item.product_name}`)}>{item.recommendation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert-item" style={{ color: '#10b981', fontSize: '0.85rem' }}>No slow moving products detected</div>
                    )}
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
                              {(() => { const scfg = STATUS_CONFIG[o.status] || { color: '#94a3b8', bg: '#f1f5f9', label: o.status || 'Unknown' }; return (
                                <span className="table-status-pill" style={{ color: scfg.color, background: scfg.bg }}>
                                  {scfg.label}
                                </span>
                               ); })()}
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
                        <p className="tracking-order-txt">Tracking Order <strong>#{o.id}</strong> (Rider: {o.rider_details?.full_name || o.rider_details?.username || 'Auto assigned'})</p>
                        <RouteMap
                          height={200}
                          origin={{
                            lat: o.shop_lat,
                            long: o.shop_long,
                            label: o.shop_name || 'Shop',
                            icon: '🛒',
                            color: '#0891b2',
                          }}
                          destination={{
                            lat: o.lat,
                            long: o.long,
                            label: o.user_name || 'Customer',
                            icon: '🏠',
                            color: '#10b981',
                          }}
                          rider={{
                            lat: o.rider_details?.lat,
                            long: o.rider_details?.long,
                          }}
                        />
                      </div>
                    ))}
                    {orders.filter(o => ['picked_up', 'out_for_delivery'].includes(o.status)).length === 0 && (
                      <div className="no-live-deliveries-wrapper">
                        <p className="text-muted">No active live rider deliveries in transit.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
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

                      {/* If order is pending, show the 60-sec countdown timer */}
                      {order.status === 'pending' && (
                        <OrderCountdownTimer
                          createdAt={order.created_at}
                          onTimeout={handleOrderTimeout}
                        />
                      )}

                      <div className="card-middle-details">
                        <p><strong>Customer:</strong> {order.user_name} {order.user_phone && <span style={{color:'#64748b', fontSize:'0.85rem'}}>({order.user_phone})</span>}</p>
                        <p><strong>Fulfillment:</strong> <span className="fulfill-badge">{order.fulfillment_option?.replace(/_/g, ' ')}</span></p>
                        {order.delivery_address && <p style={{fontSize:'0.82rem', color:'#64748b'}}><strong>Address:</strong> {order.delivery_address}</p>}
                        {order.rider_details && (
                          <p style={{fontSize:'0.82rem', color:'#3b82f6'}}>
                            <strong>Rider:</strong> {order.rider_details.full_name || order.rider_details.username}
                            {order.rider_phone && <> ({order.rider_phone})</>}
                          </p>
                        )}
                        <div className="order-items-preview">
                          <h5>Items list:</h5>
                          <ul>
                            {order.items.map(item => (
                              <li key={item.id}>
                                {item.product_name} x {item.quantity} <span style={{color:'#64748b'}}>@ ₹{parseFloat(item.price_at_order).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div style={{marginTop:8, padding:'8px 12px', background:'#f8fafc', borderRadius:6, fontSize:'0.82rem', display:'flex', gap:16}}>
                          <span><strong>Subtotal:</strong> ₹{parseFloat(order.subtotal || 0).toFixed(2)}</span>
                          <span><strong>Delivery:</strong> ₹{parseFloat(order.delivery_charge || 0).toFixed(2)}</span>
                          <span><strong>Total:</strong> ₹{parseFloat(order.total_price || 0).toFixed(2)}</span>
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
            <PaginationControls currentPage={ordersPage} totalPages={ordersTotalPages} onPageChange={(p) => loadOrders(p)} />
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
                      <h4 style={{ minHeight: '38px', margin: '4px 0' }}>{item.name}</h4>
                      <div className="price-row" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="price-tag">₹{parseFloat(item.price).toFixed(2)}</span>
                        {item.quantity_label && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({item.quantity_label})</span>
                        )}
                      </div>

                      {/* Inventory Details Grid */}
                      <div style={{ marginTop: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Stock Level:</span>
                          <strong style={{ color: item.stock <= item.min_stock ? '#ef4444' : '#0f172a' }}>{item.stock} units</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>Min / Max Threshold:</span>
                          <span>{item.min_stock} / {item.max_stock}</span>
                        </div>
                        {item.expiry_date && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                            <span>Expiry Date:</span>
                            <span>{item.expiry_date}</span>
                          </div>
                        )}
                      </div>

                      {/* ML Demand Details */}
                      {(() => {
                        const fc = forecastData?.forecast_today?.find(f => f.product_id === item.id);
                        if (!fc) return null;
                        return (
                          <div className="ml-inventory-info" style={{ marginTop: 8, padding: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 4, fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                              <span style={{ color: '#aaa' }}>Current Stock:</span>
                              <strong>{fc.current_stock}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                              <span style={{ color: '#aaa' }}>Demand Forecast:</span>
                              <strong>{Math.round(fc.predicted_tomorrow)}</strong>
                            </div>
                            {fc.reorder_recommended > 0 ? (
                              <div style={{ color: '#ffaa00', fontWeight: 'bold', marginTop: 4 }}>
                                ⚠️ Reorder Recommended: {fc.reorder_recommended}
                              </div>
                            ) : (
                              <div style={{ color: '#10b981', fontSize: '0.75rem', marginTop: 4 }}>
                                ✓ Stock is sufficient
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="inventory-card-actions">
                      <button className="edit-item-btn" onClick={() => setEditingItem({ ...item })}>
                        Edit
                      </button>
                      <button className="remove-item-btn-half" onClick={() => handleRemoveProduct(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PaginationControls currentPage={inventoryPage} totalPages={inventoryTotalPages} onPageChange={(p) => loadInventory(p)} />
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

                {/* Demand Forecast Section */}
                {(() => {
                  const forecastHistory = forecastData?.forecast_history || [];
                  const forecastMetrics = forecastData?.metrics || { mae: 0.0, mse: 0.0, r2_score: 0.0 };
                  const forecastChartData = {
                    labels: forecastHistory.map(item => item.date),
                    datasets: [
                      {
                        label: 'Predicted Sales (Units)',
                        data: forecastHistory.map(item => item.predicted),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.3,
                        fill: true
                      },
                      {
                        label: 'Actual Sales (Units)',
                        data: forecastHistory.map(item => item.actual),
                        borderColor: '#10b981',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        borderDash: [5, 5]
                      }
                    ]
                  };

                  return (
                    <div className="demand-forecast-analytics-box" style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 25 }}>
                      <h3 style={{ marginBottom: 8, fontSize: '1.4rem' }}>Product Demand Forecasting</h3>
                      <p className="text-muted" style={{ marginBottom: 20, fontSize: '0.85rem' }}>
                        Evaluates Multiple Linear Regression model predictions against actual sales data.
                      </p>
                      
                      <div className="charts-grid-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                        <div className="chart-card-box">
                          <h4>Predicted vs Actual Store Sales (Last 7 Days)</h4>
                          <div className="chart-container-box" style={{ height: 260 }}>
                            {forecastHistory.length > 0 ? (
                              <Line data={forecastChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                            ) : (
                              <p className="no-data-msg">No historical forecast data available.</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="chart-card-box">
                          <h4>Regression Performance Metrics</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 10 }}>
                            <div className="analytics-sum-card" style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>MAE (Mean Absolute Error)</span>
                              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: '#f59e0b' }}>
                                {forecastMetrics.mae.toFixed(2)}
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: '#777' }}>Average forecasting discrepancy per product</p>
                            </div>
                            
                            <div className="analytics-sum-card" style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>MSE (Mean Squared Error)</span>
                              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: '#ef4444' }}>
                                {forecastMetrics.mse.toFixed(2)}
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: '#777' }}>Squared error variance metric</p>
                            </div>
                            
                            <div className="analytics-sum-card" style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>R² Score (Model Fit)</span>
                              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: '#10b981' }}>
                                {forecastMetrics.r2_score.toFixed(2)}
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.7rem', color: '#777' }}>Closer to 1.0 indicates a better model fit</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="shop-reports-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>📊 Sales & Tax Financial Ledger</h3>
                <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Comprehensive revenue reporting, GST tax breakdown, and anomaly detection.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  value={reportPeriod}
                  onChange={e => { setReportPeriod(e.target.value); loadSalesReport(e.target.value); }}
                  className="product-catalog-select"
                  style={{ width: 'auto', padding: '8px 12px' }}
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="365d">Year-to-Date (365 Days)</option>
                </select>
                <button className="add-to-inv-btn" onClick={handleDownloadCSVReport} style={{ padding: '8px 16px' }}>
                  📥 Export Report (CSV)
                </button>
              </div>
            </div>

            {reportsLoading ? (
              <div className="loading-spinner-wrap"><p>Calculating financial ledger...</p></div>
            ) : !reportsData ? (
              <p>No report data available.</p>
            ) : (
              <>
                <div className="overview-stats-grid" style={{ marginBottom: 25 }}>
                  <div className="overview-stat-card border-cyan">
                    <div>
                      <h4>Gross Store Sales</h4>
                      <h3>₹{reportsData.summary.gross_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>{reportsData.summary.completed_orders_count} Orders</span>
                    </div>
                  </div>
                  <div className="overview-stat-card border-green">
                    <div>
                      <h4>Net Merchant Payout</h4>
                      <h3 style={{ color: '#10b981' }}>₹{reportsData.summary.net_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>After {reportsData.summary.commission_rate_pct}% Platform Fee</span>
                    </div>
                  </div>
                  <div className="overview-stat-card border-indigo">
                    <div>
                      <h4>Platform Commission Fee</h4>
                      <h3 style={{ color: '#ef4444' }}>₹{reportsData.summary.platform_fee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>Deducted @ {reportsData.summary.commission_rate_pct}%</span>
                    </div>
                  </div>
                  <div className="overview-stat-card border-amber">
                    <div>
                      <h4>GST Tax Liability (18%)</h4>
                      <h3 style={{ color: '#f59e0b' }}>₹{reportsData.tax_ledger.gst_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>CGST: ₹{reportsData.tax_ledger.cgst} | SGST: ₹{reportsData.tax_ledger.sgst}</span>
                    </div>
                  </div>
                </div>

                <div className="charts-grid-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 25 }}>
                  <div className="chart-card-box">
                    <h4>Daily Sales Ledger Breakdown</h4>
                    <div className="chart-container-box" style={{ height: 260 }}>
                      <Line
                        data={{
                          labels: reportsData.daily_series.map(d => d.date),
                          datasets: [{
                            label: 'Daily Sales (₹)',
                            data: reportsData.daily_series.map(d => d.sales),
                            borderColor: '#0891b2',
                            backgroundColor: 'rgba(8, 145, 178, 0.1)',
                            fill: true,
                            tension: 0.2
                          }]
                        }}
                        options={{ responsive: true, maintainAspectRatio: false }}
                      />
                    </div>
                  </div>

                  <div className="chart-card-box">
                    <h4>Sales Anomaly & Tax Forecast</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Predicted Next Week Sales:</span>
                        <h4 style={{ margin: '4px 0 0 0', color: '#0891b2' }}>₹{reportsData.ml_insights.predicted_next_week_revenue.toLocaleString()}</h4>
                      </div>
                      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Est. Next Week Tax Liability:</span>
                        <h4 style={{ margin: '4px 0 0 0', color: '#d97706' }}>₹{reportsData.ml_insights.predicted_next_week_tax.toLocaleString()}</h4>
                      </div>

                      {reportsData.ml_insights.anomalies.length > 0 ? (
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: '#dc2626' }}>Detected Sales Anomalies:</strong>
                          {reportsData.ml_insights.anomalies.map((anom, idx) => (
                            <div key={idx} style={{ fontSize: '0.75rem', color: anom.type === 'high_surge' ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                              • {anom.date}: {anom.note}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Sales variance is within normal expected distribution.</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="shop-customers-section">
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>👥 Customer Intelligence & CRM</h3>
              <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Track buyer loyalty, RFM segmentation, customer lifetime value, and churn risks.</p>
            </div>

            {crmLoading ? (
              <div className="loading-spinner-wrap"><p>Loading customer CRM records...</p></div>
            ) : !crmData ? (
              <p>No customer records found.</p>
            ) : (
              <>
                <div className="overview-stats-grid" style={{ marginBottom: 25 }}>
                  <div className="overview-stat-card border-cyan">
                    <div>
                      <h4>Total Unique Buyers</h4>
                      <h3>{crmData.crm_summary.total_unique_customers}</h3>
                    </div>
                  </div>
                  <div className="overview-stat-card border-green">
                    <div>
                      <h4>Repeat Customer Rate</h4>
                      <h3 style={{ color: '#10b981' }}>{crmData.crm_summary.repeat_rate_pct}%</h3>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>{crmData.crm_summary.repeat_customers_count} Repeat Buyers</span>
                    </div>
                  </div>
                  <div className="overview-stat-card border-indigo">
                    <div>
                      <h4>Avg Customer LTV</h4>
                      <h3>₹{crmData.crm_summary.avg_customer_ltv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                  </div>
                  <div className="overview-stat-card border-amber">
                    <div>
                      <h4>At-Risk Churn Buyers</h4>
                      <h3 style={{ color: crmData.crm_summary.at_risk_count > 0 ? '#ef4444' : '#10b981' }}>{crmData.crm_summary.at_risk_count}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>Need Re-engagement Coupon</span>
                    </div>
                  </div>
                </div>

                <div className="recent-orders-table-box">
                  <h4>Customer Loyalty Directory & Churn Scores</h4>
                  <table className="recent-orders-table" style={{ marginTop: 12 }}>
                    <thead>
                      <tr>
                        <th>Customer Identifier</th>
                        <th>Preferred Category</th>
                        <th>Completed Orders</th>
                        <th>Total Spend (LTV)</th>
                        <th>Avg Order Value</th>
                        <th>Last Order Date</th>
                        <th>Loyalty Tier</th>
                        <th>Churn Risk</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crmData.customers.map(c => (
                        <tr key={c.id}>
                          <td>
                            <strong style={{ color: '#38bdf8' }}>{c.first_name}</strong> <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({c.customer_code})</span>
                            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {c.tags.map((t, idx) => (
                                <span key={idx} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td><span className="shop-tag">{c.preferred_category}</span></td>
                          <td><strong>{c.orders_count}</strong> orders</td>
                          <td style={{ color: '#22c55e', fontWeight: 'bold' }}>₹{c.total_spent.toFixed(2)}</td>
                          <td>₹{c.avg_spent.toFixed(2)}</td>
                          <td style={{ color: '#aaa', fontSize: '0.8rem' }}>{c.last_order_date} <br/><span style={{ fontSize: '0.7rem', color: '#777' }}>({c.days_since_last}d ago)</span></td>
                          <td>
                            <span className="table-status-pill" style={{ background: `${c.tier_color}22`, color: c.tier_color, border: `1px solid ${c.tier_color}` }}>
                              {c.loyalty_tier}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: c.churn_risk_pct >= 50 ? '#ef4444' : '#10b981' }}>{c.churn_risk_pct}% Risk</strong>
                          </td>
                          <td>
                            {c.dispatched_coupon ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span className="table-status-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', fontSize: '0.75rem', textAlign: 'center' }}>
                                  ✓ 15% OFF Dispatched
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center' }}>
                                  Code: <strong style={{ color: '#38bdf8' }}>{c.dispatched_coupon.code}</strong>
                                </span>
                              </div>
                            ) : (
                              <button
                                className="edit-item-btn"
                                onClick={() => handleSendCustomerOffer(c.id, 15)}
                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              >
                                🎁 Dispatch 15% Platform Coupon
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {crmData.customers.length === 0 && (
                        <tr><td colSpan="9" className="text-center text-muted" style={{ padding: 24 }}>No customer order records available yet. When buyers complete orders, business metrics and loyalty tiers will appear here.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationControls currentPage={crmPage} totalPages={crmTotalPages} onPageChange={(p) => loadCustomerCRM(p)} />
              </>
            )}
          </div>
        )}

        {activeTab === 'promotions' && (
          <div className="shop-promotions-section">
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Smart Promotions & Discount Campaign Manager</h3>
              <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Create store promo codes and launch smart dynamic price discounts for targeted inventory.</p>
            </div>

            {promotionsLoading ? (
              <div className="loading-spinner-wrap"><p>Loading store promotions...</p></div>
            ) : !promotionsData ? (
              <p>No promotion records found.</p>
            ) : (
              <>
                {/* Campaign ROI Summary Grid */}
                {promotionsData.campaign_summary && (
                  <div className="overview-stats-grid" style={{ marginBottom: 25 }}>
                    <div className="overview-stat-card border-cyan">
                      <div>
                        <h4>Active Store Coupons</h4>
                        <h3>{promotionsData.campaign_summary.total_active_coupons}</h3>
                      </div>
                    </div>
                    <div className="overview-stat-card border-green">
                      <div>
                        <h4>Total Redemptions</h4>
                        <h3 style={{ color: '#10b981' }}>{promotionsData.campaign_summary.total_redemptions} Uses</h3>
                      </div>
                    </div>
                    <div className="overview-stat-card border-indigo">
                      <div>
                        <h4>Discount Savings Offered</h4>
                        <h3>₹{promotionsData.campaign_summary.total_discount_dispatched.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                      </div>
                    </div>
                    <div className="overview-stat-card border-amber">
                      <div>
                        <h4>Campaign ROI Impact</h4>
                        <h3 style={{ color: '#f59e0b' }}>{promotionsData.campaign_summary.estimated_roi_multiplier}</h3>
                      </div>
                    </div>
                  </div>
                )}
                {/* ML Smart Recommendations */}
                {promotionsData.ml_recommendations?.length > 0 && (
                  <div className="chart-card-box" style={{ marginBottom: 25, borderLeft: '4px solid #8b5cf6' }}>
                    <h4 style={{ color: '#a78bfa' }}>Dynamic Promotion Recommendations</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginTop: 12 }}>
                      {promotionsData.ml_recommendations.map((rec, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{rec.product_name}</strong>
                          <p style={{ margin: '4px 0 8px 0', fontSize: '0.75rem', color: '#d97706' }}>Note: {rec.reason}</p>
                          <button
                            className="advance-order-action-btn"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }}
                            onClick={() => {
                              setNewPromoCode(rec.suggested_code)
                              setNewPromoDiscount(rec.suggested_discount_pct)
                            }}
                          >
                            {rec.action_label}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create Promo Code Form */}
                <div className="add-product-form-box" style={{ marginBottom: 25 }}>
                  <h4>Create New Store Coupon Code</h4>
                  <form onSubmit={handleCreatePromo} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 10 }}>
                    <div>
                      <label className="form-label">Coupon Code</label>
                      <input
                        type="text"
                        className="form-input-text"
                        placeholder="e.g. FESTIVE20"
                        value={newPromoCode}
                        onChange={e => setNewPromoCode(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Discount Value (%)</label>
                      <input
                        type="number"
                        className="form-input-text"
                        value={newPromoDiscount}
                        onChange={e => setNewPromoDiscount(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Min Order Amount (₹)</label>
                      <input
                        type="number"
                        className="form-input-text"
                        value={newPromoMinOrder}
                        onChange={e => setNewPromoMinOrder(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="add-to-inv-btn" style={{ width: '100%', padding: '10px' }}>
                        Create Coupon
                      </button>
                    </div>
                  </form>
                </div>

                {/* Active Coupons List */}
                <div className="recent-orders-table-box">
                  <h4>Active & Historic Store Coupons</h4>
                  <table className="recent-orders-table" style={{ marginTop: 12 }}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Min Order</th>
                        <th>Used Count</th>
                        <th>Valid Until</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotionsData.coupons.map(c => (
                        <tr key={c.id}>
                          <td><strong style={{ color: '#0891b2' }}>{c.code}</strong></td>
                          <td style={{ fontWeight: 'bold', color: '#16a34a' }}>{c.discount_value}% OFF</td>
                          <td>₹{c.min_order_value}</td>
                          <td>{c.used_count} times</td>
                          <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.valid_until}</td>
                          <td>
                            <span className="table-status-pill" style={{ background: c.is_active ? '#dcfce7' : '#fee2e2', color: c.is_active ? '#15803d' : '#dc2626' }}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={c.is_active ? "reject-order-action-btn" : "accept-order-action-btn"}
                              onClick={() => handleToggleCoupon(c.id)}
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              {c.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {promotionsData.coupons.length === 0 && (
                        <tr><td colSpan="7" className="text-center text-muted">No promo codes created yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="shop-growth-section">
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Merchant Growth & Tier Hub</h3>
              <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Lower commission rates, unlock featured marketplace banners, and simulate revenue expansion.</p>
            </div>

            {growthLoading ? (
              <div className="loading-spinner-wrap"><p>Calculating growth simulation...</p></div>
            ) : !growthData ? (
              <p>No growth metrics loaded.</p>
            ) : (
              <>
                {/* ML Growth Simulator Box */}
                <div className="chart-card-box" style={{ marginBottom: 25, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ color: '#0891b2' }}>Store Growth & Revenue Uplift Simulator</h4>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: '4px 0 16px 0' }}>
                    Based on your 30-day store revenue of <strong>₹{growthData.monthly_volume.toLocaleString()}</strong>, upgrading to Gold Super-Seller Tier produces:
                  </p>

                  <div className="overview-stats-grid" style={{ marginBottom: 15 }}>
                    <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Est. Monthly Commission Savings</span>
                      <h3 style={{ margin: '4px 0 0 0', color: '#16a34a' }}>+₹{growthData.ml_growth_simulator.estimated_monthly_savings.toLocaleString()}</h3>
                    </div>
                    <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Predicted Sales Uplift</span>
                      <h3 style={{ margin: '4px 0 0 0', color: '#0891b2' }}>+{growthData.ml_growth_simulator.predicted_revenue_uplift_pct}% Volume</h3>
                    </div>
                    <div style={{ background: '#ffffff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Projected Net Profit Gain</span>
                      <h3 style={{ margin: '4px 0 0 0', color: '#d97706' }}>+₹{growthData.ml_growth_simulator.predicted_net_profit_gain.toLocaleString()} / mo</h3>
                    </div>
                  </div>
                </div>

                {/* Plan Comparison Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                  {growthData.tiers.map(t => (
                    <div key={t.id} style={{ background: '#ffffff', border: t.is_current ? '2px solid #0891b2' : '1px solid #e2e8f0', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0, color: t.id === 'premium' ? '#d97706' : '#0f172a' }}>{t.name}</h3>
                          {t.is_current && <span className="shop-tag">ACTIVE PLAN</span>}
                        </div>
                        <h2 style={{ fontSize: '2rem', margin: '16px 0 8px 0', color: '#0891b2' }}>{t.commission_rate}</h2>
                        <ul style={{ paddingLeft: 20, margin: '16px 0', color: '#475569', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {t.features.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      </div>

                      {t.is_current && t.id === 'premium' && growthData.days_remaining !== null && (
                        <div style={{ marginTop: 20, padding: 12, background: '#fef3c7', borderRadius: 8, color: '#d97706', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>
                          Expires in: {growthData.days_remaining} days ({growthData.tier_expires_at})
                        </div>
                      )}

                      {!t.is_current && t.id === 'premium' && (
                        <button className="add-to-inv-btn" onClick={handleUpgradeTier} style={{ width: '100%', marginTop: 20, padding: 12, fontWeight: 'bold' }}>
                          Pay ₹{growthData.upgrade_cost || 5000} to Activate Gold (30 Days)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="shop-settings-section">
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Shop Operating Profile & Settings</h3>
              <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Manage store address, operating hours, delivery parameters, and payout bank accounts.</p>
            </div>

            {settingsLoading ? (
              <div className="loading-spinner-wrap"><p>Loading store settings...</p></div>
            ) : !settingsData ? (
              <p>No settings data loaded.</p>
            ) : (
              <form onSubmit={handleSaveSettings} className="add-product-form-box" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* AI Operating Hours Widget */}
                {settingsData.ml_recommended_hours && (
                  <div style={{ background: '#ecfeff', padding: 12, borderRadius: 8, borderLeft: '4px solid #0891b2' }}>
                    <strong style={{ color: '#0891b2', fontSize: '0.85rem' }}>Smart Locality Hours Optimizer:</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#334155' }}>
                      {settingsData.ml_recommended_hours.reason}. Suggested operating hours: <strong>{settingsData.ml_recommended_hours.recommended_open} - {settingsData.ml_recommended_hours.recommended_close}</strong>.
                    </p>
                  </div>
                )}

                {/* Live Inventory Priority Information Block */}
                <div className="modal-span-2" style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Live Inventory Status</strong>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        Live Inventory auto-assigns orders with no confirmation delay and reduces platform commission to 5%.
                      </p>
                    </div>
                    <span style={{
                      background: settingsData.live_inventory ? '#dcfce7' : '#f1f5f9',
                      color: settingsData.live_inventory ? '#15803d' : '#475569',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      border: `1px solid ${settingsData.live_inventory ? '#86efac' : '#cbd5e1'}`
                    }}>
                      {settingsData.live_inventory ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                <div className="modal-grid-form">
                  <div className="modal-span-2">
                    <label className="form-label">Store Name</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.name || ''}
                      onChange={e => setSettingsData({ ...settingsData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Shop Category / Type</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.shop_type || ''}
                      onChange={e => setSettingsData({ ...settingsData, shop_type: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Area Locality</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.area || ''}
                      onChange={e => setSettingsData({ ...settingsData, area: e.target.value })}
                    />
                  </div>

                  <div className="modal-span-2">
                    <label className="form-label">Full Street Address</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.address || ''}
                      onChange={e => setSettingsData({ ...settingsData, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Opening Time</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.opening_time || ''}
                      onChange={e => setSettingsData({ ...settingsData, opening_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Closing Time</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.closing_time || ''}
                      onChange={e => setSettingsData({ ...settingsData, closing_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Delivery Radius (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input-text"
                      value={settingsData.delivery_radius_km || 5.0}
                      onChange={e => setSettingsData({ ...settingsData, delivery_radius_km: e.target.value })}
                    />
                  </div>

                  <div className="modal-span-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 8 }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#a78bfa' }}>📜 Legal & Business Compliance</h4>
                  </div>

                  <div>
                    <label className="form-label">GST Identification Number (GSTIN)</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. 24AAACG1234F1Z5"
                      value={settingsData.gst_number || ''}
                      onChange={e => setSettingsData({ ...settingsData, gst_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">FSSAI Food License Number</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. 10020021000123"
                      value={settingsData.fssai_license || ''}
                      onChange={e => setSettingsData({ ...settingsData, fssai_license: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Trade / Municipal License</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.trade_license || ''}
                      onChange={e => setSettingsData({ ...settingsData, trade_license: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Free Delivery Threshold (₹)</label>
                    <input
                      type="number"
                      className="form-input-text"
                      value={settingsData.free_delivery_above || 500}
                      onChange={e => setSettingsData({ ...settingsData, free_delivery_above: e.target.value })}
                    />
                  </div>

                  <div className="modal-span-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginTop: 8 }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#38bdf8' }}>Payout & Bank Account Configuration</h4>
                  </div>

                  <div>
                    <label className="form-label">Account Holder Name</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.bank_account_name || ''}
                      onChange={e => setSettingsData({ ...settingsData, bank_account_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Bank Account Number</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.bank_account_number || ''}
                      onChange={e => setSettingsData({ ...settingsData, bank_account_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Bank IFSC Code</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.bank_ifsc || ''}
                      onChange={e => setSettingsData({ ...settingsData, bank_ifsc: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Settlement UPI ID</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={settingsData.upi_id || ''}
                      onChange={e => setSettingsData({ ...settingsData, upi_id: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="add-to-inv-btn" disabled={settingsSaving} style={{ padding: '12px 24px', alignSelf: 'flex-start', marginTop: 10 }}>
                  {settingsSaving ? 'Saving Changes...' : '💾 Save Store Profile Settings'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
      
      {/* Edit Inventory Modal */}
      {editingItem && createPortal(
        <div className="modal-backdrop" onClick={() => setEditingItem(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Inventory Item</h3>
              <button className="modal-close-btn" onClick={() => setEditingItem(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="modal-grid-form">
                  <div className="modal-span-2">
                    <label className="form-label">Product Name</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={editingItem.name || ''}
                      onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Brand</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={editingItem.brand || ''}
                      onChange={e => setEditingItem({ ...editingItem, brand: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Display Unit (Qty Label)</label>
                    <input
                      type="text"
                      className="form-input-text"
                      value={editingItem.quantity_label || ''}
                      onChange={e => setEditingItem({ ...editingItem, quantity_label: e.target.value })}
                      placeholder="e.g. 500 ml, 1 kg, pack of 3"
                    />
                  </div>

                  <div>
                    <label className="form-label">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input-text"
                      value={editingItem.price || 0}
                      onChange={e => setEditingItem({ ...editingItem, price: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Current Stock</label>
                    <input
                      type="number"
                      className="form-input-text"
                      value={editingItem.stock || 0}
                      onChange={e => setEditingItem({ ...editingItem, stock: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Min Stock (Reorder Alert)</label>
                    <input
                      type="number"
                      className="form-input-text"
                      value={editingItem.min_stock || 0}
                      onChange={e => setEditingItem({ ...editingItem, min_stock: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Max Stock Limit</label>
                    <input
                      type="number"
                      className="form-input-text"
                      value={editingItem.max_stock || 0}
                      onChange={e => setEditingItem({ ...editingItem, max_stock: e.target.value })}
                      required
                    />
                  </div>

                  <div className="modal-span-2">
                    <label className="form-label">Expiry Date</label>
                    <input
                      type="date"
                      className="form-input-text"
                      value={editingItem.expiry_date || ''}
                      onChange={e => setEditingItem({ ...editingItem, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-cancel-btn" onClick={() => setEditingItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="modal-save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ShopDashboard
