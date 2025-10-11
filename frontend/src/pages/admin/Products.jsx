import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { Search, Filter, SortAsc, SortDesc, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

const Products = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('all') // all, active, inactive
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    isActive: true
  })

  const queryClient = useQueryClient()

  // Récupérer les produits
  const { data: productsResponse, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => axios.get('/api/products').then(res => res.data)
  })

  const products = productsResponse?.products || []

  // Récupérer les catégories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: () => axios.get('/api/categories').then(res => res.data)
  })

  const categories = categoriesResponse || []

  // Filtrer et trier les produits
  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return []

    let filtered = products.filter(product => {
      const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = !selectedCategory || 
                             (product.categoryInfo && product.categoryInfo.id === parseInt(selectedCategory)) ||
                             (typeof product.category === 'string' && product.category === selectedCategory) ||
                             (typeof product.category === 'number' && product.category === parseInt(selectedCategory))
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && product.isActive) ||
                           (statusFilter === 'inactive' && !product.isActive)

      return matchesSearch && matchesCategory && matchesStatus
    })

    // Trier les résultats
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === 'category') {
        aValue = a.category.name
        bValue = b.category.name
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [products, searchTerm, selectedCategory, statusFilter, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Créer un produit
  const createProductMutation = useMutation({
    mutationFn: (data) => axios.post('/api/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
      setShowModal(false)
      resetForm()
    }
  })

  // Modifier un produit
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => axios.put(`/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
      setShowModal(false)
      resetForm()
    }
  })

  // Supprimer un produit
  const deleteProductMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['products'])
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      isActive: true
    })
    setEditingProduct(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Transformer les données pour le backend (convertir en entier)
    const dataToSend = {
      ...formData,
      category: parseInt(formData.category)
    }
    
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: dataToSend })
    } else {
      createProductMutation.mutate(dataToSend)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.categoryInfo?.id || product.category || '',
      price: product.price,
      isActive: product.isActive
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      deleteProductMutation.mutate(id)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  if (loadingProducts) {
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
        <h1 className="text-3xl font-bold">Gestion des Produits</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau Produit
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="form-control flex-1">
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

            {/* Filtre par catégorie */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par statut */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs seulement</option>
                <option value="inactive">Inactifs seulement</option>
              </select>
            </div>

            {/* Tri */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={`${sortField}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-')
                  setSortField(field)
                  setSortDirection(direction)
                }}
              >
                <option value="name-asc">Nom (A-Z)</option>
                <option value="name-desc">Nom (Z-A)</option>
                <option value="category-asc">Catégorie (A-Z)</option>
                <option value="category-desc">Catégorie (Z-A)</option>
                <option value="price-asc">Prix (↑)</option>
                <option value="price-desc">Prix (↓)</option>
                <option value="createdAt-desc">Plus récent</option>
                <option value="createdAt-asc">Plus ancien</option>
              </select>
            </div>
          </div>

          {/* Statistiques */}
          <div className="stats stats-horizontal mt-4">
            <div className="stat">
              <div className="stat-title">Total</div>
              <div className="stat-value text-primary">{products.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Affichés</div>
              <div className="stat-value text-secondary">{filteredAndSortedProducts.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Actifs</div>
              <div className="stat-value text-success">
                {products.filter(p => p.isActive).length}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">Prix Moyen</div>
              <div className="stat-value text-accent">
                {products.length > 0 ? formatPrice(products.reduce((acc, p) => acc + p.price, 0) / products.length) : '0 €'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table des produits */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Catégorie</th>
                  <th>Prix</th>
                  <th>Description</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8">
                      <div className="text-base-content/50">
                        {searchTerm || selectedCategory || statusFilter !== 'all' 
                          ? 'Aucun produit ne correspond aux critères de recherche'
                          : 'Aucun produit trouvé'
                        }
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="font-medium">{product.name}</td>
                    <td>
                      <span className="badge badge-outline">
                        {product.categoryInfo?.name || 'Non définie'}
                      </span>
                    </td>
                    <td className="font-bold text-primary">{formatPrice(product.price)}</td>
                    <td className="max-w-xs truncate">{product.description || '-'}</td>
                    <td>
                      <span className={`badge ${product.isActive ? 'badge-success' : 'badge-error'}`}>
                        {product.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-sm btn-outline btn-primary"
                          onClick={() => handleEdit(product)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline btn-error"
                          onClick={() => handleDelete(product.id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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

      {/* Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Nom *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Catégorie *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Prix (€) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Produit actif</span>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                >
                  {createProductMutation.isPending || updateProductMutation.isPending ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    editingProduct ? 'Modifier' : 'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products