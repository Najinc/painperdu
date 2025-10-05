import React from 'react'
import { useAuth } from '../../contexts/AuthContext'

const SellerDashboard = () => {
  const { user } = useAuth()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bonjour {user?.firstName || user?.username} 👋</h1>
        <p className="text-base-content/60">Bienvenue sur votre espace vendeuse</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Inventaire du Jour</h2>
            <p>Gérez l'ouverture et la fermeture quotidienne</p>
            <div className="card-actions justify-end">
              <a href="/seller/inventory" className="btn btn-primary">Accéder</a>
            </div>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Mon Planning</h2>
            <p>Consultez vos horaires de travail</p>
            <div className="card-actions justify-end">
              <a href="/seller/schedule" className="btn btn-primary">Voir</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SellerDashboard