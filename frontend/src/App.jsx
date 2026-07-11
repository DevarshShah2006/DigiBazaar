import { BrowserRouter as Router, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import AppRoutes from './routes/AppRoutes'
import Cart from './components/Cart/Cart'
import './App.css'

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
                  <p>{user?.email || 'Customer Account'}</p>
                </div>
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

  const handleToggleStore = () => {
    setStoreOpen(!storeOpen)
    alert(`Store Status toggled: Now ${!storeOpen ? 'OPEN' : 'CLOSED'}`)
  }

  const handleToggleInventory = () => {
    setLiveInventory(!liveInventory)
    localStorage.setItem('live_inventory_dashboard', (!liveInventory).toString())
    window.dispatchEvent(new Event('liveInventoryToggled'))
  }

  return (
    <header className="shop-owner-navbar">
      <Link to="/dashboard" className="shop-owner-nav-logo">
        DigiBazaar Shopkeeper
      </Link>

      <div className="shop-navbar-search-container">
        <input 
          type="text" 
          placeholder="Search products, orders, customers, invoices, barcode/SKU..."
          className="shop-navbar-search-input"
        />
      </div>

      <div className="shop-navbar-right">
        {/* Store Open Status */}
        <div className="shop-navbar-toggle-group" onClick={handleToggleStore}>
          <span className={storeOpen ? 'toggle-dot-active' : 'toggle-dot-inactive'}></span>
          <span>{storeOpen ? 'Store Open' : 'Store Closed'}</span>
        </div>

        {/* Live Inventory Status */}
        <div className="shop-navbar-toggle-group" onClick={handleToggleInventory}>
          <span className={liveInventory ? 'toggle-dot-active' : 'toggle-dot-inactive'}></span>
          <span>{liveInventory ? 'Live Inventory: ON' : 'Live Inventory: OFF'}</span>
        </div>

        {/* Revenue Badge */}
        <div className="shop-navbar-revenue">
          Today: ₹14,500
        </div>

        {/* Notifications */}
        <span className="shop-navbar-bell" onClick={() => alert('New Order Alert: Order #603 pending approval')} style={{ cursor: 'pointer' }}>
          Alerts
        </span>

        {/* Help */}
        <span className="text-muted" style={{ cursor: 'pointer' }} onClick={() => alert('DigiBazaar Support Desk: support@digibazaar.in')}>
          Help
        </span>

        {/* Profile Avatar */}
        <div className="shop-navbar-avatar" title="Merchant Profile" onClick={logout} style={{ cursor: 'pointer' }}>
          M
        </div>
      </div>
    </header>
  )
}

function ShopOwnerSidebar() {
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
          className="sidebar-nav-link"
          onClick={() => alert('Sales Report Export: Daily, Weekly, Monthly tax reports available in Phase 2.')}
        >
          Sales Reports
        </button>
        <button 
          className="sidebar-nav-link"
          onClick={() => alert('Customer Loyalty Portal: 15 repeat customers active today.')}
        >
          Customers List
        </button>
      </div>

      {/* Marketing and promotions */}
      <div className="sidebar-group-box">
        <span className="sidebar-group-title">Marketing</span>
        <button 
          className="sidebar-nav-link"
          onClick={() => alert('Manage discount campaigns or set coupon WELCOME10')}
        >
          Promotions & Coupons
        </button>
      </div>

      {/* Premium upgrade plan */}
      <div className="sidebar-group-box">
        <span className="sidebar-group-title">Growth</span>
        <button 
          className="sidebar-nav-link"
          onClick={() => alert('Premium Upgrade: Reduce commission to 5% flat and get featured banner slots.')}
          style={{ color: '#0891b2', fontWeight: '800' }}
        >
          Premium Features
        </button>
      </div>

      {/* Profile & Settings */}
      <div className="sidebar-group-box" style={{ marginTop: 'auto' }}>
        <span className="sidebar-group-title">System</span>
        <button 
          className="sidebar-nav-link"
          onClick={() => alert('Store Information, Timings and Location settings.')}
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


// ── MAIN APPLICATION WRAPPER ──
function AppInner() {
  const location = useLocation()
  
  const isShopRoute = location.pathname.startsWith('/dashboard')
  const isRiderRoute = location.pathname.startsWith('/rider')

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
