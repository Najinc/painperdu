import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Package, Clock, CheckCircle, AlertCircle, Plus, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const Inventory = () => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [inventoryType, setInventoryType] = useState('ouverture')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [inventoryItems, setInventoryItems] = useState([])
  const [notes, setNotes] = useState('')
  const [editingInventory, setEditingInventory] = useState(null)

  const queryClient = useQueryClient()

  // Récupérer les produits pour l'inventaire
  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: () => axios.get('/api/products?isActive=true').then(res => res.data)
  })

  const products = productsResponse?.products || []

  // Récupérer l'inventaire existant pour la date et le type sélectionnés
  const { data: existingInventoryData, refetch: refetchInventory } = useQuery({
    queryKey: ['inventory', selectedDate, inventoryType, user?.id],
    queryFn: () => axios.get(`/api/inventory?userId=${user?.id}&startDate=${selectedDate}&endDate=${selectedDate}`).then(res => res.data),
    enabled: !!user?.id
  })

  const existingInventory = existingInventoryData?.inventories || []

  // Récupérer l'historique des inventaires
  const { data: inventoryHistoryData } = useQuery({
    queryKey: ['inventory-history', user?.id],
    queryFn: () => axios.get(`/api/inventory?userId=${user?.id}&limit=10&sortBy=date&sortOrder=DESC`).then(res => res.data)
  })

  const inventoryHistory = inventoryHistoryData?.inventories || []

  // Charger l'inventaire existant si disponible
  useEffect(() => {
    if (existingInventory && existingInventory.length > 0) {
      // Filtrer par date et type pour trouver l'inventaire correspondant
      const todayInventory = existingInventory.find(inv => {
        const invDate = new Date(inv.date).toISOString().split('T')[0]
        return invDate === selectedDate && inv.type === inventoryType
      })
      
      if (todayInventory) {
        setInventoryItems(todayInventory.items.map(item => ({
          product: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price
        })))
        setNotes(todayInventory.notes || '')
        setEditingInventory(todayInventory)
      } else {
        setInventoryItems([])
        setNotes('')
        setEditingInventory(null)
      }
    } else {
      setInventoryItems([])
      setNotes('')
      setEditingInventory(null)
    }
  }, [existingInventory, selectedDate, inventoryType])

  // Créer ou mettre à jour un inventaire
  const saveInventoryMutation = useMutation({
    mutationFn: (data) => {
      if (editingInventory) {
        return axios.put(`/api/inventory/${editingInventory.id}`, data)
      }
      return axios.post('/api/inventory', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-history'])
      toast.success('Inventaire sauvegardé avec succès!')
    }
  })

  // Confirmer un inventaire
  const confirmInventoryMutation = useMutation({
    mutationFn: (id) => axios.patch(`/api/inventory/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-history'])
      toast.success('Inventaire confirmé!')
    }
  })

  // Filtrer les produits selon la recherche
  const filteredProducts = products.filter(product =>
    (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addProductToInventory = (product) => {
    const existing = inventoryItems.find(item => item.product === product.id)
    if (existing) {
      setInventoryItems(items => items.map(item =>
        item.product === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setInventoryItems(items => [...items, {
        product: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price
      }])
    }
    setShowAddModal(false)
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity < 0) {
      return // Ne pas accepter les quantités négatives
    }
    if (quantity === 0) {
      // Seulement supprimer si l'utilisateur confirme
      if (window.confirm('Voulez-vous vraiment supprimer ce produit de l\'inventaire ?')) {
        setInventoryItems(items => items.filter(item => item.product !== productId))
      }
    } else {
      setInventoryItems(items => items.map(item =>
        item.product === productId ? { ...item, quantity } : item
      ))
    }
  }

  const calculateTotalValue = () => {
    return inventoryItems.reduce((total, item) => total + (item.quantity * item.price), 0)
  }

  const handleSaveInventory = () => {
    const data = {
      date: new Date(selectedDate),
      type: inventoryType,
      seller: user.id,
      items: inventoryItems.map(item => ({
        product: item.product,
        quantity: item.quantity
      })),
      notes,
      totalValue: calculateTotalValue()
    }

    saveInventoryMutation.mutate(data)
  }

  const handleConfirmInventory = () => {
    if (editingInventory && !editingInventory.isConfirmed) {
      confirmInventoryMutation.mutate(editingInventory.id)
    }
  }

  const canConfirm = editingInventory && !editingInventory.isConfirmed && inventoryItems.length > 0

  const isInventoryConfirmed = editingInventory?.isConfirmed
  const canEdit = !isInventoryConfirmed

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Inventaire</h1>
          <p className="text-base-content/70 mt-1">
            Gestion de l'inventaire {inventoryType === 'ouverture' ? 'du matin' : 'du soir'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input input-bordered"
            disabled={!canEdit}
          />
          <select
            value={inventoryType}
            onChange={(e) => setInventoryType(e.target.value)}
            className="select select-bordered"
            disabled={!canEdit}
          >
            <option value="ouverture">Inventaire du matin</option>
            <option value="fermeture">Inventaire du soir</option>
          </select>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Articles</div>
          <div className="stat-value text-primary">{inventoryItems.length}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Quantité totale</div>
          <div className="stat-value text-secondary">
            {inventoryItems.reduce((total, item) => total + item.quantity, 0)}
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Valeur totale</div>
          <div className="stat-value text-accent">
            {calculateTotalValue().toFixed(2)} €
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Statut</div>
          <div className={`stat-value ${isInventoryConfirmed ? 'text-success' : 'text-warning'}`}>
            {isInventoryConfirmed ? <CheckCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>
        </div>
      </div>

      {/* Liste des produits en inventaire */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 pb-0">
            <h2 className="card-title">Produits en inventaire</h2>
            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Ajouter un produit
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {inventoryItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
              <p className="text-base-content/70">Aucun produit en inventaire</p>
              {canEdit && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary mt-4"
                >
                  Commencer l'inventaire
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix unitaire</th>
                    <th>Valeur totale</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.map((item) => (
                    <tr key={item.product}>
                      <td className="font-medium">{item.productName}</td>
                      <td>
                        {canEdit ? (
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product, parseInt(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()} // Sélectionner le texte au focus
                            className="input input-sm input-bordered w-20"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td>{item.price.toFixed(2)} €</td>
                      <td className="font-semibold">{(item.quantity * item.price).toFixed(2)} €</td>
                      {canEdit && (
                        <td>
                          <button
                            onClick={() => updateQuantity(item.product, 0)}
                            className="btn btn-ghost btn-sm text-error"
                          >
                            Supprimer
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes sur l'inventaire..."
            className="textarea textarea-bordered"
            rows="3"
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* Actions */}
      {canEdit && inventoryItems.length > 0 && (
        <div className="flex gap-4 justify-end">
          <button
            onClick={handleSaveInventory}
            className="btn btn-primary"
            disabled={saveInventoryMutation.isLoading}
          >
            <Save className="w-4 h-4" />
            {saveInventoryMutation.isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          {canConfirm && (
            <button
              onClick={handleConfirmInventory}
              className="btn btn-success"
              disabled={confirmInventoryMutation.isLoading}
            >
              <CheckCircle className="w-4 h-4" />
              {confirmInventoryMutation.isLoading ? 'Confirmation...' : 'Confirmer'}
            </button>
          )}
        </div>
      )}

      {isInventoryConfirmed && (
        <div className="alert alert-success">
          <CheckCircle className="w-6 h-6" />
          <span>Inventaire confirmé et verrouillé</span>
        </div>
      )}

      {/* Modal d'ajout de produit */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Ajouter un produit à l'inventaire</h3>
            
            {/* Recherche */}
            <div className="form-control mb-4">
              <div className="input-group">
                <span>
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  className="input input-bordered flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Liste des produits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="card card-compact bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
                  onClick={() => addProductToInventory(product)}
                >
                  <div className="card-body">
                    <h4 className="card-title text-sm">{product.name}</h4>
                    <p className="text-xs text-base-content/70">{product.category.name}</p>
                    <p className="text-sm font-semibold">{product.price.toFixed(2)} €</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setShowAddModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique récent */}
      {inventoryHistory && inventoryHistory.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Historique récent</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Articles</th>
                    <th>Valeur</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryHistory.map((inv) => (
                    <tr key={inv.id}>
                      <td>{format(new Date(inv.date), 'dd/MM/yyyy', { locale: fr })}</td>
                      <td>
                        <span className={`badge ${inv.type === 'ouverture' ? 'badge-primary' : 'badge-secondary'}`}>
                          {inv.type === 'ouverture' ? 'Matin' : 'Soir'}
                        </span>
                      </td>
                      <td>{inv.items.length}</td>
                      <td>{inv.totalValue.toFixed(2)} €</td>
                      <td>
                        {inv.isConfirmed ? (
                          <span className="badge badge-success">Confirmé</span>
                        ) : (
                          <span className="badge badge-warning">En attente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory