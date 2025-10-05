import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'

const Schedules = () => {
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  const [formData, setFormData] = useState({
    seller: '',
    date: '',
    shift: 'matin',
    notes: ''
  })

  const queryClient = useQueryClient()

  // Récupérer les plannings
  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules', selectedWeek],
    queryFn: () => axios.get(`/api/schedules?week=${selectedWeek}`).then(res => res.data)
  })

  // Récupérer les vendeurs
  const { data: users = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => axios.get('/api/users?role=vendeuse').then(res => res.data.users)
  })

  // Créer un planning
  const createScheduleMutation = useMutation({
    mutationFn: (data) => axios.post('/api/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules'])
      setShowModal(false)
      resetForm()
    }
  })

  // Modifier un planning
  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => axios.put(`/api/schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules'])
      setShowModal(false)
      resetForm()
    }
  })

  // Supprimer un planning
  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => axios.delete(`/api/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules'])
    }
  })

  function getCurrentWeek() {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - today.getDay() + 1)
    return monday.toISOString().split('T')[0]
  }

  const resetForm = () => {
    setFormData({
      seller: '',
      date: '',
      startTime: '08:00',
      endTime: '17:00',
      type: 'travail',
      notes: ''
    })
    setEditingSchedule(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule._id, data: formData })
    } else {
      createScheduleMutation.mutate(formData)
    }
  }

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      seller: schedule.seller._id,
      date: schedule.date.split('T')[0],
      startTime: schedule.startTime || '08:00',
      endTime: schedule.endTime || '17:00',
      type: schedule.type || 'travail',
      notes: schedule.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      deleteScheduleMutation.mutate(id)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getWeekDays = (weekStart) => {
    const days = []
    const start = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getSchedulesForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return schedules.filter(s => 
      s.date.split('T')[0] === dateStr
    ).sort((a, b) => (a.startTime || '08:00').localeCompare(b.startTime || '08:00'))
  }

  const weekDays = getWeekDays(selectedWeek)

  if (loadingSchedules) {
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
        <h1 className="text-3xl font-bold">Gestion des Plannings</h1>
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
          Nouveau Planning
        </button>
      </div>

      {/* Sélection de semaine */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label className="label">
            <span className="label-text font-medium">Semaine du :</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          />
          <button
            className="btn btn-outline"
            onClick={() => setSelectedWeek(getCurrentWeek())}
          >
            Cette semaine
          </button>
        </div>
      </div>

      {/* Calendrier hebdomadaire */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Planning de la semaine</h2>
          <div className="overflow-x-auto">
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th>Jour</th>
                  <th>Plannings</th>
                </tr>
              </thead>
              <tbody>
                {weekDays.map((day) => {
                  const daySchedules = getSchedulesForDay(day)
                  return (
                    <tr key={day.toISOString()}>
                      <td className="font-bold bg-base-200">
                        <div className="text-sm">
                          {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-2">
                        {daySchedules.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {daySchedules.map((schedule) => (
                              <div key={schedule._id} className="dropdown dropdown-hover">
                                <div 
                                  tabIndex={0} 
                                  className="badge badge-primary cursor-pointer p-3"
                                >
                                  {schedule.seller.firstName} {schedule.seller.lastName}
                                  <br />
                                  <span className="text-xs">
                                    {schedule.startTime || '08:00'} - {schedule.endTime || '17:00'}
                                  </span>
                                </div>
                                <div className="dropdown-content card card-compact w-64 p-2 shadow bg-primary text-primary-content">
                                  <div className="card-body">
                                    <h3 className="card-title text-sm">
                                      {schedule.seller.firstName} {schedule.seller.lastName}
                                    </h3>
                                    <p className="text-xs">
                                      {formatDate(schedule.date)} - {schedule.startTime || '08:00'} à {schedule.endTime || '17:00'}
                                    </p>
                                    <p className="text-xs">Type: {schedule.type || 'travail'}</p>
                                    {schedule.notes && (
                                      <p className="text-xs mt-1">Notes: {schedule.notes}</p>
                                    )}
                                    <div className="card-actions justify-end mt-2">
                                      <button 
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => handleEdit(schedule)}
                                      >
                                        Modifier
                                      </button>
                                      <button 
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => handleDelete(schedule._id)}
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">Aucun planning</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Liste des plannings */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Liste des plannings</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Vendeur</th>
                  <th>Date</th>
                  <th>Horaires</th>
                  <th>Type</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule._id}>
                    <td className="font-medium">
                      {schedule.seller.firstName} {schedule.seller.lastName}
                    </td>
                    <td>{formatDate(schedule.date)}</td>
                    <td>
                      <span className="badge badge-outline">
                        {schedule.startTime || '08:00'} - {schedule.endTime || '17:00'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-primary capitalize">
                        {schedule.type || 'travail'}
                      </span>
                    </td>
                    <td className="max-w-xs truncate">{schedule.notes || '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-sm btn-outline btn-primary"
                          onClick={() => handleEdit(schedule)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline btn-error"
                          onClick={() => handleDelete(schedule._id)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schedules.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun planning trouvé pour cette semaine</p>
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
              {editingSchedule ? 'Modifier le Planning' : 'Nouveau Planning'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Vendeur *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.seller}
                    onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un vendeur</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.firstName} {user.lastName} ({user.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Date *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Heure de début *</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Heure de fin *</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Type *</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="travail">Travail</option>
                    <option value="pause">Pause</option>
                    <option value="formation">Formation</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Notes</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes particulières pour ce planning..."
                    rows={3}
                  />
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
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                >
                  {createScheduleMutation.isPending || updateScheduleMutation.isPending ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    editingSchedule ? 'Modifier' : 'Créer'
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

export default Schedules