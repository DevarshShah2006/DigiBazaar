import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, signupUser, verifyOTP } from '../api/auth'
import { fetchJson, clearCache } from '../api/api'

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
  // Trust the backend role - do not override with localStorage
  // The backend already sets the correct role based on login context
  if (!userData) return userData
  return userData
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [authChecked, setAuthChecked] = useState(false)

  // On mount: verify stored token with backend and refresh user data.
  // Always verify with the server to ensure we have the latest user data and role.
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setAuthChecked(true)
      return
    }

    // Always verify token with backend to get fresh user data
    fetchJson('/auth/me/')
      .then(data => {
        if (data && data.user) {
          // Update stored user with fresh server data
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
      // For OTP login, backend already sets correct role. For regular login, use backend role.
      // If backend role is missing but credentials has role, use that.
      const userData = withActiveRole(data.user)
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
      // Trust the backend role, which should match the requested role
      const userData = withActiveRole(data.user)
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
    // Clear SPA memory cache so the next user doesn't see old data
    clearCache()
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
