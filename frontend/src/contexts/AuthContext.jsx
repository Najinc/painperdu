import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

// Configuration axios
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
axios.defaults.baseURL = API_URL

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Configuration intercepteur axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/me')
          setUser(response.data.user)
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'authentification:', error)
          logout()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [token])

  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials)
      const { token: newToken, user: userData } = response.data
      
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)
      
      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur de connexion'
      return { success: false, message }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData)
      setUser(response.data.user)
      return { success: true, user: response.data.user }
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour'
      return { success: false, message }
    }
  }

  const changePassword = async (passwordData) => {
    try {
      await axios.put('/api/auth/change-password', passwordData)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Erreur lors du changement de mot de passe'
      return { success: false, message }
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'vendeuse'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}