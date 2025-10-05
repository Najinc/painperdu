import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

const Dashboard = () => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Rediriger vers le dashboard approprié selon le rôle
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />
  } else {
    return <Navigate to="/seller" replace />
  }
}

export default Dashboard