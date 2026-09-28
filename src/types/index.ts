export interface UserProfile {
  id: string
  name: string
  email: string
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
  photoUrl?: string
  height_cm?: number
  weight_kg?: number
  blood_type?: string
  smoking_habit?: string
  activity_level?: string
  dietary_preference?: string
}

export interface VitalReading {
  label: string
  value: number
  unit: string
  status: 'normal' | 'borderline' | 'high' | 'low'
  referenceRange: string
}

export interface MedicalReport {
  id: string
  patientName: string
  age: number
  gender: string
  reportDate: string
  hospital: string
  doctor: string
  type: string
  summary: string
  keyFindings: string[]
  vitals: VitalReading[]
  fileType: 'PDF' | 'PNG' | 'JPG'
}

export interface TermExplanation {
  term: string
  meaning: string
}

export interface DiseaseRisk {
  id: string
  name: string
  percentage: number | null
  status: 'Low' | 'Moderate' | 'High' | 'Insufficient Data' | string
  explanation: string
  suggestions: string[]
}

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendMetric {
  id: string
  name: string
  unit: string
  color: string
  data: TrendPoint[]
  normalRange: [number, number]
}

export interface FoodItem {
  id: string
  name: string
  benefits: string
  calories: number
  protein: string
  category: string
}

export interface MealItem {
  foodId: string
  foodCode: string
  name: string
  portion: string
  quantityGrams: number
  foodNutrients: Record<string, any>
  reasons?: string[]
}

export interface MealCategory {
  title: string
  items: MealItem[]
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sodium?: number
    potassium?: number
    calcium?: number
    iron?: number
    vitaminC?: number
  }
}

export interface WeeklyDietDay {
  dayNumber?: number
  dayName?: string
  day: string
  date?: string
  mealCount: number
  targetCalories: number
  meals: Record<string, MealCategory>
  dailyNutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sodium?: number
    potassium?: number
    calcium?: number
    iron?: number
    vitaminC?: number
  }
  nutrition?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sodium?: number
    potassium?: number
    calcium?: number
    iron?: number
    vitaminC?: number
  }
}

export interface WeeklyDietPlanResponse {
  message?: string
  planId: string
  generatedAt: string
  weekRange?: string
  targetCalories: number
  mealCount: number
  weeklyPlan: WeeklyDietDay[]
  meals: Record<string, MealCategory>
  dailyNutrition: any
  clinicalContext: any
  safety: { safetyStatus: string; warnings: any[] }
  preferences?: any
  diseaseRisks?: any[]
}

export interface MealPlanDay {
  day: string
  breakfast: string
  lunch: string
  dinner: string
  snacks: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface DashboardStats {
  totalReports: number
  healthScore: number
  latestRiskLevel: 'Low' | 'Moderate' | 'High'
  lastReportDate: string
}
