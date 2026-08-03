import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'

export default function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
