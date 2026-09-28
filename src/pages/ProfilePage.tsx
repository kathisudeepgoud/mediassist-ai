import { useState, useEffect } from 'react'
import { Pencil, Save } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

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
    .toUpperCase()

  // Calculated BMI
  const calculatedBmi =
    formData.heightCm > 0 && formData.weightKg > 0
      ? Number((formData.weightKg / Math.pow(formData.heightCm / 100, 2)).toFixed(1))
      : null

  const handleSave = async () => {
    setSaving(true)
    try {
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
      await refreshUser()
      setEditing(false)
      showToast('Profile updated', 'Your profile details have been saved successfully.')
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="font-body space-y-6">
      <PageHeader crumbs={['MediAssist AI', 'Profile']} title="Profile" description="Your personal and health information." />

      <Card className="animate-rise border-mist-200 bg-white shadow-sm rounded-2xl">
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-[#0F766E]/30 shadow-xs">
              <AvatarFallback className="font-display text-lg font-bold text-[#0F766E] bg-[#0F766E]/10">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-display text-xl font-bold tracking-tight text-ink">{displayName}</CardTitle>
              <CardDescription className="font-body text-sm text-ink-soft mt-0.5">{formData.email}</CardDescription>
              {user?.role === 'doctor' ? (
                <span className="mt-1.5 inline-block rounded-md bg-[#0F766E]/10 border border-[#0F766E]/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-[#0F766E]">
                  Doctor ID: {user.doctorId || (user as any).doctor_id || 'D000001'}
                </span>
              ) : (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-block rounded-md bg-[#0F766E]/10 border border-[#0F766E]/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-[#0F766E]">
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
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0F766E] text-white hover:bg-[#0B5A54] active:bg-[#073632] font-medium shadow-sm transition-all duration-200 border-none"
            >
              <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          ) : (
            <Button
              onClick={() => setEditing(true)}
              className="bg-[#0F766E] text-white hover:bg-[#0B5A54] active:bg-[#073632] font-medium shadow-sm transition-all duration-200 border-none"
            >
              <Pencil className="h-4 w-4 mr-1.5" /> Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Full Name
              </Label>
              <Input
                id="name"
                disabled={!editing}
                className="font-body text-sm text-ink focus-visible:ring-[#0F766E]"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Email
              </Label>
              <Input id="email" type="email" disabled className="font-body text-sm text-ink-soft bg-mist-50" value={formData.email} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Phone Number
              </Label>
              <Input
                id="phone"
                disabled={!editing}
                className="font-body text-sm text-ink focus-visible:ring-[#0F766E]"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="age" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Age
              </Label>
              <Input
                id="age"
                type="number"
                disabled={!editing}
                className="font-body text-sm text-ink focus-visible:ring-[#0F766E]"
                value={formData.age || ''}
                onChange={(e) => setFormData((p) => ({ ...p, age: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Gender
              </Label>
              {editing ? (
                <select
                  id="gender"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-body text-sm text-ink ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] disabled:cursor-not-allowed disabled:opacity-50"
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
                <Input id="gender" disabled className="font-body text-sm text-ink bg-mist-50" value={formData.gender || 'Not specified'} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bloodGroup" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Blood Type
              </Label>
              {editing ? (
                <select
                  id="bloodGroup"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-body text-sm text-ink ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] disabled:cursor-not-allowed disabled:opacity-50"
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
                <Input id="bloodGroup" disabled className="font-body text-sm text-ink bg-mist-50 font-medium" value={formData.bloodGroup || 'Not specified'} />
              )}
            </div>

            {/* Height Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="height" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Height
                </Label>
                <div className="inline-flex items-center gap-0.5 rounded-full bg-[#0F766E]/10 p-0.5 border border-[#0F766E]/20 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setHeightUnit('cm')}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                      heightUnit === 'cm'
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'text-[#0F766E] hover:bg-[#0F766E]/15'
                    }`}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeightUnit('ft')}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                      heightUnit === 'ft'
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'text-[#0F766E] hover:bg-[#0F766E]/15'
                    }`}
                  >
                    ft / in
                  </button>
                </div>
              </div>

              {heightUnit === 'cm' ? (
                <div className="relative">
                  <Input
                    id="height_cm"
                    type="number"
                    disabled={!editing}
                    placeholder="Height in cm"
                    className="font-body text-sm text-ink focus-visible:ring-[#0F766E] pr-10"
                    value={formData.heightCm || ''}
                    onChange={(e) => handleHeightCmChange(Number(e.target.value))}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-medium text-ink-soft pointer-events-none">cm</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Input
                      id="height_feet"
                      type="number"
                      disabled={!editing}
                      placeholder="Feet"
                      className="font-body text-sm text-ink focus-visible:ring-[#0F766E] pr-9"
                      value={formData.feet || ''}
                      onChange={(e) => handleFtInChange(Number(e.target.value), formData.inches)}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-medium text-ink-soft pointer-events-none">ft</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="height_inches"
                      type="number"
                      disabled={!editing}
                      placeholder="Inches"
                      min={0}
                      max={11}
                      className="font-body text-sm text-ink focus-visible:ring-[#0F766E] pr-9"
                      value={formData.inches || ''}
                      onChange={(e) => handleFtInChange(formData.feet, Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-medium text-ink-soft pointer-events-none">in</span>
                  </div>
                </div>
              )}
              {formData.heightCm > 0 && (
                <p className="text-[11px] font-body text-[#0F766E] font-medium bg-[#0F766E]/10 border border-[#0F766E]/20 px-2 py-0.5 rounded-md inline-block">
                  Equivalent: {formData.heightCm} cm ({formData.feet}' {formData.inches}")
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight_kg" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Weight (kg)
              </Label>
              <div className="relative">
                <Input
                  id="weight_kg"
                  type="number"
                  disabled={!editing}
                  placeholder="Weight in kg"
                  className="font-body text-sm text-ink focus-visible:ring-[#0F766E] pr-9"
                  value={formData.weightKg || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, weightKg: Number(e.target.value) }))}
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-ink-soft pointer-events-none">kg</span>
              </div>
            </div>

            {/* Smoking Habit */}
            <div className="space-y-1.5">
              <Label htmlFor="smoking" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Smoking Habit
              </Label>
              {editing ? (
                <select
                  id="smoking"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-body text-sm text-ink ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                  value={formData.smokingHabit}
                  onChange={(e) => setFormData((p) => ({ ...p, smokingHabit: e.target.value }))}
                >
                  <option value="">Select Smoking Status</option>
                  <option value="Never">Never</option>
                  <option value="Former smoker">Former smoker</option>
                  <option value="Current smoker">Current smoker</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              ) : (
                <Input id="smoking" disabled className="font-body text-sm text-ink bg-mist-50" value={formData.smokingHabit || 'Not specified'} />
              )}
            </div>

            {/* Physical Activity Level */}
            <div className="space-y-1.5">
              <Label htmlFor="activity" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Activity Level
              </Label>
              {editing ? (
                <select
                  id="activity"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-body text-sm text-ink ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                  value={formData.activityLevel}
                  onChange={(e) => setFormData((p) => ({ ...p, activityLevel: e.target.value }))}
                >
                  <option value="">Select Activity Level</option>
                  <option value="Sedentary">Sedentary</option>
                  <option value="Lightly active">Lightly active</option>
                  <option value="Moderately active">Moderately active</option>
                  <option value="Very active">Very active</option>
                </select>
              ) : (
                <Input id="activity" disabled className="font-body text-sm text-ink bg-mist-50" value={formData.activityLevel || 'Not specified'} />
              )}
            </div>

            {/* Dietary Preference */}
            <div className="space-y-1.5">
              <Label htmlFor="diet" className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Dietary Preference
              </Label>
              {editing ? (
                <select
                  id="diet"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-body text-sm text-ink ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                  value={formData.dietaryPreference}
                  onChange={(e) => setFormData((p) => ({ ...p, dietaryPreference: e.target.value }))}
                >
                  <option value="">Select Diet Type</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <Input id="diet" disabled className="font-body text-sm text-ink bg-mist-50" value={formData.dietaryPreference || 'Not specified'} />
              )}
            </div>

            {/* Allergies & Conditions */}
            <div className="space-y-1.5">
              <Label className="font-display text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Allergies & Conditions
              </Label>
              <div className="p-3 rounded-lg border border-mist-200 bg-mist-50/50 text-xs space-y-1">
                <p>
                  <span className="font-semibold text-ink">Allergies:</span>{' '}
                  {formData.allergies && formData.allergies.length > 0 ? formData.allergies.join(', ') : 'None specified'}
                </p>
                <p>
                  <span className="font-semibold text-ink">Conditions:</span>{' '}
                  {formData.existingConditions && formData.existingConditions.length > 0 ? formData.existingConditions.join(', ') : 'None specified'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
