import React, { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import { 
  Users, 
  Package, 
  ShoppingBag, 
  Calendar,
  TrendingUp,
  Euro,
  Clock,
  AlertCircle
} from 'lucide-react'

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery('dashboard-stats', 
    () => axios.get('/api/statistics/dashboard').then(res => res.data)
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const StatCard = ({ title, value, icon: Icon, color = "primary", subtitle }) => (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="card-title text-lg">{title}</h2>
            <p className="text-3xl font-bold text-primary">{value}</p>
            {subtitle && <p className="text-sm text-base-content/60">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-${color} bg-opacity-20`}>
            <Icon className={`w-8 h-8 text-${color}`} />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Administrateur</h1>
          <p className="text-base-content/60">Vue d'ensemble de votre boulangerie</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-base-content/60">Dernière mise à jour</p>
          <p className="font-semibold">{new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Produits"
          value={stats?.overview?.totalProducts || 0}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Vendeurs"
          value={stats?.overview?.totalSellers || 0}
          icon={Users}
          color="secondary"
        />
        <StatCard
          title="Inventaires d'ouverture"
          value={stats?.overview?.openingInventories || 0}
          icon={ShoppingBag}
          color="success"
          subtitle="Aujourd'hui"
        />
        <StatCard
          title="Inventaires de fermeture"
          value={stats?.overview?.closingInventories || 0}
          icon={Clock}
          color="warning"
          subtitle="Aujourd'hui"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Overview */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Euro className="w-5 h-5" />
              Aperçu Financier du Jour
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Valeur d'ouverture</span>
                <span className="font-bold text-success">{stats?.financial?.openingValue || '0.00'} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Valeur de fermeture</span>
                <span className="font-bold text-warning">{stats?.financial?.closingValue || '0.00'} €</span>
              </div>
              <div className="divider"></div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Ventes estimées</span>
                <span className="font-bold text-primary text-lg">{stats?.financial?.estimatedSales || '0.00'} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <Calendar className="w-5 h-5" />
              Planning d'Aujourd'hui
            </h2>
            <div className="space-y-3">
              {stats?.todaySchedules?.length > 0 ? (
                stats.todaySchedules.map((schedule, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-base-200 rounded-lg">
                    <span className="font-medium">{schedule.seller}</span>
                    <span className="text-sm">{schedule.startTime} - {schedule.endTime}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-base-content/60">
                  Aucun planning pour aujourd'hui
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="/admin/products" className="btn btn-outline btn-primary">
              <Package className="w-4 h-4" />
              Gérer les Produits
            </a>
            <a href="/admin/sellers" className="btn btn-outline btn-secondary">
              <Users className="w-4 h-4" />
              Gérer les Vendeurs
            </a>
            <a href="/admin/schedules" className="btn btn-outline btn-accent">
              <Calendar className="w-4 h-4" />
              Planning
            </a>
            <a href="/admin/statistics" className="btn btn-outline btn-info">
              <TrendingUp className="w-4 h-4" />
              Statistiques
            </a>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.overview?.openingInventories === 0 || stats?.overview?.closingInventories === 0) && (
        <div className="alert alert-warning">
          <AlertCircle className="w-5 h-5" />
          <div>
            <h3 className="font-bold">Attention!</h3>
            <div className="text-xs">
              {stats?.overview?.openingInventories === 0 && "Aucun inventaire d'ouverture aujourd'hui. "}
              {stats?.overview?.closingInventories === 0 && "Aucun inventaire de fermeture aujourd'hui."}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard