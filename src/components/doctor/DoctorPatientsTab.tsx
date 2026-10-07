import { Users, Search, UserPlus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DoctorPatientsTabProps {
  myPatients: any[]
  myPatientsLoading: boolean
  patientSearch: string
  onSearchChange: (value: string) => void
  onOpenAddPatient: () => void
  onOpenPatientProfile: (patientId: string) => void
  onRemovePatient: (patientId: string, patientName: string) => void
}

export function DoctorPatientsTab({
  myPatients,
  myPatientsLoading,
  patientSearch,
  onSearchChange,
  onOpenAddPatient,
  onOpenPatientProfile,
  onRemovePatient,
}: DoctorPatientsTabProps) {
  return (
    <Card className="border-mist-200 bg-white shadow-xs">
      <CardHeader className="p-4 sm:p-5 border-b border-mist-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-ink">My Patients Directory</CardTitle>
            <CardDescription className="text-xs text-ink-soft">
              Permanent roster of patients assigned to your clinical care.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-soft" />
              <Input
                placeholder="Search patient name or ID..."
                value={patientSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 text-xs h-9 bg-mist-50"
              />
            </div>
            <Button
              size="sm"
              onClick={onOpenAddPatient}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-9"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Patient
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {myPatientsLoading ? (
          <div className="p-8 text-center text-xs text-ink-soft">Loading patient directory...</div>
        ) : myPatients.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-mist-300 mb-2" />
            <p className="text-xs font-medium text-ink">No patients found</p>
            <p className="text-[11px] text-ink-soft mt-1">Add patients via their Patient ID or email to access their clinical records.</p>
            <Button
              size="sm"
              onClick={onOpenAddPatient}
              className="mt-4 bg-teal-600 text-white text-xs"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add First Patient
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-mist-50 text-ink-soft border-b border-mist-200">
                  <th className="py-3 px-4 font-semibold">Patient Name</th>
                  <th className="py-3 px-4 font-semibold">Patient ID</th>
                  <th className="py-3 px-4 font-semibold">Demographics</th>
                  <th className="py-3 px-4 font-semibold">Last Appointment</th>
                  <th className="py-3 px-4 font-semibold">Risk Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {myPatients.map((p) => {
                  const isHighRisk = p.risk_level === 'HIGH' || p.high_risk
                  return (
                    <tr key={p.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                            {p.name?.[0]?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{p.name}</p>
                            <p className="text-[10px] text-ink-soft">{p.email || 'Verified Account'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-teal-700 font-semibold">{p.patient_id_code || p.patientId || 'P000001'}</td>
                      <td className="py-3 px-4 text-ink-soft">
                        {p.age ? `${p.age} yrs` : 'N/A'}, {p.gender || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-ink-soft">
                        {p.last_appointment ? new Date(p.last_appointment).toLocaleDateString() : 'No recent visit'}
                      </td>
                      <td className="py-3 px-4">
                        {isHighRisk ? (
                          <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px]">High Risk</Badge>
                        ) : (
                          <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]">Normal</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => onOpenPatientProfile(p.patient_id_code || p.patientId || p.id)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3 rounded-lg"
                          >
                            View Profile
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemovePatient(p.id, p.name)}
                            className="text-ink-soft hover:text-rose-500 h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
