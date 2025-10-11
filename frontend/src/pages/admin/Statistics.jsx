import React, { useState } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'

const Statistics = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
    endDate: new Date().toISOString().split('T')[0]
  })

  // Récupérer les statistiques générales
  const { data: dashboardStats, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => axios.get('/api/statistics/dashboard').then(res => res.data)
  })

  // Récupérer les statistiques par période
  const { data: periodStats, isLoading: loadingPeriod } = useQuery({
    queryKey: ['period-stats', dateRange],
    queryFn: () => axios.get(`/api/statistics/period?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`).then(res => res.data)
  })

  // Récupérer les statistiques par produit
  const { data: productStats, isLoading: loadingProducts } = useQuery({
    queryKey: ['product-stats', dateRange],
    queryFn: () => axios.get(`/api/statistics/products?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`).then(res => res.data)
  })

  // Récupérer les statistiques par vendeur
  const { data: sellerStats, isLoading: loadingSellers } = useQuery({
    queryKey: ['seller-stats', dateRange],
    queryFn: () => axios.get(`/api/statistics/sellers?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`).then(res => res.data)
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const isLoading = loadingDashboard || loadingPeriod || loadingProducts || loadingSellers

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Statistiques</h1>
        
        {/* Sélecteur de période */}
        <div className="flex items-center gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Du :</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Au :</span>
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Statistiques générales */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat bg-primary text-primary-content rounded-lg">
            <div className="stat-figure">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="stat-title text-primary-content">Ventes aujourd'hui</div>
            <div className="stat-value">{formatCurrency(dashboardStats.financial?.estimatedSales || 0)}</div>
          </div>

          <div className="stat bg-success text-success-content rounded-lg">
            <div className="stat-figure">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="stat-title text-success-content">Ventes moy./jour</div>
            <div className="stat-value">{formatCurrency(dashboardStats.salesAnalytics?.averageDailySales || 0)}</div>
            <div className="stat-desc text-success-content">Sur {dashboardStats.salesAnalytics?.periodDays || 30} jours</div>
          </div>

          <div className="stat bg-info text-info-content rounded-lg">
            <div className="stat-figure">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="stat-title text-info-content">Produits actifs</div>
            <div className="stat-value">{dashboardStats.overview?.totalProducts || 0}</div>
          </div>

          <div className="stat bg-warning text-warning-content rounded-lg">
            <div className="stat-figure">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-title text-warning-content">Vendeurs actifs</div>
            <div className="stat-value">{dashboardStats.overview?.totalSellers || 0}</div>
          </div>
        </div>
      )}

      {/* Nouvelle section pour les statistiques détaillées des ventes */}
      {dashboardStats?.salesAnalytics && (
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">📊 Analyse des Ventes (30 derniers jours)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat">
                <div className="stat-title">Total ventes 30j</div>
                <div className="stat-value text-primary">{formatCurrency(dashboardStats.salesAnalytics.totalSalesLast30Days)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Moyenne quotidienne</div>
                <div className="stat-value text-success">{formatCurrency(dashboardStats.salesAnalytics.averageDailySales)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Jours avec ventes</div>
                <div className="stat-value text-info">{dashboardStats.salesAnalytics.numberOfSalesDays}</div>
                <div className="stat-desc">sur {dashboardStats.salesAnalytics.periodDays} jours</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques par période */}
      {periodStats && (
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">Évolution sur la période</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="stat">
                <div className="stat-title">Ventes estimées</div>
                <div className="stat-value text-primary">{formatCurrency(periodStats.summary?.totalEstimatedSales || 0)}</div>
                <div className="stat-desc">
                  {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Stock ouverture</div>
                <div className="stat-value text-info">{formatCurrency(periodStats.summary?.totalOpeningValue || 0)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Stock fermeture</div>
                <div className="stat-value text-warning">{formatCurrency(periodStats.summary?.totalClosingValue || 0)}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Inventaires</div>
                <div className="stat-value text-accent">{periodStats.summary?.totalInventories || 0}</div>
                <div className="stat-desc">Total sur la période</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top produits */}
        {productStats && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Top Produits</h2>
              <div className="overflow-x-auto">
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Quantité</th>
                      <th>CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productStats?.productStats && productStats.productStats.length > 0 ? productStats.productStats.slice(0, 10).map((product, index) => (
                      <tr key={product.product.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="badge badge-primary badge-sm">{index + 1}</div>
                            {product.product.name}
                          </div>
                        </td>
                        <td className="font-bold">{product.soldQuantity}</td>
                        <td className="text-success font-bold">
                          {formatCurrency(product.salesValue)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="text-center text-gray-500 py-8">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {(!productStats?.productStats || productStats.productStats.length === 0) && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Aucune donnée pour cette période</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Performance vendeurs */}
        {sellerStats && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Performance Vendeurs</h2>
              <div className="overflow-x-auto">
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Vendeur</th>
                      <th>Inventaires</th>
                      <th>Valeur totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerStats && sellerStats.length > 0 ? sellerStats.map((seller, index) => (
                      <tr key={seller.seller.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="badge badge-secondary badge-sm">{index + 1}</div>
                            {seller.seller.firstName || seller.seller.name} {seller.seller.lastName || ''}
                          </div>
                        </td>
                        <td className="font-bold">{seller.totalInventories}</td>
                        <td className="text-success font-bold">
                          {formatCurrency(seller.totalValue)}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="text-center text-gray-500 py-8">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {sellerStats.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Aucune donnée pour cette période</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Graphiques simples avec CSS */}
      {productStats?.productStats && productStats.productStats.length > 0 && (
        <div className="card bg-base-100 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title">Répartition des ventes par produit</h2>
            <div className="space-y-3">
              {productStats.productStats.slice(0, 5).map((product) => {
                const topProducts = productStats.productStats.slice(0, 5)
                const maxQuantity = Math.max(...topProducts.map(p => p.soldQuantity || 0))
                const percentage = maxQuantity > 0 ? (product.soldQuantity / maxQuantity) * 100 : 0
                
                return (
                  <div key={product.product.id} className="flex items-center gap-4">
                    <div className="w-32 text-sm truncate">{product.product.name}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-base-300 rounded-full h-4 relative overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-sm font-bold min-w-0">
                          {product.soldQuantity}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Statistics