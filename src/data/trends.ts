import type { TrendMetric } from '@/types'

function generateSeries(base: number, points: number, variance: number, drift = 0): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = []
  const now = new Date(2026, 6, 1)
  let value = base
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    value = value + drift + (Math.sin(i * 1.3) * variance) / 2 + (Math.random() - 0.5) * variance
    out.push({
      date: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: Math.round(value * 10) / 10,
    })
  }
  return out
}

export const mockTrends: TrendMetric[] = [
  {
    id: 'blood-sugar',
    name: 'Blood Sugar',
    unit: 'mg/dL',
    color: '#0f766e',
    data: generateSeries(96, 36, 6, 0.25),
    normalRange: [70, 99],
  },
  {
    id: 'cholesterol',
    name: 'Cholesterol',
    unit: 'mg/dL',
    color: '#2563eb',
    data: generateSeries(185, 36, 8, 0.2),
    normalRange: [125, 200],
  },
  {
    id: 'bmi',
    name: 'BMI',
    unit: 'kg/m²',
    color: '#f97316',
    data: generateSeries(23, 36, 0.6, 0.02),
    normalRange: [18.5, 24.9],
  },
  {
    id: 'hemoglobin',
    name: 'Hemoglobin',
    unit: 'g/dL',
    color: '#e6435f',
    data: generateSeries(13.2, 36, 0.4, 0),
    normalRange: [12, 15.5],
  },
  {
    id: 'vitamin-d',
    name: 'Vitamin D',
    unit: 'ng/mL',
    color: '#eab308',
    data: generateSeries(24, 36, 3, 0.1),
    normalRange: [30, 100],
  },
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    unit: 'mmHg',
    color: '#14958a',
    data: generateSeries(116, 36, 4, 0),
    normalRange: [90, 120],
  },
]
