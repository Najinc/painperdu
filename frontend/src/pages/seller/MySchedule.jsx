import React, { useState } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, Clock, ChevronLeft, ChevronRight, User } from 'lucide-react'

const MySchedule = () => {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calculer le début et la fin de la semaine
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Lundi
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  // Récupérer les plannings de la semaine
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['my-schedules', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: () => axios.get(`/api/schedules/my-schedule?startDate=${format(weekStart, 'yyyy-MM-dd')}&endDate=${format(weekEnd, 'yyyy-MM-dd')}`).then(res => res.data)
  })

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction * 7))
    setCurrentDate(newDate)
  }

  const getScheduleForDay = (date) => {
    return schedules.filter(schedule => 
      isSameDay(new Date(schedule.date), date)
    )
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    return `${hours}:${minutes}`
  }

  const getDaysOfWeek = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    return days
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
          <h1 className="text-3xl font-bold">Mon Planning</h1>
          <p className="text-base-content/70">Consultez votre planning de la semaine</p>
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center gap-4 mt-4 lg:mt-0">
          <button 
            onClick={() => navigateWeek(-1)}
            className="btn btn-outline btn-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="text-center">
            <div className="font-semibold">
              {format(weekStart, 'dd MMM', { locale: fr })} - {format(weekEnd, 'dd MMM yyyy', { locale: fr })}
            </div>
            <div className="text-sm text-base-content/60">
              Semaine {format(currentDate, 'w', { locale: fr })}
            </div>
          </div>
          
          <button 
            onClick={() => navigateWeek(1)}
            className="btn btn-outline btn-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Informations utilisateur */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-12">
                <span className="text-xl">
                  {(user?.name || user?.firstName || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h3 className="card-title">
                {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Utilisateur'}
              </h3>
              <p className="text-base-content/60">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Planning hebdomadaire */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {getDaysOfWeek().map((day, index) => {
          const daySchedules = getScheduleForDay(day)
          const isToday = isSameDay(day, new Date())
          
          return (
            <div key={index} className={`card bg-base-100 shadow-xl ${isToday ? 'ring-2 ring-primary' : ''}`}>
              <div className="card-body p-4">
                <h3 className="card-title text-sm justify-center">
                  <div className="text-center">
                    <div className="font-semibold">
                      {format(day, 'EEEE', { locale: fr })}
                    </div>
                    <div className="text-lg font-bold">
                      {format(day, 'dd', { locale: fr })}
                    </div>
                    <div className="text-xs text-base-content/60">
                      {format(day, 'MMM', { locale: fr })}
                    </div>
                  </div>
                </h3>

                <div className="space-y-2 mt-4">
                  {daySchedules.length === 0 ? (
                    <div className="text-center text-base-content/50 py-4">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">Repos</p>
                    </div>
                  ) : (
                    daySchedules.map((schedule) => (
                      <div 
                        key={schedule._id} 
                        className="bg-base-200 rounded-lg p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </span>
                        </div>
                        
                        {schedule.shift && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-secondary" />
                            <span className="text-xs text-base-content/70">
                              {schedule.shift}
                            </span>
                          </div>
                        )}

                        {schedule.notes && (
                          <div className="text-xs text-base-content/60 italic">
                            "{schedule.notes}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Statistiques de la semaine */}
      <div className="card bg-base-100 shadow-xl mt-6">
        <div className="card-body">
          <h3 className="card-title">Résumé de la semaine</h3>
          <div className="stats stats-horizontal">
            <div className="stat">
              <div className="stat-title">Jours travaillés</div>
              <div className="stat-value text-primary">
                {getDaysOfWeek().filter(day => getScheduleForDay(day).length > 0).length}
              </div>
              <div className="stat-desc">sur 7 jours</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total créneaux</div>
              <div className="stat-value text-secondary">{schedules.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Heures estimées</div>
              <div className="stat-value text-accent">
                {schedules.reduce((total, schedule) => {
                  const start = new Date(`2000-01-01T${schedule.startTime}:00`)
                  const end = new Date(`2000-01-01T${schedule.endTime}:00`)
                  return total + (end - start) / (1000 * 60 * 60)
                }, 0).toFixed(1)}h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MySchedule