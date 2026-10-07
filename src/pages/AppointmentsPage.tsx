import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Filter,
  User,
  ExternalLink,
  RotateCw,
  XCircle,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'
import { RazorpayPaymentModal } from '@/components/appointments/RazorpayPaymentModal'
import { PrescriptionViewModal } from '@/components/prescriptions/PrescriptionViewModal'
import { cn } from '@/utils/cn'

export default function AppointmentsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const isDoctor = (user?.role || '').toLowerCase() === 'doctor'
  const activeTab = searchParams.get('tab') || (isDoctor ? 'my-appointments' : 'discover')

  // Doctor discovery & booking state
  const [doctors, setDoctors] = useState<any[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const [doctorSearch, setDoctorSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null)

  // Booking form state
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [bookingTime, setBookingTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<{ time: string; isAvailable: boolean }[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [appointmentType, setAppointmentType] = useState<'online' | 'offline'>('online')
  const [reason, setReason] = useState('')
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // My Appointments state
  const [appointments, setAppointments] = useState<any[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  // Selected prescription view modal
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null)

  // Load available doctors
  const loadDoctors = async () => {
    setDoctorsLoading(true)
    try {
      const res = await api.getAvailableDoctors()
      setDoctors(res.doctors || [])
      if (res.doctors?.length > 0 && !selectedDoctor) {
        setSelectedDoctor(res.doctors[0])
      }
    } catch {
      /* ignore */
    } finally {
      setDoctorsLoading(false)
    }
  }

  // Load appointments
  const loadAppointments = async () => {
    setAppointmentsLoading(true)
    try {
      const res = await api.getMyAppointments({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
      })
      setAppointments(res.appointments || [])
    } catch {
      /* ignore */
    } finally {
      setAppointmentsLoading(false)
    }
  }

  // Load available slots when selectedDoctor or bookingDate changes
  useEffect(() => {
    if (selectedDoctor && bookingDate) {
      setSlotsLoading(true)
      api.getDoctorDetails(selectedDoctor.id, bookingDate)
        .then((res) => {
          setAvailableSlots(res.slots || [])
          const firstAvailable = res.slots?.find((s) => s.isAvailable)?.time || ''
          setBookingTime(firstAvailable)
        })
        .catch(() => {})
        .finally(() => setSlotsLoading(false))
    }
  }, [selectedDoctor, bookingDate])

  useEffect(() => {
    if (!isDoctor) {
      loadDoctors()
    }
    loadAppointments()
  }, [isDoctor, statusFilter, typeFilter])

  const bookingSectionRef = useRef<HTMLDivElement | null>(null)

  const handleSelectDoctorForBooking = (doc: any) => {
    setSelectedDoctor(doc)
    setTimeout(() => {
      bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const handleStartPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoctor) {
      setBookingError('Please select a doctor.')
      return
    }
    if (!bookingDate) {
      setBookingError('Please choose an appointment date.')
      return
    }
    if (!bookingTime) {
      setBookingError('Please select an available time slot.')
      return
    }
    setBookingError(null)
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (paymentRef: string, paymentMethod: string) => {
    setShowPaymentModal(false)
    try {
      const res = await api.bookAppointment({
        doctorId: selectedDoctor.id,
        appointmentDate: bookingDate,
        appointmentTime: bookingTime,
        appointmentType: appointmentType,
        reason: reason || 'General Consultation',
        fee: selectedDoctor.consultationFee || 500,
        paymentMethod,
        paymentReference: paymentRef,
      })

      showToast(
        'Appointment Confirmed',
        `Your ${appointmentType.toUpperCase()} appointment #${res.appointment?.appointmentNumber} with Dr. ${selectedDoctor.name} is confirmed!`,
        'success'
      )

      // Reset form & navigate to my appointments tab
      setReason('')
      setSearchParams({ tab: 'my-appointments' })
      loadAppointments()
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book appointment.')
    }
  }

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    try {
      await api.updateAppointmentStatus(id, { status: 'cancelled' })
      showToast('Appointment Cancelled', 'The appointment has been cancelled successfully.', 'info')
      loadAppointments()
    } catch (err: any) {
      showToast('Error', err.message || 'Unable to cancel appointment.', 'danger')
    }
  }

  const filteredDoctors = doctors.filter((doc) => {
    if (!doctorSearch) return true
    const q = doctorSearch.toLowerCase()
    return (
      doc.name?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q) ||
      doc.clinicAddress?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          crumbs={['MediAssist AI', 'Appointments']}
          title="Clinical Appointments & Consultations"
          description="Book certified doctor consultations with dummy Razorpay test payments, attend online video appointments, or access clinic details."
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full"
      >
        <TabsList className="mb-4 bg-mist-100 p-1">
          {!isDoctor && (
            <TabsTrigger value="discover" className="text-xs font-semibold">
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" /> Book Appointment
            </TabsTrigger>
          )}
          <TabsTrigger value="my-appointments" className="text-xs font-semibold">
            <Calendar className="mr-1.5 h-3.5 w-3.5" /> My Appointments ({appointments.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. DOCTOR DISCOVERY & BOOKING TAB (PATIENT) */}
        {!isDoctor && (
          <TabsContent value="discover" className="space-y-6 animate-rise">
            {/* Doctor Search Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Search doctors by name, specialization, or clinic location..."
                  className="pl-10 text-xs h-10 bg-white"
                />
              </div>
            </div>

            {/* Doctors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctorsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-2xl" />
                ))
              ) : filteredDoctors.length > 0 ? (
                filteredDoctors.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id
                  return (
                    <Card
                      key={doc.id}
                      className={cn(
                        'transition-all cursor-pointer border bg-white rounded-2xl hover:shadow-md',
                        isSelected ? 'border-teal-600 ring-2 ring-teal-600/20' : 'border-mist-200'
                      )}
                      onClick={() => handleSelectDoctorForBooking(doc)}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-display font-bold text-lg shrink-0">
                              {doc.name.replace('Dr. ', '').split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-display font-bold text-sm text-ink">{doc.name}</h4>
                              <p className="text-xs font-medium text-teal-700">
                                {doc.specialization || 'General Physician'} {doc.qualification ? `(${doc.qualification})` : ''}
                              </p>
                              <p className="text-[11px] text-ink-soft">
                                {doc.hospitalName ? `${doc.hospitalName} • ` : ''}{doc.experienceYears || 8}+ yrs exp
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs font-mono font-bold text-teal-800 bg-teal-50 border-teal-200 shrink-0">
                            ₹{doc.consultationFee || 500}
                          </Badge>
                        </div>

                        <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
                          {doc.bio || 'Dedicated clinical specialist focused on accurate patient diagnosis and personalized care.'}
                        </p>

                        <div className="pt-2 border-t border-mist-100 flex items-center justify-between text-xs gap-2">
                          <span className="flex items-center gap-1 text-ink-soft text-[11px] truncate">
                            <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{doc.clinicAddress || 'MedAssist Health Center'}</span>
                          </span>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectDoctorForBooking(doc)
                            }}
                            className={cn(
                              'h-8 text-xs font-semibold px-3.5 rounded-xl transition-all shrink-0',
                              isSelected
                                ? 'bg-teal-700 text-white hover:bg-teal-800 shadow-xs'
                                : 'bg-white text-teal-700 border border-teal-600 hover:bg-teal-50 hover:text-teal-800 shadow-xs'
                            )}
                          >
                            {isSelected ? 'Selected' : 'Select Doctor'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="col-span-full py-12 text-center text-ink-soft">
                  <Stethoscope className="mx-auto h-10 w-10 text-mist-300 mb-2" />
                  <p className="text-sm font-semibold text-ink">No doctors found</p>
                  <p className="text-xs mt-0.5">Try searching with a different specialty or keyword.</p>
                </div>
              )}
            </div>

            {/* Appointment Booking Form Section */}
            {selectedDoctor && (
              <Card ref={bookingSectionRef} id="book-consultation" className="border-teal-200 bg-white shadow-sm rounded-2xl scroll-mt-6">
                <CardHeader className="border-b border-mist-100 pb-4 bg-gradient-to-r from-teal-50/50 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 text-ink">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Book Consultation with {selectedDoctor.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {selectedDoctor.specialization} • Fee: <strong className="text-teal-700 font-mono">₹{selectedDoctor.consultationFee || 500}</strong>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <form onSubmit={handleStartPayment} className="space-y-5">
                    {bookingError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{bookingError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Consultation Type Selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-ink">Consultation Type *</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setAppointmentType('online')}
                            className={cn(
                              'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all',
                              appointmentType === 'online'
                                ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/20 shadow-xs'
                                : 'border-mist-200 hover:bg-mist-50 text-ink-soft'
                            )}
                          >
                            <Video className="h-5 w-5 mb-1.5 text-teal-600" />
                            <span>Online Video</span>
                            <span className="text-[10px] font-normal text-ink-soft mt-0.5">Tele-consultation</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAppointmentType('offline')}
                            className={cn(
                              'flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all',
                              appointmentType === 'offline'
                                ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-600/20 shadow-xs'
                                : 'border-mist-200 hover:bg-mist-50 text-ink-soft'
                            )}
                          >
                            <MapPin className="h-5 w-5 mb-1.5 text-teal-600" />
                            <span>In-Clinic Visit</span>
                            <span className="text-[10px] font-normal text-ink-soft mt-0.5">Offline Hospital OPD</span>
                          </button>
                        </div>
                      </div>

                      {/* Date Picker */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-ink">Appointment Date *</label>
                        <Input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="h-11 text-xs"
                          required
                        />
                      </div>
                    </div>

                    {/* Available Time Slots */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-ink">Available Time Slots for {bookingDate} *</label>
                        {slotsLoading && <span className="text-[11px] text-teal-600">Loading slots...</span>}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {availableSlots.map((slot) => {
                          const isSelected = bookingTime === slot.time
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.isAvailable}
                              onClick={() => setBookingTime(slot.time)}
                              className={cn(
                                'flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium border transition-all',
                                !slot.isAvailable
                                  ? 'bg-mist-100 text-mist-300 border-mist-200 cursor-not-allowed line-through'
                                  : isSelected
                                  ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs'
                                  : 'bg-white text-ink border-mist-200 hover:border-teal-500 hover:bg-teal-50/40'
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              <span>{slot.time}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Reason for Visit */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-ink">Reason for Visit / Symptoms</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Briefly describe your symptoms or reason for consulting the doctor..."
                        rows={2}
                        className="w-full rounded-xl border border-mist-200 p-3 text-xs text-ink focus:border-teal-600 focus:outline-none"
                      />
                    </div>

                    {/* Summary & Proceed to Payment Button */}
                    <div className="pt-4 border-t border-mist-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-ink-soft">
                        Total Payable:{' '}
                        <strong className="text-base font-bold font-mono text-teal-800">
                          ₹{(selectedDoctor.consultationFee || 500).toFixed(2)}
                        </strong>{' '}
                        (inclusive of all taxes)
                      </div>

                      <Button
                        type="submit"
                        disabled={!bookingTime}
                        className="w-full sm:w-auto bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs font-semibold h-11 px-8 shadow-sm"
                      >
                        <CreditCard className="mr-2 h-4 w-4" /> Proceed to Test Razorpay Payment
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Test Razorpay Payment Modal */}
            {selectedDoctor && (
              <RazorpayPaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={handlePaymentSuccess}
                doctorName={selectedDoctor.name}
                fee={selectedDoctor.consultationFee || 500}
                appointmentDate={bookingDate}
                appointmentTime={bookingTime}
                appointmentType={appointmentType}
              />
            )}
          </TabsContent>
        )}

        {/* 2. MY APPOINTMENTS TAB */}
        <TabsContent value="my-appointments" className="space-y-6 animate-rise">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-mist-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-ink-soft flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Status:
              </span>
              {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    statusFilter === st ? 'bg-teal-700 text-white' : 'bg-mist-100 text-ink-soft hover:text-ink'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-ink-soft">Type:</span>
              {['ALL', 'ONLINE', 'OFFLINE'].map((tp) => (
                <button
                  key={tp}
                  onClick={() => setTypeFilter(tp)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    typeFilter === tp ? 'bg-teal-700 text-white' : 'bg-mist-100 text-ink-soft hover:text-ink'
                  )}
                >
                  {tp}
                </button>
              ))}
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {appointmentsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-2xl" />
              ))
            ) : appointments.length > 0 ? (
              appointments.map((appt) => {
                const partnerName = isDoctor ? appt.patientName : appt.doctorName
                const partnerCode = isDoctor ? appt.patientCode : appt.doctorCode
                const isOnline = appt.appointmentType === 'online'
                const isCompleted = appt.appointmentStatus === 'completed'
                const isCancelled = appt.appointmentStatus === 'cancelled'
                const isConfirmed = appt.appointmentStatus === 'confirmed'

                return (
                  <Card key={appt.id} className="border-mist-200 bg-white rounded-2xl shadow-xs transition-all hover:shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Left Details */}
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 font-bold text-base">
                            {partnerName ? partnerName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-display font-bold text-sm text-ink">{partnerName}</h4>
                              <Badge variant="outline" className="font-mono text-[10px] text-teal-700 bg-teal-50">
                                {partnerCode}
                              </Badge>
                              <Badge
                                variant={
                                  isConfirmed ? 'success' : isCompleted ? 'default' : 'danger'
                                }
                                className="text-[10px] uppercase font-bold"
                              >
                                {appt.appointmentStatus}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {isOnline ? (
                                  <span className="flex items-center gap-1 text-teal-700">
                                    <Video className="h-3 w-3" /> ONLINE
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-ink-soft">
                                    <MapPin className="h-3 w-3 text-teal-600" /> OFFLINE
                                  </span>
                                )}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft pt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-teal-600" />
                                {new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-teal-600" />
                                {appt.appointmentTime}
                              </span>
                              <span className="text-[11px] font-mono text-ink-soft">
                                Appt #{appt.appointmentNumber}
                              </span>
                            </div>

                            {appt.reason && (
                              <p className="text-xs text-ink-soft/90 pt-1 line-clamp-1">
                                Reason: <span className="text-ink font-medium">{appt.reason}</span>
                              </p>
                            )}

                            {!isOnline && appt.clinicAddress && (
                              <p className="text-[11px] text-teal-800 bg-teal-50/70 p-1.5 rounded-lg inline-flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 shrink-0 text-teal-600" />
                                Clinic Location: {appt.clinicAddress}
                              </p>
                            )}

                            {appt.doctorNotes && (
                              <p className="text-xs text-teal-900 bg-teal-50 p-2 rounded-lg border border-teal-100 mt-2">
                                <strong>Doctor's Consultation Notes:</strong> {appt.doctorNotes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                          {isOnline && isConfirmed && (
                            <Button
                              size="sm"
                              onClick={() => navigate(appt.meetingLink || `/consultation/${appt.appointmentNumber.toLowerCase()}`)}
                              className="bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs font-semibold h-9"
                            >
                              <Video className="mr-1.5 h-3.5 w-3.5" /> Join Consultation
                            </Button>
                          )}

                          {appt.prescriptionId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedPrescription({
                                  id: appt.prescriptionId,
                                  fileName: appt.prescriptionFileName,
                                  filePath: appt.prescriptionFilePath,
                                  appointmentNumber: appt.appointmentNumber,
                                  appointmentDate: appt.appointmentDate,
                                  doctorName: appt.doctorName,
                                })
                              }
                              className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50 h-9"
                            >
                              <FileText className="mr-1.5 h-3.5 w-3.5" /> View Prescription
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate('/messages')}
                            className="text-xs text-ink-soft hover:text-ink h-9"
                          >
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Messages
                          </Button>

                          {!isDoctor && isConfirmed && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelAppointment(appt.id)}
                              className="text-xs text-rose-600 hover:bg-rose-50 h-9"
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="py-16 text-center text-ink-soft bg-white rounded-2xl border border-mist-200">
                <Calendar className="mx-auto h-12 w-12 text-mist-300 mb-3" />
                <h4 className="font-display font-semibold text-base text-ink">No Appointments Found</h4>
                <p className="text-xs text-ink-soft mt-1">
                  {!isDoctor
                    ? 'You have not booked any appointments yet. Switch to Book Appointment tab to schedule one.'
                    : 'No clinical appointments scheduled under the selected filter.'}
                </p>
                {!isDoctor && (
                  <Button
                    onClick={() => setSearchParams({ tab: 'discover' })}
                    size="sm"
                    className="mt-4 bg-[#0F766E] text-white hover:bg-[#0B5A54] text-xs"
                  >
                    <Stethoscope className="mr-1.5 h-3.5 w-3.5" /> Book Your First Appointment
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Prescription View Modal */}
      <PrescriptionViewModal
        isOpen={Boolean(selectedPrescription)}
        onClose={() => setSelectedPrescription(null)}
        prescription={selectedPrescription}
      />
    </div>
  )
}
