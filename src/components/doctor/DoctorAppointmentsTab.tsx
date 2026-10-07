import { Calendar as CalendarIcon, Video, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'

interface DoctorAppointmentsTabProps {
  appointments: any[]
  appointmentsLoading: boolean
  appointmentStatusFilter: string
  setAppointmentStatusFilter: (status: string) => void
  onNavigate: (path: string) => void
  onIssuePrescription: (data: { patientId: string; patientName: string; appointmentId?: string; appointmentNumber?: string }) => void
  onMarkAppointmentComplete: (id: string) => void
}

export function DoctorAppointmentsTab({
  appointments,
  appointmentsLoading,
  appointmentStatusFilter,
  setAppointmentStatusFilter,
  onNavigate,
  onIssuePrescription,
  onMarkAppointmentComplete,
}: DoctorAppointmentsTabProps) {
  return (
    <Card className="border-mist-200 bg-white shadow-xs">
      <CardHeader className="p-4 sm:p-5 border-b border-mist-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-ink">Clinical Appointments</CardTitle>
            <CardDescription className="text-xs text-ink-soft">
              Schedule, launch tele-consultations, and issue digital prescriptions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={appointmentStatusFilter}
              onChange={(e) => setAppointmentStatusFilter(e.target.value)}
              className="text-xs border border-mist-200 rounded-lg px-2.5 py-1.5 bg-white text-ink-soft cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {appointmentsLoading ? (
          <div className="p-8 text-center text-xs text-ink-soft">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarIcon className="mx-auto h-10 w-10 text-mist-300 mb-2" />
            <p className="text-xs font-medium text-ink">No appointments found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((a) => (
              <div key={a.id} className="border border-mist-200 rounded-xl p-4 bg-white hover:border-teal-200 transition-all space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[11px] font-mono">
                    {a.appointment_number || 'APT1001'}
                  </Badge>
                  <Badge
                    className={cn(
                      'text-[10px] font-semibold',
                      a.appointment_status === 'confirmed' && 'bg-teal-50 text-teal-700 border-teal-200',
                      a.appointment_status === 'completed' && 'bg-blue-50 text-blue-700 border-blue-200',
                      a.appointment_status === 'cancelled' && 'bg-rose-50 text-rose-600 border-rose-200'
                    )}
                  >
                    {a.appointment_status?.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-bold text-ink text-sm">{a.patient_name || a.patientName || 'Patient'}</h4>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {a.appointment_date} at {a.appointment_time} ({a.appointment_type?.toUpperCase()})
                  </p>
                  <p className="text-[11px] text-ink-soft/80 mt-1 italic">Reason: {a.reason || 'General Consultation'}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-mist-100">
                  <div className="text-[11px] text-ink-soft">
                    Fee: <span className="font-bold text-ink">₹{a.fee || 500}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.appointment_type === 'online' && a.appointment_status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => onNavigate(`/consultation/${a.id}`)}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3 rounded-lg"
                      >
                        <Video className="mr-1 h-3.5 w-3.5" /> Join Room
                      </Button>
                    )}
                    {a.appointment_status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() =>
                          onIssuePrescription({
                            patientId: a.patient_id_code || a.patientId,
                            patientName: a.patient_name || a.patientName,
                            appointmentId: a.id,
                            appointmentNumber: a.appointment_number
                          })
                        }
                        className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 px-3 rounded-lg"
                      >
                        <FileText className="mr-1 h-3.5 w-3.5" /> Upload Rx
                      </Button>
                    )}
                    {a.appointment_status === 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMarkAppointmentComplete(a.id)}
                        className="text-xs h-7 px-2.5"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
