import type { MedicalReport, TermExplanation } from '@/types'

export const mockReports: MedicalReport[] = [
  {
    id: 'rep-2026-05',
    patientName: 'Ananya Rao',
    age: 34,
    gender: 'Female',
    reportDate: '2026-05-12',
    hospital: 'Sunrise Multispecialty Hospital',
    doctor: 'Dr. Kavita Menon',
    type: 'Comprehensive Metabolic Panel',
    summary:
      'Overall metabolic markers are within acceptable limits with mild elevation in LDL cholesterol. Blood sugar trending slightly above optimal fasting range. Recommend dietary adjustment and follow-up in 3 months.',
    keyFindings: [
      'Fasting blood sugar slightly elevated at 108 mg/dL',
      'LDL cholesterol borderline high at 132 mg/dL',
      'Hemoglobin within healthy range',
      'Blood pressure well controlled at 118/76 mmHg',
    ],
    vitals: [
      { label: 'Blood Sugar', value: 108, unit: 'mg/dL', status: 'borderline', referenceRange: '70–99 mg/dL' },
      { label: 'Vitamin D', value: 22, unit: 'ng/mL', status: 'low', referenceRange: '30–100 ng/mL' },
      { label: 'Hemoglobin', value: 13.4, unit: 'g/dL', status: 'normal', referenceRange: '12–15.5 g/dL' },
      { label: 'Blood Pressure', value: 118, unit: 'mmHg (sys)', status: 'normal', referenceRange: '90–120 mmHg' },
    ],
    fileType: 'PDF',
  },
  {
    id: 'rep-2026-02',
    patientName: 'Ananya Rao',
    age: 34,
    gender: 'Female',
    reportDate: '2026-02-03',
    hospital: 'Sunrise Multispecialty Hospital',
    doctor: 'Dr. Kavita Menon',
    type: 'Lipid Profile',
    summary:
      'Lipid panel shows mild dyslipidemia. LDL and total cholesterol are trending upward compared to previous reports. HDL remains protective. Lifestyle changes advised before considering medication.',
    keyFindings: [
      'Total cholesterol at 198 mg/dL, near upper limit',
      'HDL cholesterol healthy at 58 mg/dL',
      'Triglycerides within normal range',
    ],
    vitals: [
      { label: 'Blood Sugar', value: 96, unit: 'mg/dL', status: 'normal', referenceRange: '70–99 mg/dL' },
      { label: 'Vitamin D', value: 24, unit: 'ng/mL', status: 'low', referenceRange: '30–100 ng/mL' },
      { label: 'Hemoglobin', value: 13.1, unit: 'g/dL', status: 'normal', referenceRange: '12–15.5 g/dL' },
      { label: 'Blood Pressure', value: 116, unit: 'mmHg (sys)', status: 'normal', referenceRange: '90–120 mmHg' },
    ],
    fileType: 'PDF',
  },
  {
    id: 'rep-2025-11',
    patientName: 'Ananya Rao',
    age: 34,
    gender: 'Female',
    reportDate: '2025-11-18',
    hospital: 'Northgate Diagnostics',
    doctor: 'Dr. Rohan Iyer',
    type: 'Complete Blood Count',
    summary:
      'Complete blood count is within normal limits across all parameters. No signs of anemia or infection. Routine annual screening recommended.',
    keyFindings: [
      'Hemoglobin and RBC counts normal',
      'White blood cell count within range',
      'Platelet count healthy',
    ],
    vitals: [
      { label: 'Blood Sugar', value: 92, unit: 'mg/dL', status: 'normal', referenceRange: '70–99 mg/dL' },
      { label: 'Vitamin D', value: 27, unit: 'ng/mL', status: 'low', referenceRange: '30–100 ng/mL' },
      { label: 'Hemoglobin', value: 13.6, unit: 'g/dL', status: 'normal', referenceRange: '12–15.5 g/dL' },
      { label: 'Blood Pressure', value: 114, unit: 'mmHg (sys)', status: 'normal', referenceRange: '90–120 mmHg' },
    ],
    fileType: 'JPG',
  },
]

export const mockTermExplanations: TermExplanation[] = [
  { term: 'HbA1c', meaning: 'Average blood sugar over the last three months.' },
  { term: 'LDL', meaning: 'Bad cholesterol that can build up in artery walls.' },
  { term: 'HDL', meaning: 'Good cholesterol that helps clear LDL from the blood.' },
  { term: 'Hemoglobin', meaning: 'Protein in red blood cells that carries oxygen.' },
  { term: 'Vitamin D', meaning: 'Nutrient that supports bone strength and immune health.' },
  { term: 'Triglycerides', meaning: 'A type of fat in the blood used for energy.' },
]
