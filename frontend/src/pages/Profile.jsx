import React, { useState } from 'react'
import { useMutation } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Lock, Edit, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    username: user?.username || ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await updateProfile(data)
    },
    onSuccess: () => {
      toast.success('Profil mis à jour avec succès')
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour')
    }
  })

  // Mutation pour changer le mot de passe
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success('Mot de passe changé avec succès')
      setIsChangingPassword(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors du changement de mot de passe')
    }
  })

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères')
      return
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    })
  }

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrateur'
      case 'vendeuse':
      case 'vendeur':
        return 'Vendeur/Vendeuse'
      default:
        return role
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-gray-600 mt-2">Gérez vos informations personnelles et vos paramètres de compte</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card d'information générale */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex flex-col items-center text-center">
                <div className="avatar placeholder mb-4">
                  <div className="bg-primary text-primary-content rounded-full w-20">
                    <span className="text-2xl font-bold">
                      {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 
                       user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                </div>
                <h2 className="card-title">
                  {user?.firstName && user?.lastName ? 
                    `${user.firstName} ${user.lastName}` : 
                    user?.username || 'Utilisateur'}
                </h2>
                <div className="badge badge-primary">{getRoleDisplayName(user?.role)}</div>
                <p className="text-sm text-gray-500 mt-2">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire de profil */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">
                  <User className="w-5 h-5 mr-2" />
                  Informations personnelles
                </h3>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setIsEditing(!isEditing)
                    if (!isEditing) {
                      setFormData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        email: user?.email || '',
                        username: user?.username || ''
                      })
                    }
                  }}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {isEditing ? 'Annuler' : 'Modifier'}
                </button>
              </div>

              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Prénom</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Votre prénom"
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
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Votre nom"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nom d'utilisateur</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Nom d'utilisateur"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      className="input input-bordered"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditing}
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 mt-6">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={updateProfileMutation.isLoading}
                    >
                      {updateProfileMutation.isLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Sauvegarder
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Changement de mot de passe */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">
                  <Lock className="w-5 h-5 mr-2" />
                  Sécurité
                </h3>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword)
                    if (!isChangingPassword) {
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      })
                    }
                  }}
                >
                  {isChangingPassword ? <X className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isChangingPassword ? 'Annuler' : 'Changer le mot de passe'}
                </button>
              </div>

              {isChangingPassword && (
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Mot de passe actuel</span>
                      </label>
                      <input
                        type="password"
                        className="input input-bordered"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        required
                        placeholder="Votre mot de passe actuel"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Nouveau mot de passe</span>
                      </label>
                      <input
                        type="password"
                        className="input input-bordered"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        required
                        minLength={6}
                        placeholder="Nouveau mot de passe (min. 6 caractères)"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Confirmer le nouveau mot de passe</span>
                      </label>
                      <input
                        type="password"
                        className="input input-bordered"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        required
                        minLength={6}
                        placeholder="Confirmer le nouveau mot de passe"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={changePasswordMutation.isLoading}
                    >
                      {changePasswordMutation.isLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Changer le mot de passe
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile