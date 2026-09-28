export interface ManualParameter {
  id: string
  reportId?: string     // Associated Medical Report ID in backend DB
  parameter: string     // Parameter Name (e.g., "Blood Sugar")
  value: string         // Value (e.g., "105")
  unit?: string         // Unit (e.g., "mg/dL")
  reference?: string    // Reference Value / Normal Range (e.g., "70–110")
  category?: string     // Optional category classification (e.g., "Metabolic", "Vitals")
  notes?: string        // Optional user notes
  createdAt: string     // ISO timestamp string
}

export type ManualParameterFormData = Omit<ManualParameter, 'id' | 'createdAt'>

export interface ParameterPreset {
  parameter: string
  unit: string
  reference: string
  category?: string
}

export interface DiabetesRiskPanelData {
  bloodGlucose: string
  hba1c: string
  bmi: string
  hypertension: string
  heartDisease: string
  smokingHistory: string
  age: string
  gender: string
}
