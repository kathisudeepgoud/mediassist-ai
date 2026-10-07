import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Lock,
  ArrowLeft,
  Stethoscope,
  UserCheck,
  HeartPulse,
  Scale,
  Ruler,
  Cigarette,
  Activity,
  Salad,
  AlertCircle,
  Building,
  GraduationCap,
  Award,
  IndianRupee,
  MapPin,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PulseMark } from '@/components/shared/PulseMark'
import { useAuth, type RegisterPatientData } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']
const SMOKING_OPTIONS = ['Never', 'Former smoker', 'Current smoker', 'Prefer not to say']
const ACTIVITY_OPTIONS = [
  { id: 'Sedentary', label: 'Sedentary (Little/no exercise)' },
  { id: 'Lightly active', label: 'Lightly active (1–3 days/wk)' },
  { id: 'Moderately active', label: 'Moderately active (3–5 days/wk)' },
  { id: 'Very active', label: 'Very active (6–7 days/wk)' }
]
const DIET_OPTIONS = ['Vegetarian', 'Eggetarian', 'Non-Vegetarian', 'Other']
const ALLERGY_CHIPS = ['Dairy', 'Gluten', 'Peanuts', 'Tree nuts', 'Eggs', 'Fish', 'Shellfish', 'Soy', 'Mustard']

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

