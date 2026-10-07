import { Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DoctorSettingsTabProps {
  user: any
  onNavigate: (path: string) => void
}

export function DoctorSettingsTab({ user, onNavigate }: DoctorSettingsTabProps) {
  return (
    <Card className="border-mist-200 bg-white shadow-xs rounded-2xl">
      <CardHeader className="p-5 border-b border-mist-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-ink">Doctor Practice & Clinical Profile</CardTitle>
            <CardDescription className="text-xs text-ink-soft">
              Hospital name, medical specialization, years of experience, fee, and clinical practice details.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigate('/profile')}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Full Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-mist-200 bg-mist-50/50 space-y-2 text-xs">
            <p className="font-bold text-ink text-sm">Professional Information</p>
            <p><strong className="text-ink">Hospital / Center:</strong> {user?.hospitalName || (user as any)?.hospital_name || 'Apex Super Specialty Hospital'}</p>
            <p><strong className="text-ink">Specialization:</strong> {user?.specialization || 'General Physician'}</p>
            <p><strong className="text-ink">Experience:</strong> {user?.experienceYears || (user as any)?.experience_years || 8} years</p>
            <p><strong className="text-ink">Qualifications:</strong> {user?.qualification || 'MBBS, MD'}</p>
            <p><strong className="text-ink">License / Reg:</strong> {user?.medicalLicense || (user as any)?.medical_license || 'MCI-84920'}</p>
          </div>
          <div className="p-4 rounded-xl border border-mist-200 bg-mist-50/50 space-y-2 text-xs">
            <p className="font-bold text-ink text-sm">Practice Details</p>
            <p><strong className="text-ink">Consultation Fee:</strong> ₹{user?.consultationFee || (user as any)?.consultation_fee || 500}</p>
            <p><strong className="text-ink">Consultation Mode:</strong> {user?.consultationType || (user as any)?.consultation_type || 'Both (Online & In-Clinic)'}</p>
            <p><strong className="text-ink">Address:</strong> {user?.clinicAddress || (user as any)?.clinic_address || 'MedAssist Health Center, Suite 302, Medical City'}</p>
            <p><strong className="text-ink">Email:</strong> {user?.email}</p>
            <p><strong className="text-ink">Phone:</strong> {user?.phone || 'Not set'}</p>
          </div>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => onNavigate('/profile')}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 px-4 rounded-xl"
          >
            Go to Profile Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
