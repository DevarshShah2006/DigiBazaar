import { createContext, useContext, useState, useCallback } from 'react'
import { loginUser, signupUser, verifyOTP } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (credentials) => {
    let data;
    if (credentials.phone && credentials.otp) {
      data = await verifyOTP({ phone: credentials.phone, otp: credentials.otp })
    } else {
      const payload = credentials.phone ? {
        username: `user_${credentials.phone}`,
        password: 'OTPVerified123!'
      } : credentials;
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
    // Convert phone to username & email
    const payload = {
      username: `user_${formData.phone}`,
      email: formData.email || `${formData.phone}@digibazaar.in`,
      password: 'OTPVerified123!',
      phone: formData.phone,
      role: formData.role || 'customer'
    }

    const data = await signupUser(payload)
    if (data.access) {
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { success: true, user: data.user }
    }
    return { success: false, error: data.detail || 'Signup failed' }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
