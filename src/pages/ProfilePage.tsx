import { useState, useEffect } from 'react'
import {
  Pencil,
  Save,
  Building,
  GraduationCap,
  Award,
  IndianRupee,
  MapPin,
  FileText,
  Stethoscope,
  Clock,
  Phone,
  Mail,
  User,
  HeartPulse
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Psychotherapist',
  'Endocrinologist',
  'Diabetologist',
  'Dermatologist',
  'Neurologist',
  'Pediatrician',
  'Orthopedic Surgeon',
  'Gastroenterologist',
  'Pulmonologist',
  'Nephrologist',
  'Other'
]

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const isDoctor = user?.role === 'doctor'

  // Height unit state: 'cm' | 'ft'
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: 0,
    gender: '',
    bloodGroup: '',
    heightCm: 0,
    weightKg: 0,
    smokingHabit: '',
    activityLevel: '',
    dietaryPreference: '',
    allergies: [] as string[],
    existingConditions: [] as string[],
    feet: 0,
    inches: 0,
    // Doctor specific fields
    hospitalName: '',
    specialization: '',
    experienceYears: 0,
    qualification: '',
    medicalLicense: '',
    consultationFee: 500,
    clinicAddress: '',
    bio: '',
    consultationType: 'Both',
  })

  // Helper conversions
  const cmToFtIn = (cm: number) => {
    if (!cm || cm <= 0) return { feet: 0, inches: 0 }
    const totalInches = cm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    if (inches === 12) {
      return { feet: feet + 1, inches: 0 }
    }
    return { feet, inches }
  }

  const ftInToCm = (feet: number, inches: number) => {
    const totalInches = (Number(feet) || 0) * 12 + (Number(inches) || 0)
    return Math.round(totalInches * 2.54)
  }

  useEffect(() => {
    if (user) {
      const blood = user.bloodGroup || user.blood_type || ''
      const height = user.heightCm || user.height_cm || 0
      const weight = user.weightKg || user.weight_kg || 0
      const smoking = user.smokingHabit || user.smoking_habit || ''
      const activity = user.activityLevel || user.activity_level || ''
      const diet = user.dietaryPreference || user.dietary_preference || ''
      const allergiesList = Array.isArray(user.allergies) ? user.allergies : []
      const conditionsList = Array.isArray(user.existingConditions) ? user.existingConditions : []
      const { feet, inches } = cmToFtIn(height)

      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        age: user.age || 0,
        gender: user.gender || '',
        bloodGroup: blood,
        heightCm: height,
        weightKg: weight,
        smokingHabit: smoking,
        activityLevel: activity,
        dietaryPreference: diet,
        allergies: allergiesList,
        existingConditions: conditionsList,
        feet,
        inches,
        hospitalName: user.hospitalName || (user as any).hospital_name || 'Apex Super Specialty Hospital',
        specialization: user.specialization || 'General Physician',
        experienceYears: user.experienceYears || (user as any).experience_years || 8,
        qualification: user.qualification || 'MBBS, MD',
        medicalLicense: user.medicalLicense || (user as any).medical_license || 'MCI-84920',
        consultationFee: user.consultationFee || (user as any).consultation_fee || 500,
        clinicAddress: user.clinicAddress || (user as any).clinic_address || 'MedAssist Health Center, Suite 302, Medical City',
        bio: user.bio || 'Experienced healthcare specialist dedicated to evidence-based medical consulting and personalized patient care.',
        consultationType: user.consultationType || (user as any).consultation_type || 'Both',
      })
    }
  }, [user])

  const handleHeightCmChange = (cmVal: number) => {
    const { feet, inches } = cmToFtIn(cmVal)
    setFormData((prev) => ({
      ...prev,
      heightCm: cmVal,
      feet,
      inches,
    }))
  }

  const handleFtInChange = (newFeet: number, newInches: number) => {
    const calculatedCm = ftInToCm(newFeet, newInches)
    setFormData((prev) => ({
      ...prev,
      feet: newFeet,
      inches: newInches,
      heightCm: calculatedCm,
    }))
  }

  const displayName = formData.name || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const calculatedBmi =
    formData.heightCm > 0 && formData.weightKg > 0
      ? Number((formData.weightKg / Math.pow(formData.heightCm / 100, 2)).toFixed(1))
      : null

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isDoctor) {
        await api.updateProfile({
          name: formData.name,
          phone: formData.phone,
          hospitalName: formData.hospitalName,
          specialization: formData.specialization,
          experienceYears: Number(formData.experienceYears),
          qualification: formData.qualification,
          medicalLicense: formData.medicalLicense,
          consultationFee: Number(formData.consultationFee),
          clinicAddress: formData.clinicAddress,
          bio: formData.bio,
          consultationType: formData.consultationType,
        })
      } else {
        await api.updateProfile({
          name: formData.name,
          phone: formData.phone,
          age: Number(formData.age),
          gender: formData.gender,
          bloodGroup: formData.bloodGroup,
          blood_type: formData.bloodGroup,
          heightCm: Number(formData.heightCm),
          height_cm: Number(formData.heightCm),
          weightKg: Number(formData.weightKg),
          weight_kg: Number(formData.weightKg),
          smokingHabit: formData.smokingHabit,
          activityLevel: formData.activityLevel,
          dietaryPreference: formData.dietaryPreference,
          allergies: formData.allergies,
          existingConditions: formData.existingConditions,
        })
      }
      await refreshUser()
      setEditing(false)
      showToast('Profile updated', 'Your profile details have been saved successfully.', 'success')
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update profile.', 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="font-body space-y-6">
      <PageHeader
        crumbs={['MediAssist AI', 'Profile']}
        title={isDoctor ? 'Doctor Profile & Practice Settings' : 'Personal & Health Profile'}
        description={isDoctor ? 'Manage your hospital affiliation, clinical qualifications, consultation fee, and practice details.' : 'Your personal demographics, vitals, and health preferences.'}
      />

      {/* Main Header Card */}
      <Card className="animate-rise border-mist-200 bg-white shadow-xs rounded-2xl">
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-teal-600/30 shadow-xs">
              <AvatarFallback className="font-display text-lg font-bold text-teal-700 bg-teal-50">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-xl font-bold tracking-tight text-ink">{displayName}</CardTitle>
                {isDoctor && (
                  <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs">
                    {formData.specialization || 'Physician'}
                  </Badge>
                )}
              </div>
              <CardDescription className="font-body text-sm text-ink-soft mt-0.5">{formData.email}</CardDescription>
              {isDoctor ? (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-block rounded-md bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-mono font-semibold text-teal-800">
                    Doctor ID: {user?.doctorId || (user as any)?.doctor_id || 'D000001'}
                  </span>
                  <span className="inline-block rounded-md bg-mist-100 border border-mist-200 px-2.5 py-0.5 text-xs font-medium text-ink-soft">
                    {formData.hospitalName}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-block rounded-md bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-mono font-semibold text-teal-800">
                    Patient ID: {user?.patientId || (user as any)?.patient_id || 'P000001'}
                  </span>
                  {calculatedBmi !== null && (
                    <span className="inline-block rounded-md bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-mono font-semibold text-teal-800">
                      BMI: {calculatedBmi} kg/m²
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                className="text-xs h-9 px-3"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-teal-600 text-white hover:bg-teal-700 font-medium shadow-xs text-xs h-9 px-4 rounded-xl"
              >
                <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setEditing(true)}
              className="bg-teal-600 text-white hover:bg-teal-700 font-medium shadow-xs text-xs h-9 px-4 rounded-xl"
            >
              <Pencil className="h-4 w-4 mr-1.5" /> Edit Profile
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* DOCTOR PROFILE FORM */}
      {isDoctor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Professional Practice & Hospital Details */}
          <Card className="border-mist-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="p-5 border-b border-mist-100">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <Building className="h-4 w-4 text-teal-600" /> Hospital Affiliation & Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hospitalName" className="text-xs font-semibold text-ink-soft">
                  Hospital / Medical Center Name *
                </Label>
                <Input
                  id="hospitalName"
                  disabled={!editing}
                  className="text-xs"
                  placeholder="e.g. Apex Super Specialty Hospital"
                  value={formData.hospitalName}
                  onChange={(e) => setFormData((p) => ({ ...p, hospitalName: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="specialization" className="text-xs font-semibold text-ink-soft">
                  Medical Specialization *
                </Label>
                {editing ? (
                  <select
                    id="specialization"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-ink focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                    value={formData.specialization}
                    onChange={(e) => setFormData((p) => ({ ...p, specialization: e.target.value }))}
                  >
                    {SPECIALIZATIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input id="specialization" disabled className="text-xs bg-mist-50" value={formData.specialization} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="experienceYears" className="text-xs font-semibold text-ink-soft">
                    Experience (Years) *
                  </Label>
                  <div className="relative">
                    <Input
                      id="experienceYears"
                      type="number"
                      min="0"
                      max="70"
                      disabled={!editing}
                      className="text-xs pr-10"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData((p) => ({ ...p, experienceYears: Number(e.target.value) }))}
                    />
                    <span className="absolute right-3 top-2 text-xs text-ink-soft pointer-events-none">yrs</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="consultationFee" className="text-xs font-semibold text-ink-soft">
                    Consultation Fee (₹) *
                  </Label>
                  <div className="relative">
                    <Input
                      id="consultationFee"
                      type="number"
                      min="0"
                      step="50"
                      disabled={!editing}
                      className="text-xs pl-7"
                      value={formData.consultationFee}
                      onChange={(e) => setFormData((p) => ({ ...p, consultationFee: Number(e.target.value) }))}
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-ink-soft pointer-events-none">₹</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qualification" className="text-xs font-semibold text-ink-soft">
                    Qualifications *
                  </Label>
                  <Input
                    id="qualification"
                    disabled={!editing}
                    className="text-xs"
                    placeholder="e.g. MBBS, MD (General Medicine)"
                    value={formData.qualification}
                    onChange={(e) => setFormData((p) => ({ ...p, qualification: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="medicalLicense" className="text-xs font-semibold text-ink-soft">
                    Medical License No. *
                  </Label>
                  <Input
                    id="medicalLicense"
                    disabled={!editing}
                    className="text-xs"
                    placeholder="e.g. MCI-84920"
                    value={formData.medicalLicense}
                    onChange={(e) => setFormData((p) => ({ ...p, medicalLicense: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Practice Location & Consultation Details */}
          <Card className="border-mist-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="p-5 border-b border-mist-100">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-600" /> Clinic Address & Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-ink-soft">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    disabled={!editing}
                    className="text-xs"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="consultationType" className="text-xs font-semibold text-ink-soft">
                    Consultation Mode
                  </Label>
                  {editing ? (
                    <select
                      id="consultationType"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-ink focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      value={formData.consultationType}
                      onChange={(e) => setFormData((p) => ({ ...p, consultationType: e.target.value }))}
                    >
                      <option value="Both">Both (Online & In-Clinic)</option>
                      <option value="Online">Online Video Only</option>
                      <option value="In-Clinic">In-Clinic Only</option>
                    </select>
                  ) : (
                    <Input id="consultationType" disabled className="text-xs bg-mist-50" value={formData.consultationType} />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clinicAddress" className="text-xs font-semibold text-ink-soft">
                  Hospital / Clinic Address
                </Label>
                <Input
                  id="clinicAddress"
                  disabled={!editing}
                  className="text-xs"
                  placeholder="e.g. MedAssist Health Center, Suite 302, Medical City"
                  value={formData.clinicAddress}
                  onChange={(e) => setFormData((p) => ({ ...p, clinicAddress: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-xs font-semibold text-ink-soft">
                  Professional Bio & Clinical Summary
                </Label>
                <textarea
                  id="bio"
                  rows={3}
                  disabled={!editing}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:ring-2 focus-visible:ring-[#0F766E] disabled:bg-mist-50"
                  placeholder="Brief summary of clinical background, clinical philosophy, and specialties..."
                  value={formData.bio}
                  onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PATIENT PROFILE FORM */}
      {!isDoctor && (
        <Card className="border-mist-200 bg-white shadow-xs rounded-2xl">
          <CardHeader className="p-5 border-b border-mist-100">
            <CardTitle className="text-sm font-bold text-ink">Personal & Physical Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Full Name
                </Label>
                <Input
                  id="name"
                  disabled={!editing}
                  className="text-sm text-ink"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Email
                </Label>
                <Input id="email" type="email" disabled className="text-sm text-ink-soft bg-mist-50" value={formData.email} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  disabled={!editing}
                  className="text-sm text-ink"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  disabled={!editing}
                  className="text-sm text-ink"
                  value={formData.age || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, age: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Gender
                </Label>
                {editing ? (
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-ink"
                    value={formData.gender}
                    onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                ) : (
                  <Input id="gender" disabled className="text-sm text-ink bg-mist-50" value={formData.gender || 'Not specified'} />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bloodGroup" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Blood Type
                </Label>
                {editing ? (
                  <select
                    id="bloodGroup"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-ink"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData((p) => ({ ...p, bloodGroup: e.target.value }))}
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input id="bloodGroup" disabled className="text-sm text-ink bg-mist-50 font-medium" value={formData.bloodGroup || 'Not specified'} />
                )}
              </div>

              {/* Height */}
              <div className="space-y-1.5">
                <Label htmlFor="height_cm" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Height (cm)
                </Label>
                <Input
                  id="height_cm"
                  type="number"
                  disabled={!editing}
                  className="text-sm text-ink"
                  value={formData.heightCm || ''}
                  onChange={(e) => handleHeightCmChange(Number(e.target.value))}
                />
              </div>

              {/* Weight */}
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg" className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Weight (kg)
                </Label>
                <Input
                  id="weight_kg"
                  type="number"
                  disabled={!editing}
                  className="text-sm text-ink"
                  value={formData.weightKg || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, weightKg: Number(e.target.value) }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
