import { BrowserRouter as Router, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import AppRoutes from './routes/AppRoutes'
import Cart from './components/Cart/Cart'
import './App.css'
import { fetchJson } from './api/api'

// ── 1. CUSTOMER NAVBAR (TEXT ONLY) ──
function CustomerNavbar() {
  const { user, logout, isLoggedIn } = useAuth()
  const { itemCount, setIsOpen } = useCart()
  const navigate = useNavigate()
  
  // Location States
  const [address, setAddress] = useState(
    localStorage.getItem('delivery_address') || '102, Patel Residency, Paldi, Ahmedabad, Gujarat - 380007'
  )
  const [savedAddresses, setSavedAddresses] = useState(
    JSON.parse(localStorage.getItem('saved_addresses')) || [
      '102, Patel Residency, Paldi, Ahmedabad, Gujarat - 380007',
      'NID Campus Hostel Block B, Paldi, Ahmedabad - 380007'
    ]
  )
  const [locationOpen, setLocationOpen] = useState(false)
  const [newAddressText, setNewAddressText] = useState('')
  const [detecting, setDetecting] = useState(false)
  
  // Search States
  const [searchVal, setSearchVal] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  
  // Profile Popover States
  const [profileOpen, setProfileOpen] = useState(false)
  
  const locRef = useRef(null)
  const searchRef = useRef(null)
  const profileRef = useRef(null)

  // Autocomplete Suggestions List
  const suggestionList = [
    { text: 'Milk', type: 'Product' },
    { text: 'Amul Butter', type: 'Product' },
    { text: 'Fresh Vegetables', type: 'Category' },
    { text: 'Patel Dairy', type: 'Shop' },
    { text: 'Medical Store', type: 'Shop' },
    { text: 'Eggs', type: 'Product' },
    { text: 'Fresh Bread', type: 'Product' },
    { text: 'Apples', type: 'Product' },
    { text: 'Banana', type: 'Product' },
    { text: 'Aloe Vera Shampoo', type: 'Product' }
  ]

  // Filtered Suggestions
  const filteredSuggestions = searchVal.trim() === ''
    ? suggestionList.slice(0, 5)
    : suggestionList.filter(s => s.text.toLowerCase().includes(searchVal.toLowerCase()))

  // Detect clicks outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (locRef.current && !locRef.current.contains(event.target)) {
        setLocationOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchFocused(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Detect Location
  const handleDetectLocation = () => {
    setDetecting(true)
    setTimeout(() => {
      const detected = '7B, Paldi Cross Roads, Ahmedabad, Gujarat - 380007'
      localStorage.setItem('delivery_address', detected)
      setAddress(detected)
      setDetecting(false)
      setLocationOpen(false)
      window.dispatchEvent(new Event('addressUpdated'))
    }, 1200)
  }

  // Select Address
  const handleSelectAddress = (addr) => {
    localStorage.setItem('delivery_address', addr)
    setAddress(addr)
    setLocationOpen(false)
    window.dispatchEvent(new Event('addressUpdated'))
  }

  // Add Address
  const handleAddAddress = () => {
    if (newAddressText.trim()) {
      const newList = [...savedAddresses, newAddressText.trim()]
      setSavedAddresses(newList)
      localStorage.setItem('saved_addresses', JSON.stringify(newList))
      localStorage.setItem('delivery_address', newAddressText.trim())
      setAddress(newAddressText.trim())
      setNewAddressText('')
      setLocationOpen(false)
      window.dispatchEvent(new Event('addressUpdated'))
    }
  }

  // Click Suggestion
  const handleSelectSuggestion = (text) => {
    setSearchVal(text)
    setSearchFocused(false)
    navigate(`/products?q=${text}`)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearchFocused(false)
    if (searchVal.trim()) {
      navigate(`/products?q=${searchVal.trim()}`)
    } else {
      navigate('/products')
    }
  }

  return (
    <header className="customer-navbar">
      {/* Left Logo */}
      <Link to="/" className="customer-nav-logo" style={{ textDecoration: 'none' }}>
        <span>DigiBazaar</span>
      </Link>

      {/* Middle Search Bar with Suggestions Popover */}
      <div className="nav-search-container" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper">
          <input
            type="text"
            className="nav-search-input"
            style={{ paddingLeft: '16px' }}
            placeholder="Search products, category, shop, brand..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onFocus={() => setSearchFocused(true)}
          />
        </form>

        {searchFocused && (
          <div className="search-suggestions-dropdown">
            <div className="suggestion-header">
              {searchVal.trim() === '' ? 'Try Searching For' : 'Matching Results'}
            </div>
            {filteredSuggestions.map((s, idx) => (
              <div 
                key={idx} 
                className="suggestion-item" 
                onClick={() => handleSelectSuggestion(s.text)}
              >
                <span>{s.text}</span>
                <span className="suggestion-match-type">{s.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="customer-nav-actions">
        {/* Location Selector */}
        <div className="nav-location-selector" onClick={() => setLocationOpen(!locationOpen)} ref={locRef}>
          <span style={{ marginRight: '4px' }}>Deliver:</span>
          <span className="location-address-txt">{address}</span>
          <span style={{ fontSize: '9px', marginLeft: '4px' }}>▼</span>

          {locationOpen && (
            <div className="location-dropdown-popover" onClick={e => e.stopPropagation()}>
              <button className="detect-loc-btn" onClick={handleDetectLocation} disabled={detecting}>
                {detecting ? 'Detecting Location...' : 'Detect Current Location'}
              </button>
              <div className="popover-subtitle">Saved Addresses</div>
              <div className="saved-addr-list">
                {savedAddresses.map((addr, idx) => (
                  <div key={idx} className="saved-addr-row" onClick={() => handleSelectAddress(addr)}>
                    <input type="radio" checked={address === addr} readOnly />
                    <span>{addr}</span>
                  </div>
                ))}
              </div>
              <div className="popover-subtitle">Add New Address</div>
              <div className="add-addr-form">
                <input 
                  type="text" 
                  placeholder="Street, Block, City..." 
                  value={newAddressText}
                  onChange={e => setNewAddressText(e.target.value)}
                />
                <button onClick={handleAddAddress}>Add</button>
              </div>
            </div>
          )}
        </div>

        {/* Cart */}
        <button className="nav-cart-btn-new" onClick={() => setIsOpen(true)}>
          <span>Cart</span>
          {itemCount > 0 && <span className="nav-cart-badge-new">{itemCount}</span>}
        </button>

        {/* Profile Popover */}
        {isLoggedIn ? (
          <div className="nav-profile-trigger" onClick={() => setProfileOpen(!profileOpen)} ref={profileRef}>
            <div className="avatar-circle">
              {user?.username ? user.username[0].toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '9px', marginLeft: '2px' }}>▼</span>

            {profileOpen && (
              <div className="profile-dropdown-popover" onClick={e => e.stopPropagation()}>
                <div className="profile-popover-info">
                  <h4>{user?.username}</h4>
                  <p>{user?.email || 'Registered Account'}</p>
                </div>
                {(user?.role === 'admin' || user?.username?.includes('admin') || user?.username?.includes('9111111111')) && (
                  <Link to="/admin" className="profile-dropdown-link" style={{ background: '#e0e7ff', color: '#4338ca', fontWeight: 'bold' }} onClick={() => setProfileOpen(false)}>
                    🛡️ Admin Portal
                  </Link>
                )}
                <Link to="/my-orders" className="profile-dropdown-link" onClick={() => setProfileOpen(false)}>
                  My Orders
                </Link>
                <button className="profile-dropdown-link" onClick={() => { setLocationOpen(true); setProfileOpen(false); }}>
                  Saved Addresses
                </button>
                <button className="profile-dropdown-link" onClick={() => alert('Wishlist feature coming soon in Phase 2!')}>
                  Wishlist
                </button>
                <button className="profile-dropdown-link" onClick={() => alert('Profile Settings coming soon!')}>
                  Settings
                </button>
                <button className="profile-dropdown-link logout-btn" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="nav-guest-login-btn">
            Login
          </Link>
        )}
      </div>
    </header>
  )
}

// ── 2. SHOP OWNER NAVBAR & SIDEBAR (TEXT ONLY) ──
function ShopOwnerNavbar() {
  const { logout } = useAuth()
  const [storeOpen, setStoreOpen] = useState(true)
  const [liveInventory, setLiveInventory] = useState(true)
  const [revenue, setRevenue] = useState(0)
  const [shopName, setShopName] = useState('Shopkeeper')

  // Search, Alerts & Help Modals
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const searchRef = useRef(null)

  const loadNavbarData = () => {
    fetchJson('/shops/my-products/')
      .then(data => {
        if (data) {
          setStoreOpen(data.is_open)
          setLiveInventory(data.live_inventory)
          setShopName(data.shop_name || 'Shopkeeper')
        }
      })
      .catch(() => {})

    fetchJson('/shop/dashboard/revenue-today/')
      .then(data => {
        if (data) {
          setRevenue(data.today_total || 0)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadNavbarData()

    const syncStatus = () => {
      loadNavbarData()
    }
    window.addEventListener('liveInventoryToggled', syncStatus)
    window.addEventListener('shopStatusChanged', syncStatus)
    return () => {
      window.removeEventListener('liveInventoryToggled', syncStatus)
      window.removeEventListener('shopStatusChanged', syncStatus)
    }
  }, [])

  // Global Search API Call
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }

    const timer = setTimeout(() => {
      fetchJson(`/shop/dashboard/search/?q=${encodeURIComponent(searchQuery.trim())}`)
        .then(data => setSearchResults(data))
        .catch(() => {})
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleStore = () => {
    fetchJson('/shops/toggle-open/', { method: 'POST' })
      .then(res => {
        setStoreOpen(res.is_open)
        window.dispatchEvent(new Event('shopStatusChanged'))
      })
      .catch(() => {})
  }

  const handleToggleInventory = () => {
    fetchJson('/shops/toggle-live/', { method: 'POST' })
      .then(res => {
        setLiveInventory(res.live_inventory)
        window.dispatchEvent(new Event('liveInventoryToggled'))
      })
      .catch(() => {})
  }

  const handleSearchResultClick = (tabName) => {
    localStorage.setItem('active_shop_tab', tabName)
    window.dispatchEvent(new Event('shopTabChanged'))
    setSearchFocused(false)
    setSearchQuery('')
  }

  return (
    <header className="shop-owner-navbar">
      <Link to="/dashboard" className="shop-owner-nav-logo">
        🏪 {shopName}
      </Link>

      <div className="shop-navbar-search-container" ref={searchRef}>
        <input 
          type="text" 
          placeholder="Search products, orders, customers, invoices, barcode/SKU..."
          className="shop-navbar-search-input"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
        />

        {searchFocused && searchQuery.trim() !== '' && (
          <div className="search-suggestions-dropdown" style={{ width: '100%', top: '48px', position: 'absolute', zIndex: 1000, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', padding: '12px' }}>
            <div className="suggestion-header" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 8, borderBottom: '1px solid #1e293b', paddingBottom: 4 }}>
              Global Store Search Results
            </div>
            
            {searchResults ? (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {searchResults.orders?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#38bdf8' }}>📦 Orders ({searchResults.orders.length})</span>
                    {searchResults.orders.map(o => (
                      <div key={o.id} onClick={() => handleSearchResultClick('orders')} style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Order #{o.id} - {o.customer}</span>
                        <strong style={{ color: '#22c55e' }}>₹{o.total_price}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.products?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#a78bfa' }}>🛍️ Catalog Items ({searchResults.products.length})</span>
                    {searchResults.products.map(p => (
                      <div key={p.id} onClick={() => handleSearchResultClick('inventory')} style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{p.name} ({p.brand})</span>
                        <span style={{ color: '#cbd5e1' }}>Stock: {p.stock}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.coupons?.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#f59e0b' }}>🏷️ Coupons ({searchResults.coupons.length})</span>
                    {searchResults.coupons.map(c => (
                      <div key={c.id} onClick={() => handleSearchResultClick('promotions')} style={{ padding: '6px 8px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Code: {c.code}</span>
                        <span style={{ color: '#f59e0b' }}>{c.discount} OFF</span>
                      </div>
                    ))}
                  </div>
                )}

                {!searchResults.orders?.length && !searchResults.products?.length && !searchResults.coupons?.length && (
                  <div style={{ padding: '12px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                    No matching store records found.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>Searching...</div>
            )}
          </div>
        )}
      </div>

      <div className="shop-navbar-right">
        {/* Store Open Status */}
        <div className="shop-navbar-toggle-group" onClick={handleToggleStore} title="Click to toggle open status">
          <span className={storeOpen ? 'toggle-dot-active' : 'toggle-dot-inactive'}></span>
          <span>{storeOpen ? 'Store Open' : 'Store Closed'}</span>
        </div>

        {/* Live Inventory Status */}
        <div className="shop-navbar-toggle-group" onClick={handleToggleInventory} title="Click to toggle live inventory priority">
          <span className={liveInventory ? 'toggle-dot-active' : 'toggle-dot-inactive'}></span>
          <span>{liveInventory ? 'Live Inventory: ON' : 'Live Inventory: OFF'}</span>
        </div>

        {/* Revenue Badge */}
        <div className="shop-navbar-revenue" style={{ fontWeight: 'bold' }}>
          Today: ₹{parseFloat(revenue).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </div>

        {/* Notifications */}
        <span className="shop-navbar-bell" onClick={() => setAlertsOpen(true)} style={{ cursor: 'pointer' }}>
          Alerts
        </span>

        {/* Help */}
        <span className="text-muted" style={{ cursor: 'pointer' }} onClick={() => setHelpOpen(true)}>
          Help
        </span>

        {/* Profile Avatar */}
        <div className="shop-navbar-avatar" title="Merchant Profile" onClick={logout} style={{ cursor: 'pointer' }}>
          {shopName[0]?.toUpperCase() || 'M'}
        </div>
      </div>

      {/* Operational Alerts Modal */}
      {alertsOpen && (
        <div className="modal-backdrop" onClick={() => setAlertsOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>🔔 Store Operational Center</h3>
              <button className="modal-close-btn" onClick={() => setAlertsOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', padding: '10px 12px', borderRadius: '4px' }}>
                <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>✓ System Operational</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>DigiBazaar dispatch server & payment gateways running smoothly.</p>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b', padding: '10px 12px', borderRadius: '4px' }}>
                <strong style={{ color: '#fbbf24', fontSize: '0.9rem' }}>⚡ Auto-Dispatch Reminder</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>Live Inventory is enabled. Unconfirmed orders will auto-accept within 90 seconds.</p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid #10b981', padding: '10px 12px', borderRadius: '4px' }}>
                <strong style={{ color: '#34d399', fontSize: '0.9rem' }}>🤖 ML Demand Forecast Ready</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>Tomorrow's stock demand predictions updated. Check Inventory tab for reorder alerts.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={() => setAlertsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Help & Support Drawer */}
      {helpOpen && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>❓ Merchant AI Support Desk</h3>
              <button className="modal-close-btn" onClick={() => setHelpOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Have questions about commissions, deliveries, or inventory management?</p>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#38bdf8' }}>Q: How does Live Inventory Priority work?</h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>Enabling Live Inventory guarantees 5% reduced commission fee and auto-accepts customer orders for instant rider pickup.</p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#38bdf8' }}>Q: When are payout settlements transferred?</h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>Earnings are deposited daily at 11:59 PM directly to your configured UPI / Bank account in Shop Settings.</p>
              </div>

              <div style={{ marginTop: '10px', background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#c084fc' }}>Need urgent assistance?</span>
                <div style={{ fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>📧 support@digibazaar.in | 📞 +91 1800-419-7000</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-save-btn" onClick={() => { alert('Support ticket #9021 created! Our partner manager will call you within 15 minutes.'); setHelpOpen(false); }}>
                Request Support Callback
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function ShopOwnerSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(localStorage.getItem('active_shop_tab') || 'dashboard')

  useEffect(() => {
    const handleTabChange = () => {
      setActiveTab(localStorage.getItem('active_shop_tab') || 'dashboard')
    }
    window.addEventListener('shopTabChanged', handleTabChange)
    return () => window.removeEventListener('shopTabChanged', handleTabChange)
  }, [])

  const handleTabClick = (tabName) => {
    localStorage.setItem('active_shop_tab', tabName)
    setActiveTab(tabName)
    window.dispatchEvent(new Event('shopTabChanged'))
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard')
    }
  }

  return (
    <aside className="shop-owner-sidebar">
      {/* General section */}
      <div className="sidebar-group-box">
        <span className="sidebar-group-title">Home</span>
        <button 
          className={`sidebar-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabClick('dashboard')}
        >
          Dashboard Overview
        </button>
      </div>

      {/* Core Workflow Section */}
      <div className="sidebar-group-box">
        <span className="sidebar-group-title">Operations</span>
        <button 
          className={`sidebar-nav-link ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleTabClick('orders')}
        >
          Active Orders
        </button>
        <button 
          className={`sidebar-nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => handleTabClick('inventory')}
        >
          Manage Inventory
        </button>
      </div>

      {/* Secondary reporting sections */}
      <div className="sidebar-group-box">
        <span className="sidebar-group-title">Reports & Analysis</span>
        <button 
          className={`sidebar-nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => handleTabClick('analytics')}
        >
          Sales Analytics
        </button>
        <button 
          className={`sidebar-nav-link ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => handleTabClick('reports')}
        >
          Sales Reports
        </button>
        <button 
          className={`sidebar-nav-link ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => handleTabClick('customers')}
        >
          Customers List
        </button>
      </div>

      {/* Marketing and promotions */}
      <div className="sidebar-group-box">
        <span className="sidebar-group-title">Marketing</span>
        <button 
          className={`sidebar-nav-link ${activeTab === 'promotions' ? 'active' : ''}`}
          onClick={() => handleTabClick('promotions')}
        >
          Promotions & Coupons
        </button>
      </div>

      {/* Premium upgrade plan */}
      <div className="sidebar-group-box">
        <span className="sidebar-group-title">Growth</span>
        <button 
          className={`sidebar-nav-link ${activeTab === 'growth' ? 'active' : ''}`}
          onClick={() => handleTabClick('growth')}
          style={{ color: activeTab === 'growth' ? '#fff' : '#0891b2', fontWeight: '800' }}
        >
          Premium Features
        </button>
      </div>

      {/* Profile & Settings */}
      <div className="sidebar-group-box" style={{ marginTop: 'auto' }}>
        <span className="sidebar-group-title">System</span>
        <button 
          className={`sidebar-nav-link ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabClick('settings')}
        >
          Shop Settings
        </button>
      </div>
    </aside>
  )
}

// ── 3. RIDER TOP & BOTTOM PORTAL NAVBARS (TEXT ONLY) ──
function RiderTopNavbar() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const handleStatusUpdate = () => {
      const isOnlineStr = localStorage.getItem('rider_online_status')
      setOnline(isOnlineStr !== 'false')
    }
    window.addEventListener('riderStatusUpdated', handleStatusUpdate)
    return () => window.removeEventListener('riderStatusUpdated', handleStatusUpdate)
  }, [])

  return (
    <header className="rider-top-navbar">
      <div className="rider-top-logo-txt">DigiBazaar Partner</div>
      <div className={`rider-status-header-badge ${online ? 'online' : 'offline'}`}>
        {online ? 'ONLINE' : 'OFFLINE'}
      </div>
      <div className="rider-navbar-right-box">
        <span className="rider-bell-alert" onClick={() => alert('Active jobs will be auto-allocated.')} style={{ cursor: 'pointer' }}>
          Alerts
        </span>
        <div className="rider-nav-avatar">R</div>
      </div>
    </header>
  )
}

function RiderBottomNavigation() {
  const [activeTab, setActiveTab] = useState(localStorage.getItem('active_rider_tab') || 'home')

  useEffect(() => {
    const handleTabChange = () => {
      setActiveTab(localStorage.getItem('active_rider_tab') || 'home')
    }
    window.addEventListener('riderTabChanged', handleTabChange)
    return () => window.removeEventListener('riderTabChanged', handleTabChange)
  }, [])

  const handleTabClick = (tabName) => {
    localStorage.setItem('active_rider_tab', tabName)
    setActiveTab(tabName)
    window.dispatchEvent(new Event('riderTabChanged'))
  }

  return (
    <div className="rider-bottom-navigation-bar">
      <button 
        className={`rider-bottom-nav-tab ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => handleTabClick('home')}
      >
        <span>Home</span>
      </button>
      <button 
        className={`rider-bottom-nav-tab ${activeTab === 'deliveries' ? 'active' : ''}`}
        onClick={() => handleTabClick('deliveries')}
      >
        <span>Deliveries</span>
      </button>
      <button 
        className={`rider-bottom-nav-tab ${activeTab === 'map' ? 'active' : ''}`}
        onClick={() => handleTabClick('map')}
      >
        <span>Map</span>
      </button>
      <button 
        className={`rider-bottom-nav-tab ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => handleTabClick('history')}
      >
        <span>History</span>
      </button>
      <button 
        className={`rider-bottom-nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => handleTabClick('profile')}
      >
        <span>Profile</span>
      </button>
    </div>
  )
}


// ── ADMIN TOP NAVBAR ──
function AdminTopNavbar() {
  const { user, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Brand & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link to="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>
            DigiBazaar <span style={{ color: '#4338ca' }}>Admin</span>
          </span>
        </Link>
        <span style={{
          background: '#e0e7ff',
          color: '#4338ca',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 10px',
          borderRadius: '20px',
          border: '1px solid #c7d2fe'
        }}>
          SuperAdmin Control Center
        </span>
      </div>

      {/* Center: Admin HQ Address & Operations Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#475569'
      }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
        <div>
          <strong>HQ Operations Address:</strong> Commerce Tower, Paldi, Ahmedabad - 380007
        </div>
      </div>

      {/* Right Controls & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <Link 
          to="/" 
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#475569',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#f1f5f9'
          }}
        >
          Customer Store View
        </Link>

        {/* Profile Popover */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '6px 14px',
              borderRadius: '20px'
            }}
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#4338ca',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              A
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              {user?.username || 'admin_9111111111'}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>▼</span>
          </div>

          {profileOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '42px',
              width: '240px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 1001
            }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{user?.username}</strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Phone: 9111111111 (SuperAdmin)</span>
              </div>
              <Link to="/admin" style={{ fontSize: '13px', textDecoration: 'none', color: '#4338ca', fontWeight: 'bold', padding: '6px 10px', borderRadius: '6px', background: '#e0e7ff' }} onClick={() => setProfileOpen(false)}>
                Admin Dashboard
              </Link>
              <Link to="/dashboard" style={{ fontSize: '13px', textDecoration: 'none', color: '#334155', padding: '6px 10px', borderRadius: '6px' }} onClick={() => setProfileOpen(false)}>
                Shop Owner Portal
              </Link>
              <Link to="/rider" style={{ fontSize: '13px', textDecoration: 'none', color: '#334155', padding: '6px 10px', borderRadius: '6px' }} onClick={() => setProfileOpen(false)}>
                Rider Delivery Portal
              </Link>
              <button 
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginTop: '4px'
                }}
                onClick={logout}
              >
                Logout Admin Account
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

// ── MAIN APPLICATION WRAPPER ──
function AppInner() {
  const location = useLocation()
  
  const isShopRoute = location.pathname.startsWith('/dashboard')
  const isRiderRoute = location.pathname.startsWith('/rider')
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) {
    return (
      <>
        <AdminTopNavbar />
        <main>
          <AppRoutes />
        </main>
      </>
    )
  }

  if (isShopRoute) {
    return (
      <>
        <ShopOwnerNavbar />
        <div className="shop-owner-layout-wrapper">
          <ShopOwnerSidebar />
          <main className="shop-owner-main-content-panel">
            <AppRoutes />
          </main>
        </div>
      </>
    )
  }

  if (isRiderRoute) {
    return (
      <>
        <RiderTopNavbar />
        <main className="rider-layout-wrapper-panel">
          <AppRoutes />
        </main>
        <RiderBottomNavigation />
      </>
    )
  }

  return (
    <>
      <CustomerNavbar />
      <Cart />
      <main>
        <AppRoutes />
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <span>DigiBazaar — AI-Powered Local Shopping</span>
          <span style={{ color: '#888', fontSize: '13px' }}>Built in Paldi, Ahmedabad, Gujarat</span>
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
