import { useState, useEffect, useCallback } from 'react'
import { fetchJson } from '../../api/api'
import './AdminDashboard.css'

export default function AdminDashboard() {

  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Data States
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [shops, setShops] = useState([])
  const [riders, setRiders] = useState([])
  const [users, setUsers] = useState([])

  // Orders Pagination & Filter States
  const [orderPage, setOrderPage] = useState(1)
  const [orderTotalCount, setOrderTotalCount] = useState(0)
  const [orderTotalPages, setOrderTotalPages] = useState(1)
  
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [orderFulfillmentFilter, setOrderFulfillmentFilter] = useState('')
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState('')
  const [orderShopFilter, setOrderShopFilter] = useState('')
  const [orderSortBy, setOrderSortBy] = useState('latest') // 'latest', 'oldest', 'highest_amount', 'lowest_amount'

  // Other Tabs Search States
  const [shopSearch, setShopSearch] = useState('')
  const [shopTierFilter, setShopTierFilter] = useState('')
  const [riderSearch, setRiderSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // Edit Modals
  const [modalType, setModalType] = useState(null) // 'order', 'shop', 'rider', 'user'
  const [editItem, setEditItem] = useState(null)

  // Auth is handled by AdminRoute in AppRoutes — no need to redirect here

  // Fetch Dashboard Stats, Shops, Riders, Users
  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [statsData, shopsData, ridersData, usersData] = await Promise.all([
        fetchJson('/admin/dashboard-stats/'),
        fetchJson('/admin/shops/'),
        fetchJson('/admin/riders/'),
        fetchJson('/admin/users/'),
      ])

      if (statsData) setStats(statsData)
      setShops(Array.isArray(shopsData) ? shopsData : [])
      setRiders(Array.isArray(ridersData) ? ridersData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (err) {
      console.error('Failed to load initial admin data', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Orders with Server-side Pagination & Sorting (25 items per page)
  const fetchOrders = useCallback(async (page = 1) => {
    setOrdersLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: page,
        page_size: 25,
        sort_by: orderSortBy,
      })

      if (orderSearch) queryParams.append('search', orderSearch)
      if (orderStatusFilter) queryParams.append('status', orderStatusFilter)
      if (orderFulfillmentFilter) queryParams.append('fulfillment', orderFulfillmentFilter)
      if (orderPaymentStatusFilter) queryParams.append('payment_status', orderPaymentStatusFilter)
      if (orderShopFilter) queryParams.append('shop_id', orderShopFilter)

      const res = await fetchJson(`/admin/orders/?${queryParams.toString()}`)
      
      if (res && res.results) {
        setOrders(res.results)
        setOrderTotalCount(res.count || 0)
        setOrderTotalPages(res.total_pages || 1)
        setOrderPage(res.current_page || page)
      } else if (Array.isArray(res)) {
        setOrders(res)
        setOrderTotalCount(res.length)
        setOrderTotalPages(1)
        setOrderPage(1)
      }
    } catch (err) {
      console.error('Failed to fetch admin orders', err)
    } finally {
      setOrdersLoading(false)
    }
  }, [orderSearch, orderStatusFilter, orderFulfillmentFilter, orderPaymentStatusFilter, orderShopFilter, orderSortBy])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'overview') {
      fetchOrders(1)
    }
  }, [activeTab, fetchOrders])

  // Order Handlers
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await fetchJson(`/admin/orders/${orderId}/`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      fetchOrders(orderPage)
      loadInitialData()
    } catch (e) {
      alert('Failed to update order status')
    }
  }

  const handleAssignRider = async (orderId, riderId) => {
    try {
      await fetchJson(`/admin/orders/${orderId}/`, {
        method: 'PUT',
        body: JSON.stringify({ rider_id: riderId })
      })
      fetchOrders(orderPage)
    } catch (e) {
      alert('Failed to assign rider')
    }
  }

  // Shop Handlers
  const handleToggleShopLive = async (shop) => {
    try {
      await fetchJson(`/admin/shops/${shop.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ live_inventory: !shop.live_inventory })
      })
      loadInitialData()
    } catch (e) {
      alert('Failed to toggle live inventory')
    }
  }

  const handleToggleShopOpen = async (shop) => {
    try {
      await fetchJson(`/admin/shops/${shop.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ is_open: !shop.is_open })
      })
      loadInitialData()
    } catch (e) {
      alert('Failed to toggle open status')
    }
  }

  const handleDeleteShop = async (shopId) => {
    if (!window.confirm(`Are you sure you want to delete Shop #${shopId}?`)) return
    try {
      await fetchJson(`/admin/shops/${shopId}/`, { method: 'DELETE' })
      loadInitialData()
    } catch (e) {
      alert('Failed to delete shop')
    }
  }

  // Rider Handlers
  const handleToggleRiderOnline = async (rider) => {
    try {
      await fetchJson(`/admin/riders/${rider.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ is_online: !rider.is_online })
      })
      loadInitialData()
    } catch (e) {
      alert('Failed to toggle rider status')
    }
  }

  const handleDeleteRider = async (riderId) => {
    if (!window.confirm(`Are you sure you want to delete Rider #${riderId}?`)) return
    try {
      await fetchJson(`/admin/riders/${riderId}/`, { method: 'DELETE' })
      loadInitialData()
    } catch (e) {
      alert('Failed to delete rider')
    }
  }

  // User Handlers
  const handleToggleStaff = async (u) => {
    try {
      await fetchJson(`/admin/users/${u.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ is_staff: !u.is_staff })
      })
      loadInitialData()
    } catch (e) {
      alert('Failed to update staff status')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to delete User #${userId}?`)) return
    try {
      await fetchJson(`/admin/users/${userId}/`, { method: 'DELETE' })
      loadInitialData()
    } catch (e) {
      alert('Failed to delete user')
    }
  }

  // Save Modal Form Changes
  const handleSaveModal = async (e) => {
    e.preventDefault()
    if (!editItem || !modalType) return

    try {
      if (modalType === 'order') {
        await fetchJson(`/admin/orders/${editItem.id}/`, {
          method: 'PUT',
          body: JSON.stringify(editItem)
        })
        fetchOrders(orderPage)
      } else if (modalType === 'shop') {
        if (editItem.id) {
          await fetchJson(`/admin/shops/${editItem.id}/`, {
            method: 'PUT',
            body: JSON.stringify(editItem)
          })
        } else {
          await fetchJson('/admin/shops/', {
            method: 'POST',
            body: JSON.stringify(editItem)
          })
        }
        loadInitialData()
      } else if (modalType === 'rider') {
        if (editItem.id) {
          await fetchJson(`/admin/riders/${editItem.id}/`, {
            method: 'PUT',
            body: JSON.stringify(editItem)
          })
        } else {
          await fetchJson('/admin/riders/', {
            method: 'POST',
            body: JSON.stringify(editItem)
          })
        }
        loadInitialData()
      } else if (modalType === 'user') {
        if (editItem.id) {
          await fetchJson(`/admin/users/${editItem.id}/`, {
            method: 'PUT',
            body: JSON.stringify(editItem)
          })
        } else {
          await fetchJson('/admin/users/', {
            method: 'POST',
            body: JSON.stringify(editItem)
          })
        }
        loadInitialData()
      }

      setModalType(null)
      setEditItem(null)
    } catch (err) {
      alert('Failed to save changes: ' + (err.message || 'Error occurred'))
    }
  }

  // Filtered lists for Shops, Riders, Users
  const filteredShops = shops.filter(s => {
    const matchTier = !shopTierFilter || s.tier === shopTierFilter
    const matchSearch = !shopSearch || 
      s.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(shopSearch.toLowerCase()))
    return matchTier && matchSearch
  })

  const filteredRiders = riders.filter(r => {
    return !riderSearch || 
      (r.full_name && r.full_name.toLowerCase().includes(riderSearch.toLowerCase())) ||
      (r.phone && r.phone.includes(riderSearch)) ||
      (r.username && r.username.toLowerCase().includes(riderSearch.toLowerCase()))
  })

  const filteredUsers = users.filter(u => {
    return !userSearch || 
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  })

  return (
    <div className="admin-dashboard-page fade-in">
      <div className="container">
        {/* Header Banner */}
        <div className="admin-header-banner">
          <div className="admin-header-title">
            <h1>
              DigiBazaar Core Administration
              <span className="admin-role-badge">SuperAdmin Control</span>
            </h1>
            <p>Platform Operations, Database Records, Stack-based Orders & Partner Management (Phone: 9111111111)</p>
          </div>
          <div className="admin-header-controls">
            <button className="admin-refresh-btn" onClick={() => { loadInitialData(); fetchOrders(orderPage); }}>
              Refresh System
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="admin-nav-tabs">
          <button 
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Platform Overview
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders Database ({orderTotalCount.toLocaleString()})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'shops' ? 'active' : ''}`}
            onClick={() => setActiveTab('shops')}
          >
            Shops ({shops.length})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'riders' ? 'active' : ''}`}
            onClick={() => setActiveTab('riders')}
          >
            Riders ({riders.length})
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Accounts ({users.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <h3>Connecting to DigiBazaar Core Database...</h3>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <div className="admin-metrics-grid">
                  <div className="admin-metric-card cyan">
                    <span className="metric-label">Total Revenue</span>
                    <h3>₹{stats?.total_revenue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</h3>
                    <p className="metric-sub">Platform total completed sales</p>
                  </div>
                  <div className="admin-metric-card green">
                    <span className="metric-label">Total Orders</span>
                    <h3>{stats?.total_orders?.toLocaleString() || 0}</h3>
                    <p className="metric-sub">{stats?.completed_orders || 0} completed · {stats?.pending_orders || 0} pending</p>
                  </div>
                  <div className="admin-metric-card indigo">
                    <span className="metric-label">Merchant Shops</span>
                    <h3>{stats?.total_shops || 0}</h3>
                    <p className="metric-sub">{stats?.open_shops || 0} open right now</p>
                  </div>
                  <div className="admin-metric-card amber">
                    <span className="metric-label">Express Riders</span>
                    <h3>{stats?.total_riders || 0}</h3>
                    <p className="metric-sub">{stats?.online_riders || 0} active online</p>
                  </div>
                  <div className="admin-metric-card purple">
                    <span className="metric-label">Registered Users</span>
                    <h3>{stats?.total_users || 0}</h3>
                    <p className="metric-sub">{stats?.total_products || 0} marketplace products</p>
                  </div>
                </div>

                {/* Status breakdown grid */}
                {stats?.status_counts && (
                  <div className="admin-table-card" style={{ padding: '24px', marginBottom: '28px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>Order Lifecycle Breakdown</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                      {Object.entries(stats.status_counts).map(([st, count]) => (
                        <div key={st} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <span className={`status-pill ${st}`}>{st.replace('_', ' ')}</span>
                          <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px', color: '#0f172a' }}>{count.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latest Activity Stream */}
                <div className="admin-table-card">
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Latest Orders Stream (Newest First)</h3>
                    <button className="btn-icon-edit" onClick={() => setActiveTab('orders')}>View All Orders Database →</button>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Shop Name</th>
                          <th>Grand Total</th>
                          <th>Fulfillment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.recent_orders?.map(o => (
                          <tr key={o.id}>
                            <td><strong>#{o.id}</strong></td>
                            <td>{o.user_name || 'Customer'}</td>
                            <td>{o.shop_name || 'Shop'}</td>
                            <td><strong>₹{parseFloat(o.total_amount || o.total_price || 0).toFixed(2)}</strong></td>
                            <td>{o.fulfillment_option?.replace('_', ' ')}</td>
                            <td><span className={`status-pill ${o.status}`}>{o.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ORDERS DATABASE (PAGINATED 25 PER PAGE, SORTABLE, SEARCHABLE) */}
            {activeTab === 'orders' && (
              <div>
                {/* Advanced Search & Multi-Filter Controls */}
                <div className="admin-table-controls">
                  <div className="admin-search-wrapper">
                    <input 
                      type="text" 
                      className="admin-search-input"
                      placeholder="Search order ID, customer name, shop name, address..." 
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                    />
                  </div>

                  {/* Status Filter */}
                  <select 
                    className="admin-filter-select"
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {/* Fulfillment Filter */}
                  <select 
                    className="admin-filter-select"
                    value={orderFulfillmentFilter}
                    onChange={e => setOrderFulfillmentFilter(e.target.value)}
                  >
                    <option value="">All Fulfillment Modes</option>
                    <option value="digibazaar_delivery">Express Delivery</option>
                    <option value="shop_delivery">Shop Delivery</option>
                    <option value="pickup">Store Pickup</option>
                  </select>

                  {/* Payment Status Filter */}
                  <select 
                    className="admin-filter-select"
                    value={orderPaymentStatusFilter}
                    onChange={e => setOrderPaymentStatusFilter(e.target.value)}
                  >
                    <option value="">All Payment Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending Payment</option>
                  </select>

                  {/* Shop Filter */}
                  <select 
                    className="admin-filter-select"
                    value={orderShopFilter}
                    onChange={e => setOrderShopFilter(e.target.value)}
                  >
                    <option value="">All Shops</option>
                    {shops.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  {/* Stack Sort Order */}
                  <select 
                    className="admin-filter-select"
                    style={{ fontWeight: 'bold', background: '#ecfeff', borderColor: '#0891b2', color: '#0891b2' }}
                    value={orderSortBy}
                    onChange={e => setOrderSortBy(e.target.value)}
                  >
                    <option value="latest">Latest First (Newest Stack)</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest_amount">Highest Amount</option>
                    <option value="lowest_amount">Lowest Amount</option>
                  </select>
                </div>

                {/* Orders Table with Pagination Header */}
                <div className="admin-table-card">
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                      Showing Page {orderPage} of {orderTotalPages} ({orderTotalCount.toLocaleString()} Total Orders)
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      25 Orders per page
                    </span>
                  </div>

                  {ordersLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      Loading orders page {orderPage}...
                    </div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Shop</th>
                            <th>Items</th>
                            <th>Fulfillment</th>
                            <th>Contact Numbers</th>
                            <th>Payment</th>
                            <th>Grand Total</th>
                            <th>Status Update</th>
                            <th>Assign Rider</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id}>
                              <td><strong>#{o.id}</strong></td>
                              <td>
                                <div><strong>{o.user_name || 'Customer'}</strong></div>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{o.delivery_address?.slice(0, 25)}...</span>
                              </td>
                              <td>
                                <strong>{o.shop_name}</strong>
                                {o.shop_address && <div style={{fontSize:'11px', color:'#64748b'}}>{o.shop_address?.slice(0,30)}</div>}
                              </td>
                              <td>{o.items?.length || 1} items</td>
                              <td>{o.fulfillment_option?.replace(/_/g, ' ')}</td>
                              <td style={{fontSize:'12px', minWidth: '160px'}}>
                                <div style={{display:'flex', flexDirection:'column', gap:2}}>
                                  {o.user_phone && <span>👤 Cust: <strong>{o.user_phone}</strong></span>}
                                  {o.shop_phone && <span>🏪 Shop: <strong>{o.shop_phone}</strong></span>}
                                  {o.rider_phone && <span>🛵 Rider: <strong>{o.rider_phone}</strong></span>}
                                  {!o.user_phone && !o.shop_phone && !o.rider_phone && <span style={{color:'#94a3b8'}}>—</span>}
                                </div>
                              </td>
                              <td><strong style={{ fontSize: '14px', color: '#0f172a' }}>₹{parseFloat(o.total_amount || o.total_price || 0).toFixed(2)}</strong></td>
                              <td>
                                <select 
                                  className="admin-filter-select"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  value={o.status}
                                  onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="preparing">Preparing</option>
                                  <option value="ready">Ready</option>
                                  <option value="picked_up">Picked Up</option>
                                  <option value="out_for_delivery">Out for Delivery</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td>
                                <select 
                                  className="admin-filter-select"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  value={o.rider || ''}
                                  onChange={e => handleAssignRider(o.id, e.target.value)}
                                >
                                  <option value="">Assign Rider...</option>
                                  {riders.map(r => (
                                    <option key={r.id} value={r.id}>
                                      {r.full_name || r.username} ({r.is_online ? 'Online' : 'Offline'})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <div className="action-btn-group">
                                  <button 
                                    className="btn-icon-edit"
                                    onClick={() => { setModalType('order'); setEditItem({ ...o }); }}
                                  >
                                    Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Footer Controls */}
                  <div className="admin-pagination">
                    <button 
                      className="pagination-btn"
                      disabled={orderPage <= 1 || ordersLoading}
                      onClick={() => fetchOrders(orderPage - 1)}
                    >
                      ← Previous Page
                    </button>
                    <div className="pagination-info">
                      Page <strong>{orderPage}</strong> of <strong>{orderTotalPages}</strong>
                    </div>
                    <button 
                      className="pagination-btn"
                      disabled={orderPage >= orderTotalPages || ordersLoading}
                      onClick={() => fetchOrders(orderPage + 1)}
                    >
                      Next Page →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SHOPS MANAGER */}
            {activeTab === 'shops' && (
              <div>
                <div className="admin-table-controls">
                  <div className="admin-search-wrapper">
                    <input 
                      type="text" 
                      className="admin-search-input"
                      placeholder="Search shop name, address, area..." 
                      value={shopSearch}
                      onChange={e => setShopSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="admin-filter-select"
                    value={shopTierFilter}
                    onChange={e => setShopTierFilter(e.target.value)}
                  >
                    <option value="">All Tiers</option>
                    <option value="free">Free Tier</option>
                    <option value="premium">Premium Tier</option>
                  </select>
                  <button 
                    className="admin-add-btn"
                    onClick={() => {
                      setModalType('shop')
                      setEditItem({ name: '', tier: 'free', rating: '4.5', live_inventory: true, is_open: true, address: 'Ahmedabad' })
                    }}
                  >
                    + Add New Shop
                  </button>
                </div>

                <div className="admin-table-card">
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Shop Name</th>
                          <th>Tier</th>
                          <th>Rating</th>
                          <th>Live Inventory</th>
                          <th>Is Open</th>
                          <th>Address</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredShops.map(s => (
                          <tr key={s.id}>
                            <td><strong>#{s.id}</strong></td>
                            <td><strong>{s.name}</strong></td>
                            <td>
                              <span style={{ 
                                background: s.tier === 'premium' ? '#fef3c7' : '#f1f5f9',
                                color: s.tier === 'premium' ? '#b45309' : '#475569',
                                padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
                              }}>
                                {s.tier?.toUpperCase()}
                              </span>
                            </td>
                            <td>Rating: {parseFloat(s.rating || 0).toFixed(1)}</td>
                            <td>
                              <button 
                                style={{
                                  background: s.live_inventory ? '#d1fae5' : '#fee2e2',
                                  color: s.live_inventory ? '#047857' : '#b91c1c',
                                  border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                                onClick={() => handleToggleShopLive(s)}
                              >
                                {s.live_inventory ? 'Live (Auto)' : 'Manual'}
                              </button>
                            </td>
                            <td>
                              <button 
                                style={{
                                  background: s.is_open !== false ? '#d1fae5' : '#fee2e2',
                                  color: s.is_open !== false ? '#047857' : '#b91c1c',
                                  border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                                onClick={() => handleToggleShopOpen(s)}
                              >
                                {s.is_open !== false ? 'OPEN' : 'CLOSED'}
                              </button>
                            </td>
                            <td>{s.address}</td>
                            <td>
                              <div className="action-btn-group">
                                <button 
                                  className="btn-icon-edit"
                                  onClick={() => { setModalType('shop'); setEditItem({ ...s }); }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn-icon-delete"
                                  onClick={() => handleDeleteShop(s.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: RIDERS MANAGER */}
            {activeTab === 'riders' && (
              <div>
                <div className="admin-table-controls">
                  <div className="admin-search-wrapper">
                    <input 
                      type="text" 
                      className="admin-search-input"
                      placeholder="Search rider full name, phone, vehicle..." 
                      value={riderSearch}
                      onChange={e => setRiderSearch(e.target.value)}
                    />
                  </div>
                  <button 
                    className="admin-add-btn"
                    onClick={() => {
                      setModalType('rider')
                      setEditItem({ full_name: '', phone: '', vehicle_type: 'Motorcycle', vehicle_number: '', rating: '5.0', is_online: true })
                    }}
                  >
                    + Add New Rider
                  </button>
                </div>

                <div className="admin-table-card">
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Full Name</th>
                          <th>Phone</th>
                          <th>Vehicle Type</th>
                          <th>Vehicle Number</th>
                          <th>Online Status</th>
                          <th>Rating</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRiders.map(r => (
                          <tr key={r.id}>
                            <td><strong>#{r.id}</strong></td>
                            <td><strong>{r.full_name || r.username}</strong></td>
                            <td>{r.phone}</td>
                            <td>{r.vehicle_type || 'Motorcycle'}</td>
                            <td>{r.vehicle_number || 'GJ-01-HA-9876'}</td>
                            <td>
                              <button 
                                style={{
                                  background: r.is_online ? '#d1fae5' : '#fee2e2',
                                  color: r.is_online ? '#047857' : '#b91c1c',
                                  border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                                onClick={() => handleToggleRiderOnline(r)}
                              >
                                {r.is_online ? 'ONLINE' : 'OFFLINE'}
                              </button>
                            </td>
                            <td>Rating: {parseFloat(r.rating || 5.0).toFixed(1)}</td>
                            <td>
                              <div className="action-btn-group">
                                <button 
                                  className="btn-icon-edit"
                                  onClick={() => { setModalType('rider'); setEditItem({ ...r }); }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn-icon-delete"
                                  onClick={() => handleDeleteRider(r.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: USERS MANAGER */}
            {activeTab === 'users' && (
              <div>
                <div className="admin-table-controls">
                  <div className="admin-search-wrapper">
                    <input 
                      type="text" 
                      className="admin-search-input"
                      placeholder="Search username or email..." 
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                  </div>
                  <button 
                    className="admin-add-btn"
                    onClick={() => {
                      setModalType('user')
                      setEditItem({ username: '', email: '', is_staff: false })
                    }}
                  >
                    + Create User Account
                  </button>
                </div>

                <div className="admin-table-card">
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Staff Privileges</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id}>
                            <td><strong>#{u.id}</strong></td>
                            <td><strong>{u.username}</strong></td>
                            <td>{u.email || 'N/A'}</td>
                            <td>
                              <span style={{
                                background: u.role === 'admin' ? '#e0e7ff' : (u.role === 'shopowner' ? '#fef3c7' : '#f1f5f9'),
                                color: u.role === 'admin' ? '#4338ca' : (u.role === 'shopowner' ? '#b45309' : '#475569'),
                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
                              }}>
                                {u.role?.toUpperCase() || 'CUSTOMER'}
                              </span>
                            </td>
                            <td>
                              <button 
                                style={{
                                  background: u.is_staff ? '#d1fae5' : '#f1f5f9',
                                  color: u.is_staff ? '#047857' : '#64748b',
                                  border: 'none', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                                onClick={() => handleToggleStaff(u)}
                              >
                                {u.is_staff ? 'STAFF' : 'STANDARD'}
                              </button>
                            </td>
                            <td>
                              <div className="action-btn-group">
                                <button 
                                  className="btn-icon-edit"
                                  onClick={() => { setModalType('user'); setEditItem({ ...u }); }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn-icon-delete"
                                  onClick={() => handleDeleteUser(u.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* LIGHT EDIT MODAL */}
      {modalType && editItem && (
        <div className="admin-modal-overlay" onClick={() => setModalType(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editItem.id ? `Edit ${modalType.toUpperCase()} #${editItem.id}` : `Add New ${modalType.toUpperCase()}`}</h3>
              <button className="admin-modal-close" onClick={() => setModalType(null)}>✕</button>
            </div>
            
            <form onSubmit={handleSaveModal}>
              <div className="admin-modal-body">
                {/* ORDER MODAL */}
                {modalType === 'order' && (
                  <>
                    <div className="admin-form-group">
                      <label>Status</label>
                      <select 
                        value={editItem.status}
                        onChange={e => setEditItem({ ...editItem, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="picked_up">Picked Up</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label>Fulfillment Option</label>
                      <select 
                        value={editItem.fulfillment_option}
                        onChange={e => setEditItem({ ...editItem, fulfillment_option: e.target.value })}
                      >
                        <option value="digibazaar_delivery">DigiBazaar Express</option>
                        <option value="shop_delivery">Shop Delivery</option>
                        <option value="pickup">Store Pickup</option>
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label>Grand Total Amount (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={editItem.total_amount || editItem.total_price || ''} 
                        onChange={e => setEditItem({ ...editItem, total_amount: e.target.value })}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Delivery Address</label>
                      <input 
                        type="text" 
                        value={editItem.delivery_address || ''} 
                        onChange={e => setEditItem({ ...editItem, delivery_address: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* SHOP MODAL */}
                {modalType === 'shop' && (
                  <>
                    <div className="admin-form-group">
                      <label>Shop Name</label>
                      <input 
                        type="text" 
                        value={editItem.name || ''} 
                        onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Tier</label>
                      <select 
                        value={editItem.tier || 'free'}
                        onChange={e => setEditItem({ ...editItem, tier: e.target.value })}
                      >
                        <option value="free">Free Tier</option>
                        <option value="premium">Premium Tier</option>
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label>Rating (0.0 to 5.0)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={editItem.rating || ''} 
                        onChange={e => setEditItem({ ...editItem, rating: e.target.value })}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Address</label>
                      <input 
                        type="text" 
                        value={editItem.address || ''} 
                        onChange={e => setEditItem({ ...editItem, address: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* RIDER MODAL */}
                {modalType === 'rider' && (
                  <>
                    <div className="admin-form-group">
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        value={editItem.full_name || ''} 
                        onChange={e => setEditItem({ ...editItem, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Phone Number</label>
                      <input 
                        type="text" 
                        value={editItem.phone || ''} 
                        onChange={e => setEditItem({ ...editItem, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Vehicle Type</label>
                      <input 
                        type="text" 
                        value={editItem.vehicle_type || 'Motorcycle'} 
                        onChange={e => setEditItem({ ...editItem, vehicle_type: e.target.value })}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Vehicle License Plate</label>
                      <input 
                        type="text" 
                        value={editItem.vehicle_number || ''} 
                        onChange={e => setEditItem({ ...editItem, vehicle_number: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* USER MODAL */}
                {modalType === 'user' && (
                  <>
                    <div className="admin-form-group">
                      <label>Username</label>
                      <input 
                        type="text" 
                        value={editItem.username || ''} 
                        onChange={e => setEditItem({ ...editItem, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        value={editItem.email || ''} 
                        onChange={e => setEditItem({ ...editItem, email: e.target.value })}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>New Password (Optional)</label>
                      <input 
                        type="password" 
                        placeholder="Leave blank to keep existing password"
                        value={editItem.password || ''} 
                        onChange={e => setEditItem({ ...editItem, password: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-cancel" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="admin-btn-save">Save Database Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
