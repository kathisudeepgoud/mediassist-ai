import type { DiseaseRisk } from '@/types'

export const mockRisks: DiseaseRisk[] = [
  {
    id: 'diabetes',
    name: 'Diabetes Risk',
    percentage: 34,
    status: 'Moderate',
    explanation:
      'Fasting blood sugar has trended above the optimal range in your last two reports, combined with a moderately active lifestyle.',
    suggestions: [
      'Reduce refined carbohydrates and added sugar',
      'Add a 20-minute walk after meals',
      'Recheck fasting glucose in 3 months',
    ],
  },
  {
    id: 'heart',
    name: 'Heart Disease Risk',
    percentage: 21,
    status: 'Low',
    explanation:
      'Blood pressure and HDL cholesterol are within healthy ranges, though LDL is borderline high and worth monitoring.',
    suggestions: [
      'Include more omega-3 rich foods like walnuts and flaxseed',
      'Maintain regular cardio exercise 3–4 times a week',
      'Limit saturated fat intake',
    ],
  },
  {
    id: 'kidney',
    name: 'Kidney Disease Risk',
    percentage: 12,
    status: 'Low',
    explanation:
      'Kidney function markers from your latest panel are within normal limits with no signs of impairment.',
    suggestions: [
      'Stay well hydrated throughout the day',
      'Keep sodium intake moderate',
      'Continue annual kidney function screening',
    ],
  },
  {
    id: 'hypertension',
    name: 'Hypertension Risk',
    percentage: 18,
    status: 'Low',
    explanation:
      'Recent blood pressure readings have stayed consistently within the healthy range across all reports.',
    suggestions: [
      'Continue current activity levels',
      'Limit high-sodium processed foods',
      'Monitor blood pressure quarterly',
    ],
  },
]
