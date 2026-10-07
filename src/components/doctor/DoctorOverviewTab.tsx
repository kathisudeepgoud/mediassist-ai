import { useState } from 'react'
import {
  Users,
  CalendarCheck,
  UserPlus,
  CalendarX,
  ShieldAlert,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar as CalendarIcon,
  Video,
  Hospital,
  ChevronDown,
  Filter,
  CheckCircle2,
  Check,
  MoreVertical,
  User as UserIcon,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'

interface DoctorOverviewTabProps {
  stats: any
  statsLoading: boolean
  totalPatientsCount: number
  overallBookingsCount: number
  newAppointmentsCount: number
  canceledAppointmentsCount: number
  highRiskCount: number
  appointmentsToday: any[]
  appointments: any[]
  appointmentsLoading: boolean
  pendingRequests: any[]
  ageCounts: Record<string, number>
  maxAgeCount: number
  ageOverviewRange: 'This Month' | 'Last 3 Months' | 'This Year'
  setAgeOverviewRange: (range: 'This Month' | 'Last 3 Months' | 'This Year') => void
  calendarDays: Array<{ dayNumber: number; dateStr: string; isToday: boolean }>
  selectedDay: number
  setSelectedDay: (day: number) => void
  currentMonthYear: string
  onOpenPatientProfile: (patientId: string) => void
  onMarkAppointmentComplete: (id: string) => void
  onAcceptRequest: (id: string, name: string) => void
  onRejectRequest: (id: string, name: string) => void
  onOpenAddPatient: () => void
  onIssuePrescription: (data: { patientId: string; patientName: string; appointmentId?: string; appointmentNumber?: string }) => void
  onNavigate: (path: string) => void
  onViewAllAppointments: () => void
  onFilterClick: () => void
}

export function DoctorOverviewTab({
  statsLoading,
  totalPatientsCount,
  overallBookingsCount,
  newAppointmentsCount,
  canceledAppointmentsCount,
  highRiskCount,
  appointmentsToday,
  appointments,
  appointmentsLoading,
  pendingRequests,
  ageCounts,
  maxAgeCount,
  ageOverviewRange,
  setAgeOverviewRange,
  calendarDays,
  selectedDay,
  setSelectedDay,
  currentMonthYear,
  onOpenPatientProfile,
  onMarkAppointmentComplete,
  onAcceptRequest,
  onRejectRequest,
  onOpenAddPatient,
  onIssuePrescription,
  onNavigate,
  onViewAllAppointments,
  onFilterClick,
}: DoctorOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT 2/3: 6 KPI CARDS (3x2) + UPCOMING APPOINTMENTS + SCHEDULE LIST */}
      <div className="lg:col-span-8 space-y-6">
        {/* 6 KPI Metric Cards (3 columns x 2 rows) - width equals Upcoming Appointments */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {/* Card 1: Total Patients */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex items-center text-[10px] font-medium text-emerald-600 gap-0.5">
                <span className="text-slate-400 mr-1">Roster</span>
                <TrendingUp className="h-2.5 w-2.5" />
                <span>Active</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-500 font-medium">Total Patients</p>
              <p className="text-xl font-display font-bold text-slate-800 mt-0.5">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : totalPatientsCount}
              </p>
            </div>
          </div>

          {/* Card 2: Overall Bookings */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div className="flex items-center text-[10px] font-medium text-teal-600 gap-0.5">
                <span className="text-slate-400 mr-1">All</span>
                <Check className="h-2.5 w-2.5" />
                <span>Tracked</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-500 font-medium">Overall Bookings</p>
              <p className="text-xl font-display font-bold text-slate-800 mt-0.5">
                {appointmentsLoading ? <Skeleton className="h-6 w-12" /> : overallBookingsCount}
              </p>
            </div>
          </div>

          {/* Card 3: New Appointments */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <UserPlus className="h-4 w-4" />
              </div>
              <div className="flex items-center text-[10px] font-medium text-teal-700 gap-0.5">
                <span className="text-slate-400 mr-1">Status</span>
                <span>Upcoming</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-500 font-medium">New Appointments</p>
              <p className="text-xl font-display font-bold text-slate-800 mt-0.5">
                {appointmentsLoading ? <Skeleton className="h-6 w-12" /> : newAppointmentsCount}
              </p>
            </div>
          </div>

          {/* Card 4: Canceled Appointments */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                <CalendarX className="h-4 w-4" />
              </div>
              <div className="flex items-center text-[10px] font-medium text-rose-500 gap-0.5">
                <span className="text-slate-400 mr-1">Status</span>
                <span>Cancelled</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-500 font-medium">Canceled Appointments</p>
              <p className="text-xl font-display font-bold text-slate-800 mt-0.5">
                {appointmentsLoading ? <Skeleton className="h-6 w-12" /> : canceledAppointmentsCount}
              </p>
            </div>
          </div>

          {/* Card 5: High-Risk Alerts */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="flex items-center text-[10px] font-medium text-amber-600 gap-0.5">
                <span className="text-slate-400 mr-1">ML Risk</span>
                <AlertCircle className="h-2.5 w-2.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-500 font-medium">High-Risk Patients</p>
              <p className="text-xl font-display font-bold text-slate-800 mt-0.5">
                {statsLoading ? <Skeleton className="h-6 w-12" /> : highRiskCount}
              </p>
            </div>
          </div>

          {/* Card 6: Appointments Today */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex items-center text-[10px] font-medium text-teal-700 gap-0.5">
                <span className="text-slate-400 mr-1">Today</span>
                <CalendarIcon className="h-2.5 w-2.5" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-[11px] text-slate-500 font-medium">Appointments Today</p>
              <p className="text-xl font-display font-bold text-slate-800 mt-0.5">
                {appointmentsLoading ? <Skeleton className="h-6 w-12" /> : String(appointmentsToday.length).padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments Calendar Strip */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Upcoming Appointments</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium border border-slate-200 rounded-lg px-2.5 py-1 bg-white">
              <span>{currentMonthYear}</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>

          {/* Horizontal Calendar Date Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            {calendarDays.map((item) => {
              const isSelected = selectedDay === item.dayNumber
              const dayAppts = appointments.filter((a) => a.appointment_date === item.dateStr)

              return (
                <button
                  key={item.dateStr}
                  onClick={() => setSelectedDay(item.dayNumber)}
                  className={cn(
                    'flex flex-col items-center justify-center min-w-[42px] h-[52px] rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer',
                    isSelected
                      ? 'bg-teal-50 border-2 border-teal-600 text-teal-700 shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span>{item.dayNumber}</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isSelected
                          ? 'bg-teal-600'
                          : dayAppts.length > 0
                          ? 'bg-teal-500'
                          : 'bg-slate-300'
                      )}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Schedule List Table */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Schedule List</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onFilterClick}
                className="text-xs text-slate-600 border-slate-200 h-8 px-3 rounded-lg"
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
              </Button>
              <Button
                size="sm"
                onClick={onOpenAddPatient}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-8 px-3 rounded-lg shadow-xs"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add New
              </Button>
            </div>
          </div>

          {appointmentsLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading schedule...</div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-700">No scheduled appointments</p>
              <p className="text-[11px] text-slate-400 mt-1">Booked patient consultations will automatically appear here.</p>
              <Button
                size="sm"
                onClick={onOpenAddPatient}
                className="mt-3 bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Patient
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-mist-50 text-slate-500 font-semibold border-b border-slate-100 rounded-xl">
                    <th className="py-2.5 px-4 rounded-l-xl">Appoint for</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4 text-center">Type</th>
                    <th className="py-2.5 px-4 rounded-r-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {appointments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                            {item.appointment_type === 'online' ? <Video className="h-3.5 w-3.5" /> : <Hospital className="h-3.5 w-3.5" />}
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-[160px]">
                            {item.reason || 'General Consultation'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div
                          className="flex items-center gap-2.5 cursor-pointer"
                          onClick={() => onOpenPatientProfile(item.patient_id_code || item.patientId || item.patient_id)}
                        >
                          <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-800 border border-teal-200">
                            {(item.patient_name || item.patientName || 'P')
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800 hover:text-teal-700 transition-colors">
                            {item.patient_name || item.patientName || 'Registered Patient'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {item.appointment_date}, {item.appointment_time}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          {item.appointment_type === 'online' ? (
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600" title="Online Video Consultation">
                              <Video className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-500" title="In-Clinic Consultation">
                              <Hospital className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs w-48">
                            <DropdownMenuItem onClick={() => onOpenPatientProfile(item.patient_id_code || item.patientId || item.patient_id)}>
                              <UserIcon className="mr-2 h-3.5 w-3.5 text-teal-600" /> View Patient Profile
                            </DropdownMenuItem>
                            {item.appointment_type === 'online' && item.appointment_status === 'confirmed' && (
                              <DropdownMenuItem onClick={() => onNavigate(`/consultation/${item.id}`)}>
                                <Video className="mr-2 h-3.5 w-3.5 text-teal-600" /> Join Tele-Consultation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                onIssuePrescription({
                                  patientId: item.patient_id_code || item.patientId || item.patient_id,
                                  patientName: item.patient_name || item.patientName || 'Patient',
                                  appointmentId: item.id,
                                  appointmentNumber: item.appointment_number || 'APT1001'
                                })
                              }
                            >
                              <FileText className="mr-2 h-3.5 w-3.5 text-purple-600" /> Issue Prescription
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onNavigate(`/messages`)}>
                              <MessageSquare className="mr-2 h-3.5 w-3.5 text-amber-600" /> Send Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {item.appointment_status !== 'completed' && (
                              <DropdownMenuItem onClick={() => onMarkAppointmentComplete(item.id)}>
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Mark as Completed
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT 1/3: PATIENTS OVERVIEW (ENLARGED) + APPOINT REQUEST QUEUE */}
      <div className="lg:col-span-4 space-y-6">
        {/* Patients Overview Chart (enlarged height and width matching Appoint Request) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Patients Overview</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-slate-500 font-medium border border-slate-200 rounded-lg px-2.5 py-1 bg-white hover:bg-slate-50 cursor-pointer">
                  <span>{ageOverviewRange}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => setAgeOverviewRange('This Month')}>This Month</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAgeOverviewRange('Last 3 Months')}>Last 3 Months</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAgeOverviewRange('This Year')}>This Year</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bar Chart Container */}
          <div className="relative pt-2 pb-1">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2">
              <div className="flex flex-col justify-between h-40 text-[10px] text-slate-400 font-mono pr-2">
                <span>{maxAgeCount}</span>
                <span>{Math.round(maxAgeCount * 0.75)}</span>
                <span>{Math.round(maxAgeCount * 0.5)}</span>
                <span>{Math.round(maxAgeCount * 0.25)}</span>
                <span>0</span>
              </div>

              {/* Chart Columns */}
              <div className="flex-1 flex items-end justify-between h-40 border-b border-slate-100 px-2 gap-2">
                {Object.entries(ageCounts).map(([ageGroup, count], idx) => {
                  const heightPercent = maxAgeCount > 0 ? Math.max((count / maxAgeCount) * 125, count > 0 ? 18 : 6) : 6
                  const isHighlighted = ageGroup === '21-29' || idx === 2

                  return (
                    <div key={ageGroup} className="flex flex-col items-center flex-1 group">
                      <span
                        className={cn(
                          'text-[10px] font-bold mb-1 border rounded-full px-1.5 py-0.5 bg-white shadow-xs',
                          isHighlighted ? 'text-teal-700 border-teal-200' : 'text-slate-500 border-slate-200'
                        )}
                      >
                        {String(count).padStart(2, '0')}
                      </span>
                      <div
                        style={{ height: `${heightPercent}px` }}
                        className={cn(
                          'w-full max-w-[36px] rounded-t-lg transition-all duration-300',
                          isHighlighted
                            ? 'bg-teal-600 hover:bg-teal-700 shadow-sm'
                            : count > 0
                            ? 'bg-teal-100/70 hover:bg-teal-200'
                            : 'bg-slate-100 hover:bg-slate-200'
                        )}
                      />
                      <span
                        className={cn(
                          'text-[10px] font-medium mt-2 truncate',
                          isHighlighted ? 'text-teal-700 font-bold' : 'text-slate-400'
                        )}
                      >
                        {ageGroup}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Appoint Request Queue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Appoint Request</h3>
            <button
              onClick={onViewAllAppointments}
              className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
            >
              See All
            </button>
          </div>

          {/* Cards list rendering real pending appointments */}
          {pendingRequests.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle2 className="mx-auto h-8 w-8 text-teal-200 mb-2" />
              <p className="text-xs font-medium text-slate-600">No pending requests</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All appointment requests are processed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-800 shrink-0">
                      {(req.patient_name || req.patientName || 'P')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-xs truncate">{req.patient_name || req.patientName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{req.appointment_date} at {req.appointment_time}</p>
                      <p className="text-[11px] text-teal-700 font-medium mt-0.5">{req.reason || 'Consultation Request'}</p>
                    </div>
                  </div>

                  {/* Action buttons Reject & Accept */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onRejectRequest(req.id, req.patient_name || req.patientName)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors text-center cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onAcceptRequest(req.id, req.patient_name || req.patientName)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors text-center cursor-pointer"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
