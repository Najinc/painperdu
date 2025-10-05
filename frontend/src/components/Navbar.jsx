import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LogOut, 
  User, 
  Settings, 
  ShoppingBag,
  Users,
  Calendar,
  BarChart3,
  Package,
  ClipboardList,
  Home
} from 'lucide-react'

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!isAuthenticated || location.pathname === '/login') {
    return null
  }

  const adminMenuItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/categories', label: 'Catégories', icon: Package },
    { path: '/admin/products', label: 'Produits', icon: ShoppingBag },
    { path: '/admin/sellers', label: 'Vendeurs', icon: Users },
    { path: '/admin/inventories', label: 'Inventaires', icon: ClipboardList },
    { path: '/admin/schedules', label: 'Plannings', icon: Calendar },
    { path: '/admin/statistics', label: 'Statistiques', icon: BarChart3 }
  ]

  const sellerMenuItems = [
    { path: '/seller', label: 'Dashboard', icon: Home },
    { path: '/seller/products', label: 'Produits', icon: ShoppingBag },
    { path: '/seller/inventory', label: 'Inventaire', icon: ClipboardList },
    { path: '/seller/schedule', label: 'Mon Planning', icon: Calendar }
  ]

  const menuItems = user?.role === 'admin' ? adminMenuItems : sellerMenuItems

  return (
    <div className="navbar bg-primary text-primary-content shadow-lg">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 text-base-content rounded-box w-52">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className={location.pathname === item.path ? 'active' : ''}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
        <Link to={user?.role === 'admin' ? '/admin' : '/seller'} className="btn btn-ghost text-xl">
          🥖 PainPerdu
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link 
                  to={item.path}
                  className={`flex items-center gap-2 ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="navbar-end">
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full bg-secondary flex items-center justify-center">
              <User size={20} />
            </div>
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 text-base-content rounded-box w-52">
            <li className="menu-title">
              <span>{user?.firstName || user?.username}</span>
              <span className="text-xs opacity-60">{user?.role}</span>
            </li>
            <li>
              <Link to="/profile" className="flex items-center gap-2">
                <Settings size={16} />
                Profil
              </Link>
            </li>
            <li>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-error"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Navbar