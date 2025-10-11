import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Plus, Edit, Trash2, Eye, EyeOff, Search, SortAsc, SortDesc } from 'lucide-react'

const Categories = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#e27d28'
  })

  const queryClient = useQueryClient()

  const { data: categories, isLoading } = useQuery('categories', 
    () => axios.get('/api/categories').then(res => res.data)
  )

  // Filtrer et trier les catégories
  const filteredAndSortedCategories = useMemo(() => {
    if (!categories) return []

    let filtered = categories.filter(category =>
      (category.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Trier les résultats
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === 'productCount') {
        aValue = a.productCount || 0
        bValue = b.productCount || 0
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
  }, [categories, searchTerm, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
  }

  const createMutation = useMutation(
    (data) => axios.post('/api/categories', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories')
        toast.success('Catégorie créée avec succès')
        handleCloseModal()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la création')
      }
    }
  )

  const updateMutation = useMutation(
    ({ id, data }) => axios.put(`/api/categories/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories')
        toast.success('Catégorie mise à jour avec succès')
        handleCloseModal()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour')
      }
    }
  )

  const deleteMutation = useMutation(
    (id) => axios.delete(`/api/categories/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories')
        toast.success('Catégorie désactivée avec succès')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
      }
    }
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      color: '#e27d28'
    })
  }

  const handleToggleActive = (category) => {
    updateMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive }
    })
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Catégories</h1>
          <p className="text-base-content/60">Organisez vos produits par catégories</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Catégorie
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
                  placeholder="Rechercher une catégorie..."
                  className="input input-bordered flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
                <option value="productCount-desc">Nb produits (↓)</option>
                <option value="productCount-asc">Nb produits (↑)</option>
                <option value="createdAt-desc">Plus récent</option>
                <option value="createdAt-asc">Plus ancien</option>
              </select>
            </div>
          </div>

          {/* Statistiques */}
          <div className="stats stats-horizontal mt-4">
            <div className="stat">
              <div className="stat-title">Total</div>
              <div className="stat-value text-primary">{categories?.length || 0}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Affichées</div>
              <div className="stat-value text-secondary">{filteredAndSortedCategories.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Actives</div>
              <div className="stat-value text-success">
                {categories?.filter(c => c.isActive).length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedCategories?.map((category) => (
          <div key={category.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <h2 className="card-title">{category.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleActive(category)}
                    className={`btn btn-sm ${category.isActive ? 'btn-ghost' : 'btn-outline'}`}
                    title={category.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleEdit(category)}
                    className="btn btn-sm btn-ghost"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir désactiver cette catégorie ?')) {
                        deleteMutation.mutate(category.id)
                      }
                    }}
                    className="btn btn-sm btn-ghost text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {category.description && (
                <p className="text-sm text-base-content/60">{category.description}</p>
              )}
              <div className="flex justify-between items-center mt-4">
                <span className={`badge ${category.isActive ? 'badge-success' : 'badge-error'}`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-base-content/60">
                  Créée par {category.createdBy?.username}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingCategory ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Nom *</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input input-bordered"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea textarea-bordered"
                  rows="3"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Couleur</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-12 rounded border-2 border-base-300"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="input input-bordered flex-1"
                    placeholder="#e27d28"
                  />
                </div>
              </div>

              <div className="modal-action">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="btn btn-ghost"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${(createMutation.isLoading || updateMutation.isLoading) ? 'loading' : ''}`}
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  {editingCategory ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories