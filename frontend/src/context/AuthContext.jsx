import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loginUser, signupUser, verifyOTP } from '../api/auth'
import { fetchJson } from '../api/api'

const AuthContext = createContext(null)

// Helper to safely parse stored user
function getStoredUser() {
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [authChecked, setAuthChecked] = useState(false)

  // On mount: verify stored token with backend and refresh user data
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setAuthChecked(true)
      return
    }

    // Verify token and get fresh user data from server
    fetchJson('/auth/me/')
      .then(data => {
        if (data && data.user) {
          // Update stored user with fresh server data (role may have changed)
          localStorage.setItem('user', JSON.stringify(data.user))
          setUser(data.user)
        } else {
          // Token invalid / fetch returned null (handled by api.js which fires auth:logout)
          setUser(null)
        }
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setAuthChecked(true)
      })
  }, [])

  // Listen to forced logout events from the API layer (token refresh failure)
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null)
    }
    window.addEventListener('auth:logout', handleForceLogout)
    return () => window.removeEventListener('auth:logout', handleForceLogout)
  }, [])

  const login = useCallback(async (credentials) => {
    let data
    if (credentials.phone && credentials.otp) {
      data = await verifyOTP({ phone: credentials.phone, otp: credentials.otp, role: credentials.role })
    } else {
      const payload = credentials.phone ? {
        username: `user_${credentials.phone}`,
        password: 'OTPVerified123!'
      } : credentials
      data = await loginUser(payload)
    }

    if (data && data.access) {
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true, user: data.user }
    }
    return { success: false, error: data?.detail || 'Login failed' }
  }, [])

  const signup = useCallback(async (formData) => {
    const payload = {
      username: `user_${formData.phone}`,
      email: formData.email || `${formData.phone}@digibazaar.in`,
      password: 'OTPVerified123!',
      phone: formData.phone,
      role: formData.role || 'customer'
    }

    const data = await signupUser(payload)
    if (data && data.access) {
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true, user: data.user }
    }
    return { success: false, error: data?.detail || 'Signup failed' }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    // Clear portal-specific state so tabs don't persist across sessions
    localStorage.removeItem('active_shop_tab')
    localStorage.removeItem('active_rider_tab')
    setUser(null)
  }, [])

  // Show minimal loading screen during token verification (prevents flash of wrong page)
  if (!authChecked) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid #334155',
          borderTopColor: '#4ade80',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: '#94a3b8', fontSize: '14px', fontFamily: 'system-ui' }}>
          Loading DigiBazaar...
        </span>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null || ctx === undefined) {
    // Fallback to a safe no-op shape to avoid runtime destructure errors
    // when components are rendered outside the provider (e.g. during HMR)
    // This prevents crashes but indicates a mounting issue elsewhere.
    // eslint-disable-next-line no-console
    console.warn('useAuth() called without an AuthProvider - returning fallback')
    return {
      user: null,
      login: async () => ({ success: false, error: 'No provider' }),
      logout: () => {},
      signup: async () => ({ success: false, error: 'No provider' }),
      isLoggedIn: false
    }
  }

  return ctx
}
