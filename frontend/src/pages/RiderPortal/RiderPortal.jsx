import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchJson } from '../../api/api'
import './RiderPortal.css'

export default function RiderPortal() {
  const { isLoggedIn, user, logout } = useAuth()
  const navigate = useNavigate()
  
  // Tab State
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem('active_rider_tab') || 'home'
  )

  useEffect(() => {
    const handleTabChange = () => {
      const tab = localStorage.getItem('active_rider_tab') || 'home'
      setActiveTab(tab)
    }
    window.addEventListener('riderTabChanged', handleTabChange)
    return () => window.removeEventListener('riderTabChanged', handleTabChange)
  }, [])

  // Portal States
  const [data, setData] = useState({
    is_online: false,
    rating: 5.0,
    completed_deliveries: 0,
    total_earnings: 0.0,
    vehicle_type: 'Bicycle',
    vehicle_number: 'BIKE-123',
    active_assignments: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.classList.add('portal-rider')
    return () => {
      document.body.classList.remove('portal-rider')
    }
  }, [])

  const loadDashboard = () => {
    setLoading(true)
    fetchJson('/riders/dashboard/')
      .then(res => {
        if (res.detail) {
          setError(res.detail)
        } else {
          setData(res)
          localStorage.setItem('rider_online_status', res.is_online.toString())
          window.dispatchEvent(new Event('riderStatusUpdated'))
          setError('')
        }
      })
      .catch(() => setError('Failed to connect to Rider Portal API'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    loadDashboard()
  }, [isLoggedIn, navigate])

  const toggleOnline = () => {
    fetchJson('/riders/toggle-online/', { method: 'POST' })
      .then(() => {
        loadDashboard()
      })
      .catch(() => setError('Failed to update status'))
  }

  const updateStatus = (assignmentId, status) => {
    fetchJson('/riders/assignments/update/', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: assignmentId, status })
    })
      .then(() => loadDashboard())
      .catch(() => setError('Failed to update status'))
  }

  if (loading) {
    return (
      <div className="rider-loading-screen">
        <div className="spinner"></div>
        <p>Loading Rider Dashboard...</p>
      </div>
    )
  }

  const active = data.active_assignments && data.active_assignments[0]

  return (
    <div className="rider-portal fade-in">
      {/* ── TAB 1: HOME WORKSPACE ── */}
      {activeTab === 'home' && (
        <div className="rider-tab-content">
          {/* Header profile summary card */}
          <div className="rider-header-card">
            <div className="rider-header-profile">
              <div className="rider-avatar">Rider</div>
              <div>
                <h2>Hello, {user?.username || 'Partner'}!</h2>
                <p>{data.vehicle_type} · {data.vehicle_number}</p>
              </div>
            </div>
          </div>

          {/* Big Online/Offline Toggle Box */}
          <div className={`rider-online-toggle-box ${data.is_online ? 'online' : 'offline'}`}>
            {data.is_online ? (
              <>
                <h3>You're ONLINE</h3>
                <p>Receiving orders automatically near Paldi, Ahmedabad.</p>
                <button className="toggle-btn go-offline" onClick={toggleOnline}>
                  GO OFFLINE
                </button>
              </>
            ) : (
              <>
                <h3>You're OFFLINE</h3>
                <p>Go online to start receiving auto-assigned delivery jobs.</p>
                <button className="toggle-btn go-online" onClick={toggleOnline}>
                  GO ONLINE
                </button>
              </>
            )}
          </div>

          {/* Performance Summary Cards */}
          <div className="rider-stats-grid">
            <div className="rider-stat-card">
              <h4>Today's Payout</h4>
              <h3>₹{parseFloat(data.total_earnings).toFixed(2)}</h3>
            </div>
            <div className="rider-stat-card">
              <h4>Deliveries</h4>
              <h3>{data.completed_deliveries} drops</h3>
            </div>
            <div className="rider-stat-card">
              <h4>Rider Rating</h4>
              <h3>{parseFloat(data.rating).toFixed(1)} / 5</h3>
            </div>
          </div>

          {/* Active Job Assignment Section */}
          {active ? (
            <div className="rider-active-job-card">
              <div className="job-card-header">
                <h3>Active Assignment (Order #{active.order_details.id})</h3>
                <span className="job-status-pill">{active.status.replace('_', ' ').toUpperCase()}</span>
              </div>

              <div className="job-addresses">
                <div className="address-row">
                  <span className="circle-dot shop"></span>
                  <div>
                    <strong>Pickup: {active.order_details.shop_name}</strong>
                    <p>{active.order_details.shop_address || 'Paldi Fresh Mart, Ground Floor, Ahmedabad'}</p>
                  </div>
                </div>
                <div className="address-row">
                  <span className="circle-dot cust"></span>
                  <div>
                    <strong>Drop: {active.order_details.user_name}</strong>
                    <p>{active.order_details.delivery_address}</p>
                  </div>
                </div>
              </div>

              <section className="delivery-proof-card" aria-label="Delivery payload and confirmation">
                <div className="proof-card-heading">
                  <div>
                    <span className="proof-eyebrow">Delivery payload</span>
                    <h4>Package & handover record</h4>
                  </div>
                  <span className="proof-code">#{active.order_details.id}</span>
                </div>
                <div className="proof-details">
                  <span><strong>Contents</strong> Sealed order package</span>
                  <span><strong>Recipient</strong> {active.order_details.user_name}</span>
                  <span><strong>Verification</strong> OTP at doorstep</span>
                </div>
                <div className="signature-row">
                  <div className="signature-line"><span>Recipient signature / confirmation</span></div>
                  <span className="signature-state">{active.status === 'delivered' ? 'Confirmed' : 'Awaiting delivery'}</span>
                </div>
              </section>

              {/* Dynamic Action Buttons */}
              {active.status === 'assigned' && (
                <button 
                  className="job-action-btn pickup"
                  onClick={() => updateStatus(active.id, 'picked_up')}
                >
                  Confirm Arrived & Picked Up
                </button>
              )}

              {active.status === 'picked_up' && (
                <button 
                  className="job-action-btn deliver"
                  onClick={() => updateStatus(active.id, 'delivered')}
                >
                  Confirm Delivered
                </button>
              )}

              <button 
                className="rider-nav-button"
                onClick={() => {
                  localStorage.setItem('active_rider_tab', 'map')
                  window.dispatchEvent(new Event('riderTabChanged'))
                }}
              >
                Open Navigation Map
              </button>
            </div>
          ) : (
            <div className="rider-no-jobs-card">
              <p>Waiting for automatic order assignment...</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DELIVERIES CHECKLIST ── */}
      {activeTab === 'deliveries' && (
        <div className="rider-tab-content">
          <h3>My Delivery Tasks</h3>
          {active ? (
            <div className="deliveries-list">
              <div className="delivery-task-item active">
                <div className="task-badge active">ACTIVE JOB</div>
                <h4>Order #{active.order_details.id}</h4>
                <p><strong>Shop:</strong> {active.order_details.shop_name}</p>
                <p><strong>Fulfillment Status:</strong> {active.status.toUpperCase()}</p>
                <button 
                  className="task-manage-btn"
                  onClick={() => {
                    localStorage.setItem('active_rider_tab', 'home')
                    window.dispatchEvent(new Event('riderTabChanged'))
                  }}
                >
                  Manage Status
                </button>
              </div>
            </div>
          ) : (
            <div className="rider-empty-state">
              <p>No active delivery assignments found at this moment.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: FULL SCREEN NAVIGATION MAP ── */}
      {activeTab === 'map' && (
        <div className="rider-tab-content full-map-tab">
          <h3>Simulated Route Navigation Map</h3>
          {active ? (
            <div className="full-map-card">
              <div className="map-meta-row">
                <span>Paldi, Ahmedabad Map (Simulated Live)</span>
                <span className="eta-badge">ETA: {active.eta || 15} mins</span>
              </div>
              <svg viewBox="0 0 400 240" className="rider-map-svg">
                {/* Roads */}
                <path d="M 50 120 Q 200 40 350 120" fill="none" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
                <path d="M 50 120 Q 200 40 350 120" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="8,8" strokeLinecap="round" />
                
                {/* Shop Node */}
                <circle cx="50" cy="120" r="14" fill="#1e293b" stroke="#0891b2" strokeWidth="3" />
                <text x="50" y="100" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">Paldi Store</text>
                
                {/* Customer Node */}
                <circle cx="350" cy="120" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="3" />
                <text x="350" y="100" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">Customer</text>
                
                {/* Rider Node */}
                <circle cx="200" cy="80" r="10" fill="#6366f1" />
                <text x="200" y="65" fill="#6366f1" fontSize="11" fontWeight="bold" textAnchor="middle">Rider (You)</text>
              </svg>
              <div className="map-instructions">
                <p><strong>Turn right on Paldi Cross Roads</strong></p>
                <p className="sub">Remaining distance: 1.2 km</p>
              </div>
            </div>
          ) : (
            <div className="rider-empty-state">
              <p>No active route map available. Go online and wait for a delivery assignment.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: DELIVERIES HISTORY LOG ── */}
      {activeTab === 'history' && (
        <div className="rider-tab-content">
          <h3>Completed Deliveries Log</h3>
          
          <div className="rider-history-summary-card">
            <div className="summary-col">
              <span className="lbl">Total Drops</span>
              <span className="val">{data.completed_deliveries || 0}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-col">
              <span className="lbl">Total Earnings</span>
              <span className="val">₹{parseFloat(data.total_earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-col">
              <span className="lbl">Rating</span>
              <span className="val">⭐ {parseFloat(data.rating || 5.0).toFixed(1)}</span>
            </div>
          </div>

          <div className="rider-history-list">
            {data.completed_history && data.completed_history.length > 0 ? (
              data.completed_history.map(item => (
                <div key={item.id} className="history-item">
                  <div>
                    <h4>Order #{item.order_id}</h4>
                    <p>{item.shop_name} · {item.delivery_address}</p>
                    <span className="history-time-txt">{item.completed_at}</span>
                  </div>
                  <div className="history-right">
                    <span className="pay-amount">+ ₹{item.earning.toFixed(2)}</span>
                    <span className="rating-tag">5.0 / 5</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="history-item">
                <div>
                  <h4>Lifetime Deliveries Record</h4>
                  <p>Total Drops: {data.completed_deliveries} | Standard Earnings: ₹{parseFloat(data.total_earnings || 0).toFixed(2)}</p>
                  <span className="history-time-txt">Historical Seeded Record</span>
                </div>
                <div className="history-right">
                  <span className="pay-amount">+ ₹{parseFloat(data.total_earnings || 0).toFixed(2)}</span>
                  <span className="rating-tag">5.0 / 5</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: PROFILE ── */}
      {activeTab === 'profile' && (
        <div className="rider-tab-content">
          <h3>Partner Profile Details</h3>
          
          <div className="profile-details-card">
            <h4>Personal Info</h4>
            <p><strong>Name:</strong> {data.full_name || user?.username || 'Rider Partner'}</p>
            <p><strong>Phone:</strong> {data.phone || user?.username?.replace('rider_', '') || '9876500013'}</p>
            <p><strong>Email:</strong> {user?.email || 'rider@digibazaar.in'}</p>
          </div>

          <div className="profile-details-card">
            <h4>Performance Stats</h4>
            <p><strong>Total Completed Deliveries:</strong> {data.completed_deliveries} drops</p>
            <p><strong>Total Earnings:</strong> ₹{parseFloat(data.total_earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p><strong>Overall Rating:</strong> ⭐ {parseFloat(data.rating || 5.0).toFixed(2)} / 5.0</p>
          </div>

          <div className="profile-details-card">
            <h4>Vehicle Info</h4>
            <p><strong>Vehicle Type:</strong> {data.vehicle_type}</p>
            <p><strong>Vehicle Number:</strong> {data.vehicle_number}</p>
            <p><strong>Driving License Status:</strong> Verified</p>
          </div>

          <div className="profile-details-card">
            <h4>Bank Payout Details</h4>
            <p><strong>Bank Name:</strong> HDFC Bank Ltd</p>
            <p><strong>Account Number:</strong> *******5432</p>
            <p><strong>UPI ID:</strong> {(data.phone || '9876500013')}@okhdfcbank</p>
            <p><strong>Weekly Payout Status:</strong> PENDING (Settled every Monday)</p>
          </div>

          <button className="rider-logout-btn-card" onClick={logout}>
            LOG OUT FROM PORTAL
          </button>
        </div>
      )}

      <footer className="rider-portal-footer">
        <span>© {new Date().getFullYear()} DigiBazaar Rider Partner</span>
        <span>Safe deliveries, trusted local commerce.</span>
      </footer>
    </div>
  )
}
