import * as React from 'react'
import { api, getToken, setToken, getStoredUser, setStoredUser } from '@/services/api'

export interface UserProfile {
  id: string
  email: string
  name: string
  role?: 'patient' | 'doctor'
  patientId?: string
  doctorId?: string
  phone?: string
  age?: number
  gender?: string
  bloodGroup?: string
  heightCm?: number
  weightKg?: number
  smokingHabit?: string
  activityLevel?: string
  dietaryPreference?: string
  allergies?: string[]
  existingConditions?: string[]
  height_cm?: number
  weight_kg?: number
  blood_type?: string
  smoking_habit?: string
  activity_level?: string
  dietary_preference?: string
  hospitalName?: string
  hospital_name?: string
  specialization?: string
  experienceYears?: number
  experience_years?: number
  qualification?: string
  medicalLicense?: string
  medical_license?: string
  consultationFee?: number
  consultation_fee?: number
  clinicAddress?: string
  clinic_address?: string
  bio?: string
  consultationType?: string
  consultation_type?: string
  availability?: string[]
}

export interface RegisterPatientData {
  name: string
  email: string
  password: string
  role?: 'patient' | 'doctor'
  phone?: string
  age?: number
  gender?: string
  bloodGroup?: string
  heightCm?: number
  weightKg?: number
  smokingHabit?: string
  activityLevel?: string
  dietaryPreference?: string
  allergies?: string[]
  existingConditions?: string[]
  hospitalName?: string
  hospital_name?: string
  specialization?: string
  experienceYears?: number
  experience_years?: number
  qualification?: string
  medicalLicense?: string
  medical_license?: string
  consultationFee?: number
  consultation_fee?: number
  clinicAddress?: string
  clinic_address?: string
  bio?: string
  consultationType?: string
  consultation_type?: string
  availability?: string[]
}

interface AuthContextValue {
  isAuthenticated: boolean
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  register: (data: RegisterPatientData | string, email?: string, password?: string, role?: 'patient' | 'doctor') => Promise<UserProfile>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(() => getStoredUser())
  const [token, setTokenState] = React.useState<string | null>(() => getToken())
  const [loading, setLoading] = React.useState<boolean>(() => {
    const hasToken = !!getToken()
    const hasUser = !!getStoredUser()
    return hasToken && !hasUser
  })

  const fetchUser = React.useCallback(async () => {
    const currentToken = getToken()
    if (!currentToken) {
      setUser(null)
      setStoredUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.getCurrentUser()
      if (res?.user) {
        setUser(res.user)
        setStoredUser(res.user)
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase()
      const isAuthError =
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('unauthorized') ||
        msg.includes('token') ||
        msg.includes('invalid') ||
        msg.includes('expired')

      if (isAuthError) {
        setToken(null)
        setTokenState(null)
        setUser(null)
        setStoredUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUser()
  }, [token, fetchUser])

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password })
    setToken(res.token)
    setTokenState(res.token)
    setUser(res.user)
    setStoredUser(res.user)
    return res.user
  }

  const register = async (
    dataOrName: RegisterPatientData | string,
    email?: string,
    password?: string,
    role: 'patient' | 'doctor' = 'patient'
  ) => {
    const payload = typeof dataOrName === 'string'
      ? { name: dataOrName, email: email || '', password: password || '', role }
      : dataOrName
    const res = await api.register(payload)
    setToken(res.token)
    setTokenState(res.token)
    setUser(res.user)
    setStoredUser(res.user)
    return res.user
  }

  const logout = () => {
    setToken(null)
    setTokenState(null)
    setUser(null)
    setStoredUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!(user || token),
        user,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