export default function SignUpPage() {
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  
  // Basic Credentials
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  // Patient Health Fields
  const [gender, setGender] = useState('')
  const [age, setAge] = useState<string>('')
  const [heightCm, setHeightCm] = useState<string>('')
  const [weightKg, setWeightKg] = useState<string>('')
  const [smokingHabit, setSmokingHabit] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [dietaryPreference, setDietaryPreference] = useState('')
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
  const [existingConditions, setExistingConditions] = useState('')

  // Doctor Professional Fields
  const [hospitalName, setHospitalName] = useState('Apex Super Specialty Hospital')
  const [specialization, setSpecialization] = useState('General Physician')
  const [experienceYears, setExperienceYears] = useState('8')
  const [qualification, setQualification] = useState('MBBS, MD')
  const [medicalLicense, setMedicalLicense] = useState('MCI-84920')
  const [consultationFee, setConsultationFee] = useState('500')
  const [consultationType, setConsultationType] = useState('Both')
  const [clinicAddress, setClinicAddress] = useState('MedAssist Health Center, Suite 302, Medical City')
  const [bio, setBio] = useState('Experienced healthcare specialist dedicated to evidence-based medical consulting and personalized patient care.')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successInfo, setSuccessInfo] = useState<{ idCode: string; role: string } | null>(null)

  const { register, user: currentUser, isAuthenticated, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && isAuthenticated && currentUser) {
      if (currentUser.role === 'doctor') {
        navigate('/doctor-dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [authLoading, isAuthenticated, currentUser, navigate])

  const toggleAllergy = (allergy: string) => {
    if (selectedAllergies.includes(allergy)) {
      setSelectedAllergies(selectedAllergies.filter(a => a !== allergy))
    } else {
      setSelectedAllergies([...selectedAllergies, allergy])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side Validation
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required account fields (Name, Email, Password).')
      return
    }

    if (role === 'patient') {
      if (age) {
        const numAge = Number(age)
        if (isNaN(numAge) || numAge < 1 || numAge > 120) {
          setError('Please enter a realistic age between 1 and 120 years.')
          return
        }
      }

      if (heightCm) {
        const numH = Number(heightCm)
        if (isNaN(numH) || numH < 30 || numH > 300) {
          setError('Please enter a valid height in cm (between 30 and 300 cm).')
          return
        }
      }

      if (weightKg) {
        const numW = Number(weightKg)
        if (isNaN(numW) || numW < 1 || numW > 500) {
          setError('Please enter a valid weight in kg (between 1 and 500 kg).')
          return
        }
      }
    } else {
      if (!hospitalName.trim()) {
        setError('Please enter your Hospital or Clinic name.')
        return
      }
      if (!specialization.trim()) {
        setError('Please specify your medical specialization.')
        return
      }
    }

    setLoading(true)
    try {
      const payload: RegisterPatientData = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
        ...(role === 'patient'
          ? {
              gender: gender || undefined,
              age: age ? Number(age) : undefined,
              heightCm: heightCm ? Number(heightCm) : undefined,
              weightKg: weightKg ? Number(weightKg) : undefined,
              smokingHabit: smokingHabit || undefined,
              activityLevel: activityLevel || undefined,
              dietaryPreference: dietaryPreference || undefined,
              allergies: selectedAllergies.length > 0 ? selectedAllergies : undefined,
              existingConditions: existingConditions.trim() ? [existingConditions.trim()] : undefined
            }
          : {
              hospitalName: hospitalName.trim(),
              specialization: specialization.trim(),
              experienceYears: experienceYears ? Number(experienceYears) : 8,
              qualification: qualification.trim() || 'MBBS, MD',
              medicalLicense: medicalLicense.trim() || 'MCI-84920',
              consultationFee: consultationFee ? Number(consultationFee) : 500,
              clinicAddress: clinicAddress.trim() || undefined,
              bio: bio.trim() || undefined,
              consultationType: consultationType || 'Both'
            })
      }

      const user = await register(payload)
      const generatedId = role === 'doctor' ? (user.doctorId || 'D000001') : (user.patientId || 'P000001')
      const idLabel = role === 'doctor' ? `Doctor ID: ${generatedId}` : `Patient ID: ${generatedId}`
      
      setSuccessInfo({ idCode: generatedId, role })
      showToast('Registration Successful', `${idLabel}`)
      
      setTimeout(() => {
        if (role === 'doctor') {
          navigate('/doctor-dashboard')
        } else {
          navigate('/dashboard')
        }
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist-50 px-4 py-8 sm:px-6">
      <div className="w-full max-w-2xl animate-rise rounded-2xl border border-mist-200 bg-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        <div className="mb-6 flex items-center gap-2.5">
          <PulseMark className="h-8 w-8 text-teal-600" />
          <span className="font-display text-lg font-semibold text-ink">MediAssist AI</span>
        </div>
        <h1 className="font-display text-lg font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {role === 'patient'
            ? 'Enter your profile details to personalize your health analysis, risk models, and diet plans.'
            : 'Register as a verified physician or healthcare specialist to manage patient records, appointments, and prescriptions.'}
        </p>

        {successInfo ? (
          <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-6 text-center animate-rise">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white">
              {successInfo.role === 'doctor' ? <Stethoscope className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
            </div>
            <h3 className="font-display text-base font-semibold text-ink">Registration Successful!</h3>
            <p className="mt-2 text-sm text-ink-soft">Your account has been created with unique ID:</p>
            <div className="mt-3 inline-block rounded-lg bg-teal-700 px-4 py-2 text-base font-mono font-bold text-white shadow-sm">
              {successInfo.role === 'doctor' ? `Doctor ID: ${successInfo.idCode}` : `Patient ID: ${successInfo.idCode}`}
            </div>
            <p className="mt-4 text-xs text-ink-soft">Redirecting to your portal...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Account Role Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Select Account Role</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all ${
                    role === 'patient'
                      ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-xs'
                      : 'border-mist-200 bg-white text-ink-soft hover:bg-mist-50 hover:text-ink'
                  }`}
                >
                  <UserCheck className={`h-5 w-5 ${role === 'patient' ? 'text-teal-600' : 'text-ink-soft'}`} />
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all ${
                    role === 'doctor'
                      ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-xs'
                      : 'border-mist-200 bg-white text-ink-soft hover:bg-mist-50 hover:text-ink'
                  }`}
                >
                  <Stethoscope className={`h-5 w-5 ${role === 'doctor' ? 'text-teal-600' : 'text-ink-soft'}`} />
                  Doctor
                </button>
              </div>
            </div>

            {/* SECTION 1: Personal Credentials */}
            <div className="space-y-3.5 border-t border-mist-100 pt-4">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-teal-600" /> Account Credentials
              </h3>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="name">{role === 'doctor' ? 'Doctor Full Name *' : 'Full Name *'}</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      id="name"
                      className="pl-9"
                      placeholder={role === 'doctor' ? 'Dr. Sarah Jenkins' : 'Jane Doe'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="signup-email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      id="signup-email"
                      type="email"
                      className="pl-9"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="signup-password">Password *</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      id="signup-password"
                      type="password"
                      className="pl-9"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* DOCTOR-ONLY PROFESSIONAL DETAILS SECTION */}
            {role === 'doctor' && (
              <div className="space-y-4 border-t border-mist-100 pt-4">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-teal-600" /> Professional Practice & Hospital Details
                </h3>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="hospitalName">Hospital / Medical Center Name *</Label>
                    <div className="relative">
                      <Building className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                      <Input
                        id="hospitalName"
                        className="pl-9"
                        placeholder="e.g. Apex Super Specialty Hospital"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="specialization">Medical Specialization *</Label>
                    <select
                      id="specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                    >
                      {SPECIALIZATIONS.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="experienceYears">Years of Experience *</Label>
                    <div className="relative">
                      <Award className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                      <Input
                        id="experienceYears"
                        type="number"
                        min="0"
                        max="70"
                        className="pl-9 pr-12"
                        placeholder="e.g. 10"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-ink-soft pointer-events-none">yrs</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="qualification">Qualifications *</Label>
                    <div className="relative">
                      <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                      <Input
                        id="qualification"
                        className="pl-9"
                        placeholder="e.g. MBBS, MD (General Medicine)"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="medicalLicense">Medical License / Reg No. *</Label>
                    <Input
                      id="medicalLicense"
                      placeholder="e.g. MCI-84920"
                      value={medicalLicense}
                      onChange={(e) => setMedicalLicense(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="consultationFee">Consultation Fee (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                      <Input
                        id="consultationFee"
                        type="number"
                        min="0"
                        step="50"
                        className="pl-9"
                        placeholder="500"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="consultationType">Consultation Mode</Label>
                    <select
                      id="consultationType"
                      value={consultationType}
                      onChange={(e) => setConsultationType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                    >
                      <option value="Both">Both (Online Tele-Consult & In-Clinic)</option>
                      <option value="Online">Online Video Only</option>
                      <option value="In-Clinic">In-Clinic Only</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="clinicAddress">Hospital / Clinic Address</Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft" />
                      <Input
                        id="clinicAddress"
                        className="pl-9"
                        placeholder="e.g. MedAssist Health Center, Suite 302, Medical City"
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="bio">Professional Bio & Clinical Summary</Label>
                    <textarea
                      id="bio"
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      placeholder="Brief overview of clinical expertise and patient approach..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PATIENT-ONLY HEALTH PROFILE SECTIONS */}
            {role === 'patient' && (
              <>
                {/* SECTION 2: Personal Demographics & Physical Info */}
                <div className="space-y-3.5 border-t border-mist-100 pt-4">
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-teal-600" /> Demographics & Physical Information
                  </h3>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      >
                        <option value="">Select Gender</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="age">Age (years)</Label>
                      <Input
                        id="age"
                        type="number"
                        min="1"
                        max="120"
                        placeholder="e.g. 32"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="heightCm">Height (cm)</Label>
                      <div className="relative">
                        <Ruler className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                        <Input
                          id="heightCm"
                          type="number"
                          step="0.1"
                          min="30"
                          max="300"
                          className="pl-9 pr-10"
                          placeholder="e.g. 172"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-ink-soft pointer-events-none">cm</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="weightKg">Weight (kg)</Label>
                      <div className="relative">
                        <Scale className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                        <Input
                          id="weightKg"
                          type="number"
                          step="0.1"
                          min="1"
                          max="500"
                          className="pl-9 pr-10"
                          placeholder="e.g. 68"
                          value={weightKg}
                          onChange={(e) => setWeightKg(e.target.value)}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-ink-soft pointer-events-none">kg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Lifestyle & Dietary Habits */}
                <div className="space-y-3.5 border-t border-mist-100 pt-4">
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-600" /> Lifestyle & Dietary Preferences
                  </h3>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="smoking">Smoking Habit</Label>
                      <select
                        id="smoking"
                        value={smokingHabit}
                        onChange={(e) => setSmokingHabit(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      >
                        <option value="">Select Smoking Status</option>
                        {SMOKING_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="activity">Physical Activity Level</Label>
                      <select
                        id="activity"
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      >
                        <option value="">Select Activity Level</option>
                        {ACTIVITY_OPTIONS.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="diet">Dietary Preference</Label>
                      <select
                        id="diet"
                        value={dietaryPreference}
                        onChange={(e) => setDietaryPreference(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      >
                        <option value="">Select Diet Type</option>
                        {DIET_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Common Allergies Quick-Selector */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs">Known Allergies & Intolerances (Optional)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALLERGY_CHIPS.map((a) => {
                        const active = selectedAllergies.includes(a)
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => toggleAllergy(a)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                              active
                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                                : 'bg-mist-50 border-mist-200 text-ink-soft hover:bg-mist-100'
                            }`}
                          >
                            {active ? `✓ ${a}` : `+ ${a}`}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Existing Health Conditions */}
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="conditions">Existing Health Conditions (Optional)</Label>
                    <Input
                      id="conditions"
                      placeholder="e.g. Hypertension, Thyroid, Asthma"
                      value={existingConditions}
                      onChange={(e) => setExistingConditions(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 animate-rise">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full bg-[#0F766E] hover:bg-[#0B5A54] font-semibold h-11" disabled={loading}>
              {loading ? 'Creating account…' : `Register as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}
            </Button>

            <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-teal-600 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
