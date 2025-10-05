import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import AdminDashboard from './pages/admin/AdminDashboard'
import Categories from './pages/admin/Categories'
import Products from './pages/admin/Products'
import Sellers from './pages/admin/Sellers'
import Inventories from './pages/admin/Inventories'
import Schedules from './pages/admin/Schedules'
import Statistics from './pages/admin/Statistics'
import SellerDashboard from './pages/seller/SellerDashboard'
import SellerProducts from './pages/seller/SellerProducts'
import Inventory from './pages/seller/Inventory'
import MySchedule from './pages/seller/MySchedule'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-base-100">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Routes Admin */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute role="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/categories" 
                  element={
                    <ProtectedRoute role="admin">
                      <Categories />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/products" 
                  element={
                    <ProtectedRoute role="admin">
                      <Products />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/sellers" 
                  element={
                    <ProtectedRoute role="admin">
                      <Sellers />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/inventories" 
                  element={
                    <ProtectedRoute role="admin">
                      <Inventories />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/schedules" 
                  element={
                    <ProtectedRoute role="admin">
                      <Schedules />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/statistics" 
                  element={
                    <ProtectedRoute role="admin">
                      <Statistics />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Routes Vendeuse/Vendeur */}
                <Route 
                  path="/seller" 
                  element={
                    <ProtectedRoute role={["vendeuse", "vendeur"]}>
                      <SellerDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/seller/products" 
                  element={
                    <ProtectedRoute role={["vendeuse", "vendeur"]}>
                      <SellerProducts />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/seller/inventory" 
                  element={
                    <ProtectedRoute role={["vendeuse", "vendeur"]}>
                      <Inventory />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/seller/schedule" 
                  element={
                    <ProtectedRoute role={["vendeuse", "vendeur"]}>
                      <MySchedule />
                    </ProtectedRoute>
                  } 
                />
                
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
            <Toaster position="top-right" />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App