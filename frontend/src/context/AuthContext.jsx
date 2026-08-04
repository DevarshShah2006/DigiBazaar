import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

function getActiveRole() {
  const role = localStorage.getItem('active_login_role')
  return ['customer', 'shopowner', 'rider'].includes(role) ? role : null
}

function withActiveRole(userData) {
  if (!userData || userData.role === 'admin') return userData
  const activeRole = getActiveRole()
  return activeRole ? { ...userData, role: activeRole } : userData
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [authChecked, setAuthChecked] = useState(false)

  // On mount: verify stored token with backend and refresh user data.
  // Uses a session-level flag to avoid re-verifying on every HMR / navigation mount.
  // The server check only needs to happen once per browser session.
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setAuthChecked(true)
      return
    }

    // If already verified this session, use the stored user immediately
    const alreadyVerified = sessionStorage.getItem('auth_verified')
    if (alreadyVerified && getStoredUser()) {
      setAuthChecked(true)
      return
    }

    // First visit this session — verify token and get fresh user data from server
    fetchJson('/auth/me/')
      .then(data => {
        if (data && data.user) {
          // Update stored user with fresh server data while preserving the
          // role selected for this portal session.
          const userData = withActiveRole(data.user)
          localStorage.setItem('user', JSON.stringify(userData))
          setUser(userData)
          // Mark as verified for the rest of this browser session
          sessionStorage.setItem('auth_verified', '1')
        } else {
          // Token invalid / fetch returned null (handled by api.js which fires auth:logout)
          setUser(null)
          sessionStorage.removeItem('auth_verified')
        }
      })
      .catch(() => {
        setUser(null)
        sessionStorage.removeItem('auth_verified')
      })
      .finally(() => {
        setAuthChecked(true)
      })
  }, [])

  // Listen to forced logout events from the API layer (token refresh failure)
  useEffect(() => {
    const handleForceLogout = () => {
      sessionStorage.removeItem('auth_verified')
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
      const loginRole = data.user?.role === 'admin' ? 'admin' : (credentials.role || data.user?.role)
      const userData = loginRole ? { ...data.user, role: loginRole } : data.user
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      if (userData?.role && userData.role !== 'admin') {
        localStorage.setItem('active_login_role', userData.role)
      } else {
        localStorage.removeItem('active_login_role')
      }
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return { success: true, user: userData }
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
      const userData = withActiveRole({ ...data.user, role: payload.role })
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('active_login_role', userData.role)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return { success: true, user: userData }
    }
    return { success: false, error: data?.detail || 'Signup failed' }
  }, [])

  const navigate = useNavigate()

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('active_login_role')
    // Clear portal-specific state so tabs don't persist across sessions
    localStorage.removeItem('active_shop_tab')
    localStorage.removeItem('active_rider_tab')
    // Clear session auth cache so next login re-verifies with the server
    sessionStorage.removeItem('auth_verified')
    setUser(null)
    try {
      navigate('/login')
    } catch (e) {
      window.location.href = '/login'
    }
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, isLoggedIn: !!user, authChecked }}>
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
      isLoggedIn: false,
      authChecked: true
    }
  }

  return ctx
}
