import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

const Login = () => {
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(formData)
      
      if (result.success) {
        toast.success('Connexion réussie!')
        
        // Rediriger selon le rôle
        const redirectPath = result.user.role === 'admin' ? '/admin' : '/seller'
        navigate(redirectPath)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="card w-full max-w-md shadow-2xl bg-base-100">
        <div className="card-body">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-primary mb-2">🥖</h1>
            <h2 className="text-2xl font-bold">PainPerdu</h2>
            <p className="text-base-content/60">Gestion de boulangerie</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email ou nom d'utilisateur</span>
              </label>
              <input
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="admin@painperdu.com"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input input-bordered w-full pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="form-control mt-6">
              <button 
                type="submit" 
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>

          <div className="divider">Compte de test</div>
          
          <div className="bg-base-200 p-4 rounded-lg text-sm">
            <p className="font-semibold mb-2">Comptes de démonstration :</p>
            <div className="space-y-1">
              <p><strong>Admin :</strong> admin@painperdu.com / password</p>
              <p><strong>Vendeuse :</strong> vendeuse@painperdu.com / password</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login