import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RefreshCw, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { AddPatientModal } from '@/components/doctor/AddPatientModal'
import { UploadPrescriptionModal } from '@/components/prescriptions/UploadPrescriptionModal'
import { PrescriptionViewModal } from '@/components/prescriptions/PrescriptionViewModal'
import { DietDayDetailsModal } from '@/components/diet/DietDayDetailsModal'
import {
  DoctorOverviewTab,
  DoctorPatientsTab,
  DoctorAppointmentsTab,
  DoctorReportsTab,
  DoctorSettingsTab,
  DoctorPatientProfileView,
} from '@/components/doctor'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'

export default function DoctorDashboardPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentTab = searchParams.get('tab') || 'overview'

  // Dashboard Stats State
  const [stats, setStats] = useState<{
    doctorId: string
    totalPatients: number
    highRiskPatients: number
    newAlerts: number
    upcomingAppointments?: number
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // My Patients List State
  const [myPatients, setMyPatients] = useState<any[]>([])
  const [myPatientsLoading, setMyPatientsLoading] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false)

  // Selected Patient Complete Profile State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [patientProfile, setPatientProfile] = useState<any | null>(null)
  const [patientProfileLoading, setPatientProfileLoading] = useState(false)
  const [patientProfileError, setPatientProfileError] = useState<string | null>(null)
  const [patientDietPlan, setPatientDietPlan] = useState<any | null>(null)
  const [selectedDayModal, setSelectedDayModal] = useState<any | null>(null)
  const [isRefreshingRisk, setIsRefreshingRisk] = useState(false)
  const [activeProfileTab, setActiveProfileTab] = useState<string>('overview')

  // Patient Alerts State
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'NEW' | 'REVIEWED'>('ALL')

  // Doctor Appointments Management State
  const [appointments, setAppointments] = useState<any[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<string>('ALL')
  const [appointmentTypeFilter] = useState<string>('ALL')

  // Prescription Upload Modal State
  const [uploadPrescriptionData, setUploadPrescriptionData] = useState<{
    isOpen: boolean
    patientId: string
    patientName: string
    appointmentId?: string
    appointmentNumber?: string
  }>({
    isOpen: false,
    patientId: '',
    patientName: '',
  })

  // Prescription View Modal State
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null)

  // Calendar Date Filter State
  const todayDate = new Date().getDate()
  const [selectedDay, setSelectedDay] = useState<number>(todayDate)
  const [ageOverviewRange, setAgeOverviewRange] = useState<'This Month' | 'Last 3 Months' | 'This Year'>('This Month')

  const profileSectionRef = useRef<HTMLDivElement | null>(null)

  // Load Dashboard Stats
  const loadDashboardStats = async () => {
    setStatsLoading(true)
    try {
      const res = await api.getDoctorStats()
      setStats(res)
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false)
    }
  }

  // Load My Patients
  const loadMyPatients = async (query = patientSearch) => {
    setMyPatientsLoading(true)
    try {
      const res = await api.getDoctorPatients(query)
      setMyPatients(res.patients || [])
    } catch {
      /* ignore */
    } finally {
      setMyPatientsLoading(false)
    }
  }

  // Load Alerts
  const loadAlerts = async (statusFilter = alertFilter) => {
    setAlertsLoading(true)
    try {
      const res = await api.getDoctorAlerts(statusFilter === 'ALL' ? undefined : statusFilter)
      setAlerts(res.alerts || [])
    } catch {
      /* ignore */
    } finally {
      setAlertsLoading(false)
    }
  }

  // Load Appointments
  const loadAppointments = async () => {
    setAppointmentsLoading(true)
    try {
      const res = await api.getMyAppointments({
        status: appointmentStatusFilter === 'ALL' ? undefined : appointmentStatusFilter,
        type: appointmentTypeFilter === 'ALL' ? undefined : appointmentTypeFilter,
      })
      setAppointments(res.appointments || [])
    } catch {
      /* ignore */
    } finally {
      setAppointmentsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardStats()
    loadAlerts(alertFilter)
    loadMyPatients()
    loadAppointments()
  }, [alertFilter, appointmentStatusFilter, appointmentTypeFilter])

  // Open Complete Patient Profile
  const handleOpenPatientProfile = async (targetId: string) => {
    const cleanId = targetId.trim()
    if (!cleanId) return

    setSelectedPatientId(cleanId)
    setPatientProfileLoading(true)
    setPatientProfileError(null)
    setPatientProfile(null)
    setPatientDietPlan(null)
    setActiveProfileTab('overview')

    if (currentTab !== 'patients') {
      setSearchParams({ tab: 'patients' })
    }

    try {
      const res = await api.getDoctorPatientProfile(cleanId)
      setPatientProfile(res)
      try {
        const dietRes = await api.getCurrentDietPlan(cleanId)
        setPatientDietPlan(dietRes)
      } catch {
        setPatientDietPlan(res.dietPlan || null)
      }

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setPatientProfileError(err.message || 'Unable to open patient profile.')
    } finally {
      setPatientProfileLoading(false)
    }
  }

  // Handle Remove Patient from My Patients
  const handleRemovePatient = async (patientId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to deactivate patient ${patientName} from your My Patients list?`)) return
    try {
      await api.removeDoctorPatient(patientId)
      showToast('Patient Removed', `${patientName} removed from your active patients.`, 'info')
      loadMyPatients()
      loadDashboardStats()
      if (selectedPatientId === patientId) {
        setSelectedPatientId(null)
        setPatientProfile(null)
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to remove patient.', 'danger')
    }
  }

  // Handle Refresh Disease Risk
  const handleRefreshRisk = async () => {
    if (!patientProfile?.patient?.patientId) return
    setIsRefreshingRisk(true)
    try {
      const data = await api.getDoctorPatientProfile(patientProfile.patient.patientId)
      setPatientProfile(data)
      showToast('Risk Analysis Updated', 'ML disease risk predictions updated.', 'success')
    } catch {
      /* ignore */
    } finally {
      setIsRefreshingRisk(false)
    }
  }

  // Handle Alert Review & View Patient
  const handleViewPatientFromAlert = async (alert: any) => {
    try {
      if (alert.status === 'NEW') {
        await api.reviewPatientAlert(alert.id || alert.alertId)
        loadAlerts(alertFilter)
        loadDashboardStats()
      }
    } catch {
      /* ignore */
    }
    handleOpenPatientProfile(alert.patientId)
  }

  // Handle Complete Appointment
  const handleMarkAppointmentComplete = async (apptId: string) => {
    try {
      await api.updateAppointmentStatus(apptId, { status: 'completed' })
      showToast('Appointment Completed', 'Appointment marked as completed.', 'success')
      loadAppointments()
      loadDashboardStats()
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update appointment.', 'danger')
    }
  }

  // Handle Accept / Reject Real Pending Appointment Requests
  const handleAcceptRequest = async (apptId: string, patientName: string) => {
    try {
      await api.updateAppointmentStatus(apptId, { status: 'confirmed' })
      showToast('Appointment Confirmed', `Appointment with ${patientName} confirmed.`, 'success')
      loadAppointments()
      loadDashboardStats()
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to confirm appointment.', 'danger')
    }
  }

  const handleRejectRequest = async (apptId: string, patientName: string) => {
    try {
      await api.updateAppointmentStatus(apptId, { status: 'cancelled' })
      showToast('Appointment Declined', `Declined appointment with ${patientName}.`, 'info')
      loadAppointments()
      loadDashboardStats()
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to cancel appointment.', 'danger')
    }
  }

  // Dynamic Real Metrics Calculation
  const totalPatientsCount = stats?.totalPatients ?? myPatients.length
  const overallBookingsCount = appointments.length
  const newAppointmentsCount = appointments.filter((a) => a.appointment_status === 'pending' || a.appointment_status === 'confirmed').length
  const canceledAppointmentsCount = appointments.filter((a) => a.appointment_status === 'cancelled').length
  const highRiskCount = stats?.highRiskPatients ?? myPatients.filter((p) => p.risk_level === 'HIGH' || p.high_risk).length

  // Calculate Today's Appointments
  const todayStr = new Date().toISOString().split('T')[0]
  const appointmentsToday = appointments.filter((a) => a.appointment_date === todayStr || a.appointment_status === 'confirmed')
  const pendingRequests = appointments.filter((a) => a.appointment_status === 'pending')

  // Real Age Demographic Distribution calculated from myPatients
  const ageCounts = {
    '8-15': myPatients.filter((p) => (p.age || 0) >= 8 && (p.age || 0) <= 15).length,
    '16-20': myPatients.filter((p) => (p.age || 0) >= 16 && (p.age || 0) <= 20).length,
    '21-29': myPatients.filter((p) => (p.age || 0) >= 21 && (p.age || 0) <= 29).length,
    '30-45': myPatients.filter((p) => (p.age || 0) >= 30 && (p.age || 0) <= 45).length,
    '46-60': myPatients.filter((p) => (p.age || 0) >= 46 && (p.age || 0) <= 60).length,
    '61-80': myPatients.filter((p) => (p.age || 0) >= 61 && (p.age || 0) <= 80).length,
  }

  const maxAgeCount = Math.max(...Object.values(ageCounts), 1)

  // Real Calendar Days (Current 14 days)
  const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 2 + i)
    return {
      dayNumber: d.getDate(),
      dateStr: d.toISOString().split('T')[0],
      isToday: d.getDate() === todayDate,
    }
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-mist-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              {currentTab === 'overview' && 'Doctor Clinical Dashboard'}
              {currentTab === 'patients' && 'My Patients Directory'}
              {currentTab === 'appointments' && 'Appointment Management'}
              {currentTab === 'reports' && 'Clinical Reports & High-Risk Alerts'}
              {currentTab === 'settings' && 'Doctor Settings & Availability'}
            </h1>
            <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs font-semibold">
              Dr. {user?.name || stats?.doctorId || 'Physician'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {currentTab === 'overview'
              ? 'Real-time overview of active patients, schedule list, age demographics, and pending appointment requests.'
              : 'Complete longitudinal health records, ML risk predictions, and digital prescription issuance.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadDashboardStats()
              loadAlerts()
              loadMyPatients()
              loadAppointments()
              showToast('Refreshed', 'Doctor Portal synchronized with database.', 'info')
            }}
            className="text-ink-soft hover:text-ink text-xs h-9 border-mist-200"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Sync Portal
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddPatientModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Patient
          </Button>
        </div>
      </div>

      {/* VIEW 1: DASHBOARD OVERVIEW */}
      {currentTab === 'overview' && (
        <DoctorOverviewTab
          stats={stats}
          statsLoading={statsLoading}
          totalPatientsCount={totalPatientsCount}
          overallBookingsCount={overallBookingsCount}
          newAppointmentsCount={newAppointmentsCount}
          canceledAppointmentsCount={canceledAppointmentsCount}
          highRiskCount={highRiskCount}
          appointmentsToday={appointmentsToday}
          appointments={appointments}
          appointmentsLoading={appointmentsLoading}
          pendingRequests={pendingRequests}
          ageCounts={ageCounts}
          maxAgeCount={maxAgeCount}
          ageOverviewRange={ageOverviewRange}
          setAgeOverviewRange={setAgeOverviewRange}
          calendarDays={calendarDays}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          currentMonthYear={currentMonthYear}
          onOpenPatientProfile={handleOpenPatientProfile}
          onMarkAppointmentComplete={handleMarkAppointmentComplete}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
          onIssuePrescription={(data) => setUploadPrescriptionData({ isOpen: true, ...data })}
          onNavigate={navigate}
          onViewAllAppointments={() => setSearchParams({ tab: 'appointments' })}
          onFilterClick={() => showToast('Filter', 'Appointments filter updated.', 'info')}
        />
      )}

      {/* VIEW 2: MY PATIENTS */}
      {currentTab === 'patients' && (
        selectedPatientId ? (
          <DoctorPatientProfileView
            selectedPatientId={selectedPatientId}
            patientProfile={patientProfile}
            patientProfileLoading={patientProfileLoading}
            patientProfileError={patientProfileError}
            patientDietPlan={patientDietPlan}
            activeProfileTab={activeProfileTab}
            setActiveProfileTab={setActiveProfileTab}
            isRefreshingRisk={isRefreshingRisk}
            profileSectionRef={profileSectionRef}
            onClose={() => {
              setSelectedPatientId(null)
              setPatientProfile(null)
            }}
            onIssuePrescription={(data) =>
              setUploadPrescriptionData({
                isOpen: true,
                patientId: data.patientId,
                patientName: data.patientName,
              })
            }
            onRefreshRisk={handleRefreshRisk}
            onSelectDietDay={(day) => setSelectedDayModal(day)}
            onSelectPrescription={(rx) => setSelectedPrescription(rx)}
          />
        ) : (
          <DoctorPatientsTab
            myPatients={myPatients}
            myPatientsLoading={myPatientsLoading}
            patientSearch={patientSearch}
            onSearchChange={(val) => {
              setPatientSearch(val)
              loadMyPatients(val)
            }}
            onOpenAddPatient={() => setIsAddPatientModalOpen(true)}
            onOpenPatientProfile={handleOpenPatientProfile}
            onRemovePatient={handleRemovePatient}
          />
        )
      )}

      {/* VIEW 3: APPOINTMENTS MANAGEMENT */}
      {currentTab === 'appointments' && (
        <DoctorAppointmentsTab
          appointments={appointments}
          appointmentsLoading={appointmentsLoading}
          appointmentStatusFilter={appointmentStatusFilter}
          setAppointmentStatusFilter={setAppointmentStatusFilter}
          onNavigate={navigate}
          onIssuePrescription={(data) => setUploadPrescriptionData({ isOpen: true, ...data })}
          onMarkAppointmentComplete={handleMarkAppointmentComplete}
        />
      )}

      {/* VIEW 4: REPORTS & ALERTS */}
      {currentTab === 'reports' && (
        <DoctorReportsTab
          alerts={alerts}
          alertsLoading={alertsLoading}
          alertFilter={alertFilter}
          onFilterChange={(filter) => {
            setAlertFilter(filter)
            loadAlerts(filter)
          }}
          onReviewPatient={handleViewPatientFromAlert}
        />
      )}

      {/* VIEW 5: DOCTOR SETTINGS */}
      {currentTab === 'settings' && (
        <DoctorSettingsTab user={user} onNavigate={navigate} />
      )}

      {/* COMPLETE PATIENT CLINICAL PROFILE (When opened outside patients tab) */}
      {selectedPatientId && currentTab !== 'patients' && (
        <DoctorPatientProfileView
          selectedPatientId={selectedPatientId}
          patientProfile={patientProfile}
          patientProfileLoading={patientProfileLoading}
          patientProfileError={patientProfileError}
          patientDietPlan={patientDietPlan}
          activeProfileTab={activeProfileTab}
          setActiveProfileTab={setActiveProfileTab}
          isRefreshingRisk={isRefreshingRisk}
          profileSectionRef={profileSectionRef}
          onClose={() => {
            setSelectedPatientId(null)
            setPatientProfile(null)
          }}
          onIssuePrescription={(data) =>
            setUploadPrescriptionData({
              isOpen: true,
              patientId: data.patientId,
              patientName: data.patientName,
            })
          }
          onRefreshRisk={handleRefreshRisk}
          onSelectDietDay={(day) => setSelectedDayModal(day)}
          onSelectPrescription={(rx) => setSelectedPrescription(rx)}
        />
      )}

      {/* MODALS */}
      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onPatientAdded={() => {
          loadMyPatients()
          loadDashboardStats()
        }}
      />

      <UploadPrescriptionModal
        isOpen={uploadPrescriptionData.isOpen}
        onClose={() => setUploadPrescriptionData({ isOpen: false, patientId: '', patientName: '' })}
        patientId={uploadPrescriptionData.patientId}
        patientName={uploadPrescriptionData.patientName}
        appointmentId={uploadPrescriptionData.appointmentId}
        appointmentNumber={uploadPrescriptionData.appointmentNumber}
        onSuccess={() => {
          if (selectedPatientId) handleOpenPatientProfile(selectedPatientId)
          loadAppointments()
        }}
      />

      {selectedPrescription && (
        <PrescriptionViewModal
          isOpen={!!selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
          prescription={selectedPrescription}
        />
      )}

      {selectedDayModal && (
        <DietDayDetailsModal
          isOpen={!!selectedDayModal}
          onClose={() => setSelectedDayModal(null)}
          dayData={selectedDayModal}
        />
      )}
    </div>
  )
}
