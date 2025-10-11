import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Search, Filter, Calendar, User, Package, TrendingUp, Download, Eye } from 'lucide-react'

const Inventories = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeller, setSelectedSeller] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedInventory, setSelectedInventory] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const queryClient = useQueryClient()

  // Récupérer tous les inventaires
  const { data: inventoriesData = {}, isLoading } = useQuery({
    queryKey: ['all-inventories'],
    queryFn: () => axios.get('/api/inventory').then(res => res.data)
  })

  const inventories = inventoriesData.inventories || [];

  // Mutation pour confirmer un inventaire
  const confirmInventoryMutation = useMutation({
    mutationFn: (inventoryId) => axios.patch(`/api/inventory/${inventoryId}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-inventories'])
    },
    onError: (error) => {
      console.error('Erreur lors de la confirmation:', error)
    }
  })

  // Récupérer les vendeurs
  const { data: sellersResponse } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => axios.get('/api/users?role=seller').then(res => res.data)
  })

  const sellers = Array.isArray(sellersResponse) ? sellersResponse : (sellersResponse?.users || [])

  // Filtrer les inventaires
  const filteredInventories = useMemo(() => {
    return inventories.filter(inventory => {
      const matchesSearch = 
        (inventory.sellerInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inventory.notes || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSeller = !selectedSeller || inventory.sellerInfo.id === selectedSeller
      const matchesType = !selectedType || inventory.type === selectedType
      const matchesStatus = !selectedStatus || 
        (selectedStatus === 'confirmed' && inventory.isConfirmed) ||
        (selectedStatus === 'pending' && !inventory.isConfirmed)

      const inventoryDate = new Date(inventory.date).toISOString().split('T')[0]
      const matchesDateFrom = !dateFrom || inventoryDate >= dateFrom
      const matchesDateTo = !dateTo || inventoryDate <= dateTo

      return matchesSearch && matchesSeller && matchesType && matchesStatus && 
             matchesDateFrom && matchesDateTo
    })
  }, [inventories, searchTerm, selectedSeller, selectedType, selectedStatus, dateFrom, dateTo])

  // Statistiques
  const stats = useMemo(() => {
    const totalValue = filteredInventories.reduce((sum, inv) => sum + inv.totalValue, 0)
    const confirmedCount = filteredInventories.filter(inv => inv.isConfirmed).length
    const morningCount = filteredInventories.filter(inv => inv.type === 'ouverture').length
    const eveningCount = filteredInventories.filter(inv => inv.type === 'fermeture').length

    return {
      total: filteredInventories.length,
      totalValue,
      confirmedCount,
      morningCount,
      eveningCount,
      averageValue: filteredInventories.length > 0 ? totalValue / filteredInventories.length : 0
    }
  }, [filteredInventories])

  const viewInventoryDetails = (inventory) => {
    setSelectedInventory(inventory)
    setShowModal(true)
  }

  const confirmInventory = (inventoryId) => {
    if (window.confirm('Êtes-vous sûr de vouloir valider cet inventaire ?')) {
      confirmInventoryMutation.mutate(inventoryId)
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Vendeur', 'Type', 'Statut', 'Articles', 'Valeur', 'Notes']
    const csvData = filteredInventories.map(inv => [
      format(new Date(inv.date), 'dd/MM/yyyy'),
      inv.seller.name,
      inv.type === 'ouverture' ? 'Matin' : 'Soir',
      inv.isConfirmed ? 'Confirmé' : 'En attente',
      inv.items.length,
      inv.totalValue.toFixed(2) + ' €',
      inv.notes || ''
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventaires_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventaires</h1>
          <p className="text-base-content/70">Suivi et analyse des inventaires de tous les vendeurs</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="btn btn-outline mt-4 lg:mt-0"
          disabled={filteredInventories.length === 0}
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat bg-primary text-primary-content rounded-lg">
          <div className="stat-title text-primary-content/70">Total Inventaires</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat bg-success text-success-content rounded-lg">
          <div className="stat-title text-success-content/70">Confirmés</div>
          <div className="stat-value">{stats.confirmedCount}</div>
        </div>
        <div className="stat bg-info text-info-content rounded-lg">
          <div className="stat-title text-info-content/70">Valeur Totale</div>
          <div className="stat-value text-2xl">{stats.totalValue.toFixed(0)} €</div>
        </div>
        <div className="stat bg-warning text-warning-content rounded-lg">
          <div className="stat-title text-warning-content/70">Valeur Moyenne</div>
          <div className="stat-value text-2xl">{stats.averageValue.toFixed(0)} €</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Recherche */}
            <div className="form-control lg:col-span-2">
              <div className="input-group">
                <span>
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="input input-bordered flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Vendeur */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                <option value="">Tous les vendeurs</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">Tous les types</option>
                <option value="ouverture">Matin</option>
                <option value="fermeture">Soir</option>
              </select>
            </div>

            {/* Statut */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="confirmed">Confirmés</option>
                <option value="pending">En attente</option>
              </select>
            </div>

            {/* Date de début */}
            <div className="form-control">
              <input
                type="date"
                className="input input-bordered"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Date de début"
              />
            </div>

            {/* Date de fin */}
            <div className="form-control">
              <input
                type="date"
                className="input input-bordered"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Date de fin"
              />
            </div>
          </div>

          {/* Résumé des filtres */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="badge badge-outline">
              {stats.morningCount} inventaires matin
            </div>
            <div className="badge badge-outline">
              {stats.eveningCount} inventaires soir
            </div>
            <div className="badge badge-outline">
              {stats.confirmedCount}/{stats.total} confirmés
            </div>
          </div>
        </div>
      </div>

      {/* Table des inventaires */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendeur</th>
                  <th>Type</th>
                  <th>Articles</th>
                  <th>Valeur</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventories.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="text-base-content/50">
                        Aucun inventaire ne correspond aux critères sélectionnés
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInventories.map((inventory) => (
                    <tr key={inventory.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(inventory.date), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                          <span className="text-xs text-base-content/60">
                            {format(new Date(inventory.createdAt), 'HH:mm', { locale: fr })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar placeholder">
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                              <span className="text-xs">
                                {(inventory.sellerInfo?.name || inventory.sellerInfo?.firstName || inventory.sellerInfo?.email || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <span>
                            {inventory.sellerInfo?.name || 
                             (inventory.sellerInfo?.firstName && inventory.sellerInfo?.lastName 
                               ? `${inventory.sellerInfo.firstName} ${inventory.sellerInfo.lastName}` 
                               : inventory.sellerInfo?.username || 'Utilisateur inconnu')}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${inventory.type === 'ouverture' ? 'badge-primary' : 'badge-secondary'}`}>
                          {inventory.type === 'ouverture' ? 'Matin' : 'Soir'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          <span>{inventory.items.length}</span>
                        </div>
                      </td>
                      <td className="font-semibold text-accent">
                        {inventory.totalValue.toFixed(2)} €
                      </td>
                      <td>
                        <span className={`badge ${inventory.isConfirmed ? 'badge-success' : 'badge-warning'}`}>
                          {inventory.isConfirmed ? 'Confirmé' : 'En attente'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewInventoryDetails(inventory)}
                            className="btn btn-sm btn-ghost tooltip"
                            data-tip="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!inventory.isConfirmed && (
                            <button
                              onClick={() => confirmInventory(inventory.id)}
                              className="btn btn-sm btn-success tooltip"
                              data-tip="Valider l'inventaire"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal détails d'inventaire */}
      {showModal && selectedInventory && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              Détails de l'inventaire - {selectedinventory.sellerInfo.name}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Date</div>
                <div className="stat-value text-lg">
                  {format(new Date(selectedInventory.date), 'dd/MM/yyyy', { locale: fr })}
                </div>
                <div className="stat-desc">
                  {selectedInventory.type === 'ouverture' ? 'Inventaire du matin' : 'Inventaire du soir'}
                </div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Valeur totale</div>
                <div className="stat-value text-lg text-accent">
                  {selectedInventory.totalValue.toFixed(2)} €
                </div>
                <div className="stat-desc">
                  {selectedInventory.items.length} articles
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedInventory.notes && (
              <div className="card bg-base-200 mb-4">
                <div className="card-body">
                  <h4 className="card-title text-sm">Notes</h4>
                  <p className="text-sm">{selectedInventory.notes}</p>
                </div>
              </div>
            )}

            {/* Articles */}
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix unitaire</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInventory.items.map((item, index) => (
                    <tr key={index}>
                      <td className="font-medium">{item.product.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.product.price.toFixed(2)} €</td>
                      <td className="font-semibold">
                        {(item.quantity * item.product.price).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setShowModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventories