import { BrowserRouter as Router, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import AppRoutes from './routes/AppRoutes'
import Cart from './components/Cart/Cart'
import WishlistPanel from './components/Wishlist/WishlistPanel'
import './App.css'
import { fetchJson } from './api/api'

// ── 1. CUSTOMER NAVBAR (TEXT ONLY) ──
function CustomerNavbar({ wishlistOpen, setWishlistOpen }) {
  const { user, logout, isLoggedIn } = useAuth()
  const { itemCount, setIsOpen, wishlistCount } = useCart()
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

        {/* Wishlist */}
        <button className="nav-wishlist-btn" onClick={() => setWishlistOpen(true)}>
          <span style={{ fontSize: '16px' }}>♡</span>
          {wishlistCount > 0 && <span className="nav-wishlist-badge">{wishlistCount}</span>}
          <span className="nav-wishlist-tooltip">View wishlist</span>
        </button>

        {/* Cart */}
        <button className="nav-cart-btn-new" onClick={() => navigate('/cart')}>
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
                <button className="profile-dropdown-link" onClick={() => { setWishlistOpen(true); setProfileOpen(false); }}>
                  Wishlist
                </button>
                <button className="profile-dropdown-link" onClick={() => alert('Profile Settings coming soon!')}>
                  Settings
                </button>
                <button className="profile-dropdown-link logout-btn" onClick={() => { logout(); navigate('/'); setProfileOpen(false) }}>
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
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [storeOpen, setStoreOpen] = useState(true)
  const [revenue, setRevenue] = useState(0)
  // Initialize shop name immediately from stored data, fall back to user info
  const [shopName, setShopName] = useState(() => {
    return 'My Store'
  })

  // Search, Alerts & Help Modals
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [dynamicAlerts, setDynamicAlerts] = useState([])

  const searchRef = useRef(null)

  const isAuthorizedShopOwner = isLoggedIn && (user?.role === 'shopowner' || user?.role === 'admin')

  const loadNavbarData = () => {
    if (!isAuthorizedShopOwner) return

    fetchJson('/shops/my-products/')
      .then(data => {
        if (data && data.shop_name) {
          setStoreOpen(Boolean(data.is_open))
          setShopName(data.shop_name)
        }
      })
      .catch(() => {})

    fetchJson('/shop/dashboard/revenue-today/')
      .then(data => {
        if (data) {
          setRevenue(data.revenue_today ?? data.today_total ?? 0)
        }
      })
      .catch(() => {})

    // Load dynamic operational alerts
    Promise.all([
      fetchJson('/orders/shop-orders/').catch(() => []),
      fetchJson('/shop/dashboard/low-stock/').catch(() => []),
      fetchJson('/shop/dashboard/weather/').catch(() => null)
    ]).then(([ordersData, lowStockData, weatherData]) => {
      const alerts = []
      const pendingOrders = (Array.isArray(ordersData) ? ordersData : []).filter(o => o.status === 'pending')
      
      if (pendingOrders.length > 0) {
        alerts.push({
          id: 'pending-orders',
          badge: 'URGENT',
          badgeBg: '#fee2e2',
          badgeColor: '#dc2626',
          title: `${pendingOrders.length} Pending Order(s) Awaiting Acceptance`,
          message: 'Review and accept incoming customer orders promptly to prevent auto-cancellation.',
          actionTab: 'orders'
        })
      }

      const lowStockCount = Array.isArray(lowStockData?.low_stock) ? lowStockData.low_stock.length : (Array.isArray(lowStockData) ? lowStockData.length : 0)
      if (lowStockCount > 0) {
        alerts.push({
          id: 'low-stock',
          badge: 'STOCK ALERT',
          badgeBg: '#fef3c7',
          badgeColor: '#b45309',
          title: `${lowStockCount} Product(s) Running Low in Stock`,
          message: 'Update stock levels in Inventory to maintain continuous order dispatch.',
          actionTab: 'inventory'
        })
      }

      if (weatherData && weatherData.is_raining) {
        alerts.push({
          id: 'weather',
          badge: 'RAIN WARNING',
          badgeBg: '#e0f2fe',
          badgeColor: '#0369a1',
          title: `Rainy Weather Reported in ${weatherData.city}`,
          message: 'Delivery rider assignments may take 5-10 mins longer due to weather conditions.',
          actionTab: 'dashboard'
        })
      }

      alerts.push({
        id: 'system',
        badge: 'SYSTEM OPERATIONAL',
        badgeBg: '#dcfce7',
        badgeColor: '#15803d',
        title: 'DigiBazaar Dispatch Engine Active',
        message: 'Payment gateways, instant dispatch, and store services are running smoothly.',
        actionTab: 'dashboard'
      })

      setDynamicAlerts(alerts)
    })
  }

  useEffect(() => {
    if (!isAuthorizedShopOwner) return

    loadNavbarData()

    const syncStatus = () => {
      loadNavbarData()
    }
    window.addEventListener('liveInventoryToggled', syncStatus)
    window.addEventListener('shopStatusChanged', syncStatus)
    window.addEventListener('shopTabChanged', syncStatus)
    
    // Refresh navbar data periodically every 30 seconds
    const interval = setInterval(loadNavbarData, 30000)

    return () => {
      window.removeEventListener('liveInventoryToggled', syncStatus)
      window.removeEventListener('shopStatusChanged', syncStatus)
      window.removeEventListener('shopTabChanged', syncStatus)
      clearInterval(interval)
    }
  }, [isAuthorizedShopOwner])

  // Global Search API Call
  useEffect(() => {
    if (!searchQuery.trim() || !isAuthorizedShopOwner) {
      setSearchResults(null)
      return
    }

    const timer = setTimeout(() => {
      fetchJson(`/shop/dashboard/search/?q=${encodeURIComponent(searchQuery.trim())}`)
        .then(data => setSearchResults(data))
        .catch(() => {})
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery, isAuthorizedShopOwner])

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
        if (res && res.is_open !== undefined) {
          setStoreOpen(Boolean(res.is_open))
          window.dispatchEvent(new Event('shopStatusChanged'))
        }
      })
      .catch(err => console.error("Toggle store error:", err))
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
        {shopName}
      </Link>

      {/* Light-Themed Search Container */}
      <div className="shop-navbar-search-container" ref={searchRef}>
        <div className="search-input-wrapper-inner" style={{ position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search products, orders, customers, coupons..."
            className="shop-navbar-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            style={{
              paddingRight: searchQuery ? '30px' : '12px'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setSearchResults(null); }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {searchFocused && searchQuery.trim() !== '' && (
          <div className="search-suggestions-dropdown" style={{
            width: '100%',
            top: '44px',
            position: 'absolute',
            zIndex: 1000,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            padding: '12px'
          }}>
            <div className="suggestion-header" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: 8, borderBottom: '1px solid #f1f5f9', paddingBottom: 6, fontWeight: '700' }}>
              Store Search Results
            </div>
            
            {searchResults ? (
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {searchResults.orders?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0284c7', display: 'block', marginBottom: 4 }}>Orders ({searchResults.orders.length})</span>
                    {searchResults.orders.map(o => (
                      <div key={o.id} onClick={() => handleSearchResultClick('orders')} style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>Order #{o.id}</strong>
                          <span style={{ color: '#64748b', marginLeft: 6 }}>• {o.customer}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#16a34a' }}>₹{o.total_price}</strong>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.products?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7c3aed', display: 'block', marginBottom: 4 }}>Inventory Products ({searchResults.products.length})</span>
                    {searchResults.products.map(p => (
                      <div key={p.id} onClick={() => handleSearchResultClick('inventory')} style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{p.name}</strong>
                          {p.brand && <span style={{ color: '#64748b', marginLeft: 6 }}>({p.brand})</span>}
                        </div>
                        <span style={{ background: p.stock <= 5 ? '#fee2e2' : '#e0f2fe', color: p.stock <= 5 ? '#dc2626' : '#0369a1', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                          Stock: {p.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.coupons?.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#d97706', display: 'block', marginBottom: 4 }}>Active Coupons ({searchResults.coupons.length})</span>
                    {searchResults.coupons.map(c => (
                      <div key={c.id} onClick={() => handleSearchResultClick('promotions')} style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <strong style={{ color: '#d97706' }}>{c.code}</strong>
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>{c.discount} OFF</span>
                      </div>
                    ))}
                  </div>
                )}

                {!searchResults.orders?.length && !searchResults.products?.length && !searchResults.coupons?.length && (
                  <div style={{ padding: '16px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
                    No matching store records found.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>Searching catalog & store records...</div>
            )}
          </div>
        )}
      </div>

      <div className="shop-navbar-right">
        {/* Store Open/Closed Toggle */}
        <div className="shop-navbar-toggle-group" onClick={handleToggleStore} title="Click to toggle store open status">
          <span className={storeOpen ? 'toggle-dot-active' : 'toggle-dot-inactive'}></span>
          <span>{storeOpen ? 'Store Open' : 'Store Closed'}</span>
        </div>

        {/* Revenue Display */}
        <div className="shop-navbar-revenue" style={{ fontWeight: 'bold' }}>
          Today: ₹{parseFloat(revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* Dynamic Alerts Badge */}
        <div className="shop-navbar-bell-wrapper" onClick={() => setAlertsOpen(true)} style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="shop-navbar-bell">Alerts</span>
          {dynamicAlerts.length > 0 && (
            <span style={{
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '10px',
              padding: '1px 6px',
              marginLeft: '2px'
            }}>
              {dynamicAlerts.length}
            </span>
          )}
        </div>

        {/* Help Drawer Trigger - Styled identical to Alerts */}
        <span className="shop-navbar-help" onClick={() => setHelpOpen(true)}>
          Help
        </span>

        {/* Merchant Profile Avatar */}
        <div className="shop-navbar-avatar" title="Click to Logout" onClick={() => { logout(); navigate('/'); }} style={{ cursor: 'pointer', position: 'relative' }} data-tooltip="Logout">
          {shopName[0]?.toUpperCase() || 'M'}
        </div>
      </div>

      {/* Dynamic Operational Alerts Modal */}
      {alertsOpen && (
        <div className="modal-backdrop" onClick={() => setAlertsOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', background: '#ffffff', color: '#0f172a' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.1rem', margin: 0 }}>Store Operational Alerts</h3>
              <button className="modal-close-btn" onClick={() => setAlertsOpen(false)} style={{ color: '#64748b' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dynamicAlerts.length > 0 ? (
                dynamicAlerts.map(alert => (
                  <div key={alert.id} style={{
                    background: '#f8fafc',
                    borderLeft: `4px solid ${alert.badgeColor}`,
                    border: '1px solid #e2e8f0',
                    borderLeftWidth: '4px',
                    borderLeftColor: alert.badgeColor,
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{alert.title}</strong>
                      <span style={{ background: alert.badgeBg, color: alert.badgeColor, fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>
                        {alert.badge}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>{alert.message}</p>
                    {alert.actionTab && (
                      <button 
                        onClick={() => {
                          handleSearchResultClick(alert.actionTab)
                          setAlertsOpen(false)
                        }}
                        style={{
                          marginTop: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#0891b2',
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Go to {alert.actionTab.toUpperCase()} →
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>No active operational alerts.</p>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button className="modal-cancel-btn" onClick={() => setAlertsOpen(false)} style={{ background: '#f1f5f9', color: '#334155' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Help & Support Drawer */}
      {helpOpen && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', background: '#ffffff', color: '#0f172a' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ color: '#0f172a', fontSize: '1.1rem', margin: 0 }}>Merchant Support Desk</h3>
              <button className="modal-close-btn" onClick={() => setHelpOpen(false)} style={{ color: '#64748b' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Have questions about commissions, deliveries, or inventory management?</p>
              
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#0891b2', fontSize: '0.9rem' }}>Q: How does Live Inventory Priority work?</h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>Live Inventory guarantees 5% reduced commission fee and auto-assigns customer orders. Live Inventory activation is managed by system admins.</p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#0891b2', fontSize: '0.9rem' }}>Q: When are payout settlements transferred?</h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>Earnings are deposited daily at 11:59 PM directly to your configured UPI / Bank account in Shop Settings.</p>
              </div>

              <div style={{ marginTop: '6px', background: '#ecfeff', padding: '12px', borderRadius: '8px', border: '1px solid #a5f3fc', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#0891b2', fontWeight: 'bold' }}>Need urgent assistance?</span>
                <div style={{ fontWeight: 'bold', color: '#0f172a', marginTop: '4px', fontSize: '0.85rem' }}>support@digibazaar.in | +91 1800-419-7000</div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button className="modal-save-btn" onClick={() => { alert('Support ticket created. Our partner manager will contact you.'); setHelpOpen(false); }} style={{ background: '#0891b2', color: '#ffffff' }}>
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
  // Always start on dashboard — localStorage is cleared on ShopDashboard mount
  const [activeTab, setActiveTab] = useState('dashboard')

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
  const [theme, setTheme] = useState(localStorage.getItem('rider_theme') || 'light')

  useEffect(() => {
    const handleStatusUpdate = () => {
      const isOnlineStr = localStorage.getItem('rider_online_status')
      setOnline(isOnlineStr !== 'false')
    }
    window.addEventListener('riderStatusUpdated', handleStatusUpdate)
    return () => window.removeEventListener('riderStatusUpdated', handleStatusUpdate)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('rider-dark-theme', theme === 'dark')
    localStorage.setItem('rider_theme', theme)
    return () => document.body.classList.remove('rider-dark-theme')
  }, [theme])

  return (
    <header className="rider-top-navbar">
      <Link className="rider-top-logo-txt" to="/rider" onClick={() => {
        localStorage.setItem('active_rider_tab', 'home')
        window.dispatchEvent(new Event('riderTabChanged'))
      }}>
        <span className="rider-brand-mark">D</span>
        <span>DigiBazaar <em>Rider</em></span>
      </Link>
      <nav className="rider-desktop-nav" aria-label="Rider navigation">
        {['home', 'deliveries', 'map', 'history'].map(tab => (
          <button key={tab} onClick={() => {
            localStorage.setItem('active_rider_tab', tab)
            window.dispatchEvent(new Event('riderTabChanged'))
          }}>
            {tab === 'home' ? 'Dashboard' : tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
      <div className="rider-navbar-right-box">
        <div className={`rider-status-header-badge ${online ? 'online' : 'offline'}`}>
          <span></span>{online ? 'Online' : 'Offline'}
        </div>
        <span className="rider-bell-alert" onClick={() => alert('Active jobs will be auto-allocated.')} style={{ cursor: 'pointer' }}>
          Notifications
        </span>
        <button
          className="rider-theme-toggle"
          onClick={() => setTheme(current => current === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? '☾ Dark' : '☀ Light'}
        </button>
        <button className="rider-nav-avatar" aria-label="Open profile" onClick={() => {
          localStorage.setItem('active_rider_tab', 'profile')
          window.dispatchEvent(new Event('riderTabChanged'))
        }}>R</button>
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
        <span>Dashboard</span>
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
  const navigate = useNavigate()
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
                onClick={() => { logout(); navigate('/'); setProfileOpen(false) }}
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
  const { user } = useAuth()
  const [wishlistOpen, setWishlistOpen] = useState(false)

  // Determine layout by BOTH route AND user role
  // Route-based checks for portal paths
  const isShopRoute = location.pathname.startsWith('/dashboard')
  const isRiderRoute = location.pathname.startsWith('/rider')
  const isAdminRoute = location.pathname.startsWith('/admin')

  // Role-based checks for home page (so admin at '/' gets redirected via AppRoutes)
  const userRole = user?.role

  if (isAdminRoute && userRole === 'admin') {
    return (
      <>
        <AdminTopNavbar />
        <main>
          <AppRoutes />
        </main>
      </>
    )
  }

  if (isShopRoute && (userRole === 'shopowner' || userRole === 'admin')) {
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

  if (isRiderRoute && (userRole === 'rider' || userRole === 'admin')) {
    return (
      <>
        <RiderTopNavbar />
        <main className="rider-layout-wrapper-panel">
          <AppRoutes />
        </main>
      </>
    )
  }

  // Default: customer layout (also renders AppRoutes which handles redirects)
  return (
    <>
      <CustomerNavbar wishlistOpen={wishlistOpen} setWishlistOpen={setWishlistOpen} />
      <Cart />
      <WishlistPanel isOpen={wishlistOpen} onClose={() => setWishlistOpen(false)} />
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
