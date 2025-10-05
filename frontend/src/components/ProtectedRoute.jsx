import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role) {
    // Support pour un rôle unique ou un tableau de rôles
    const allowedRoles = Array.isArray(role) ? role : [role]
    if (!allowedRoles.includes(user.role)) {
      // Rediriger selon le rôle
      const redirectPath = user.role === 'admin' ? '/admin' : '/seller'
      return <Navigate to={redirectPath} replace />
    }
  }

  return children
}

export default ProtectedRoute