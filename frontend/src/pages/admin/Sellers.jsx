import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'

const Sellers = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingSeller, setEditingSeller] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'vendeuse',
    isActive: true
  })

  const queryClient = useQueryClient()

  // Récupérer les utilisateurs
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => axios.get('/api/users').then(res => res.data.users)
  })

  // Créer un utilisateur
  const createUserMutation = useMutation({
    mutationFn: (data) => axios.post('/api/auth/register', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      setShowModal(false)
      resetForm()
    }
  })

  // Modifier un utilisateur
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => axios.put(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      setShowModal(false)
      resetForm()
    }
  })

  // Supprimer un utilisateur
  const deleteUserMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
    }
  })

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'vendeuse',
      isActive: true
    })
    setEditingSeller(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingSeller) {
      const updateData = { ...formData }
      if (!updateData.password) {
        delete updateData.password // Ne pas envoyer le mot de passe vide
      }
      updateUserMutation.mutate({ id: editingSeller._id, data: updateData })
    } else {
      createUserMutation.mutate(formData)
    }
  }

  const handleEdit = (user) => {
    setEditingSeller(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Laisser vide pour ne pas changer
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      isActive: user.isActive
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      deleteUserMutation.mutate(id)
    }
  }

  const formatLastLogin = (date) => {
    if (!date) return 'Jamais'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    )
  }

  const sellers = users.filter(user => user.role === 'vendeuse')
  const admins = users.filter(user => user.role === 'admin')

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvel Utilisateur
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Total Utilisateurs</div>
          <div className="stat-value text-primary">{users.length}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Vendeurs</div>
          <div className="stat-value text-success">{sellers.length}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Administrateurs</div>
          <div className="stat-value text-warning">{admins.length}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-title">Actifs</div>
          <div className="stat-value text-info">{users.filter(u => u.isActive).length}</div>
        </div>
      </div>

      {/* Table des utilisateurs */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Nom d'utilisateur</th>
                  <th>Email</th>
                  <th>Nom complet</th>
                  <th>Rôle</th>
                  <th>Dernière connexion</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="font-medium">{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      {user.firstName || user.lastName 
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : '-'
                      }
                    </td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                        {user.role === 'admin' ? 'Administrateur' : 'Vendeur'}
                      </span>
                    </td>
                    <td className="text-sm">{formatLastLogin(user.lastLogin)}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-sm btn-outline btn-primary"
                          onClick={() => handleEdit(user)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            className="btn btn-sm btn-outline btn-error"
                            onClick={() => handleDelete(user._id)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun utilisateur trouvé</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingSeller ? 'Modifier l\'Utilisateur' : 'Nouvel Utilisateur'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Nom d'utilisateur *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email *</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Mot de passe {editingSeller ? '(laisser vide pour ne pas changer)' : '*'}
                    </span>
                  </label>
                  <input
                    type="password"
                    className="input input-bordered"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingSeller}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Rôle *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="vendeuse">Vendeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Prénom</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Nom</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-control mt-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Compte actif</span>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                </label>
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
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {createUserMutation.isPending || updateUserMutation.isPending ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    editingSeller ? 'Modifier' : 'Créer'
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

export default Sellers