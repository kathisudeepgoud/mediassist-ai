import { useState } from 'react'
import { Sparkles, Flame, Beef, Wheat, Droplets, Leaf, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface MealPlanViewProps {
  meals: Record<string, { title: string; items: any[]; nutrition: any }>
  preferences?: any
}

const REASON_EXPLANATION_MAP: Record<string, string> = {
  HIGH_DIETARY_FIBER: 'Rich in dietary fiber (>= 8g/100g) supporting digestive health and prolonged glycemic satiety.',
  GOOD_FIBER_SOURCE: 'Provides healthy dietary fiber to meet the ICMR daily recommended intake.',
  HIGH_QUALITY_PLANT_PROTEIN: 'High-biological value plant protein source providing essential amino acids with low saturated fat.',
  RICH_IN_PROTEIN: 'High protein density (>= 15g/100g) for lean muscle preservation and tissue maintenance.',
  LOW_SODIUM_HEART_SAFE: 'Naturally low in sodium (<= 50mg/100g), supporting healthy blood pressure.',
  KIDNEY_SAFE_LOW_POTASSIUM: 'Controlled potassium levels suitable for renal metabolic safety.',
  RICH_IN_DIETARY_IRON: 'Iron-dense Indian food item helping sustain healthy hemoglobin and RBC synthesis.',
  SOURCE_OF_IRON: 'Provides dietary iron to prevent nutritional fatigue and anemia.',
  RICH_IN_VITAMIN_C: 'High ascorbic acid content which enhances non-heme iron absorption in the gut.',
  HEART_HEALTHY_UNSATURATED_FATS: 'Rich in cardioprotective MUFA and PUFA fatty acids with minimal saturated fat.',
  CLINICALLY_RECOMMENDED_STAPLE: 'Prioritized whole grain/millet with documented low glycemic impact.',
  REGIONAL_PREFERENCE_MATCH: 'Selected to match your chosen regional Indian cuisine preference.'
}

function getMealSortScore(key: string, title?: string): number {
  const normKey = (key || '').toLowerCase().replace(/[^a-z]/g, '')
  const normTitle = (title || '').toLowerCase().replace(/[^a-z]/g, '')

  if (normKey.includes('breakfast') || normTitle.includes('breakfast')) return 1
  if (normKey.includes('midmorning') || normTitle.includes('midmorning') || normTitle.includes('morning')) return 2
  if (normKey.includes('lunch') || normTitle.includes('lunch')) return 3
  if (normKey.includes('evening') || normTitle.includes('evening') || normTitle.includes('snack')) return 4
  if (normKey.includes('dinner') || normTitle.includes('dinner') || normTitle.includes('supper')) return 5
  return 99
}

function getItemNutrients(item: any) {
  const qty = Number(item.quantityGrams) || 100
  const factor = qty / 100.0
  const n = (item.foodNutrients || item.nutrients || {}) as Record<string, any>

  let calories = 0
  if (typeof item.calories === 'number' && item.calories > 0) {
    calories = item.calories
  } else if (n.calories !== undefined && !isNaN(Number(n.calories)) && Number(n.calories) > 0) {
    calories = Number(n.calories)
  } else if (n.enerc !== undefined && !isNaN(Number(n.enerc))) {
    calories = Math.round((Number(n.enerc) / 4.184) * factor)
  } else if (n.energy !== undefined && !isNaN(Number(n.energy))) {
    calories = Math.round(Number(n.energy) * factor)
  }

  let protein = 0
  if (typeof item.protein === 'number' && item.protein > 0) {
    protein = item.protein
  } else if (n.protein !== undefined && !isNaN(Number(n.protein))) {
    protein = Number(n.protein)
  } else if (n.protcnt !== undefined && !isNaN(Number(n.protcnt))) {
    protein = Number((Number(n.protcnt) * factor).toFixed(1))
  }

  let carbs = 0
  if (typeof item.carbs === 'number' && item.carbs > 0) {
    carbs = item.carbs
  } else if (n.carbs !== undefined && !isNaN(Number(n.carbs))) {
    carbs = Number(n.carbs)
  } else if (n.choavldf !== undefined && !isNaN(Number(n.choavldf))) {
    carbs = Number((Number(n.choavldf) * factor).toFixed(1))
  } else if (n.carbohydrates !== undefined && !isNaN(Number(n.carbohydrates))) {
    carbs = Number((Number(n.carbohydrates) * factor).toFixed(1))
  }

  let fat = 0
  if (typeof item.fat === 'number' && item.fat > 0) {
    fat = item.fat
  } else if (n.fat !== undefined && !isNaN(Number(n.fat))) {
    fat = Number(n.fat)
  } else if (n.fatce !== undefined && !isNaN(Number(n.fatce))) {
    fat = Number((Number(n.fatce) * factor).toFixed(1))
  } else if (n.fats !== undefined && !isNaN(Number(n.fats))) {
    fat = Number((Number(n.fats) * factor).toFixed(1))
  }

  let fiber = 0
  if (typeof item.fiber === 'number' && item.fiber > 0) {
    fiber = item.fiber
  } else if (n.fiber !== undefined && !isNaN(Number(n.fiber))) {
    fiber = Number(n.fiber)
  } else if (n.fibtg !== undefined && !isNaN(Number(n.fibtg))) {
    fiber = Number((Number(n.fibtg) * factor).toFixed(1))
  }

  return {
    calories: Math.round(calories),
    carbs: Number(carbs.toFixed(1)),
    protein: Number(protein.toFixed(1)),
    fat: Number(fat.toFixed(1)),
    fiber: Number(fiber.toFixed(1))
  }
}

function getMealNutrients(mealObj: any) {
  const items = mealObj?.items || []
  if (items.length === 0) {
    const nut = mealObj?.nutrition || {}
    return {
      calories: nut.calories || 0,
      carbs: Number(nut.carbs || 0),
      protein: Number(nut.protein || 0),
      fat: Number(nut.fat || 0),
      fiber: Number(nut.fiber || 0)
    }
  }

  let totalCal = 0
  let totalCarbs = 0
  let totalProt = 0
  let totalFat = 0
  let totalFib = 0

  for (const item of items) {
    const itemNut = getItemNutrients(item)
    totalCal += itemNut.calories
    totalCarbs += itemNut.carbs
    totalProt += itemNut.protein
    totalFat += itemNut.fat
    totalFib += itemNut.fiber
  }

  const nut = mealObj?.nutrition || {}
  return {
    calories: totalCal > 0 ? totalCal : (nut.calories || 0),
    carbs: Number((totalCarbs > 0 ? totalCarbs : (nut.carbs || 0)).toFixed(1)),
    protein: Number((totalProt > 0 ? totalProt : (nut.protein || 0)).toFixed(1)),
    fat: Number((totalFat > 0 ? totalFat : (nut.fat || 0)).toFixed(1)),
    fiber: Number((totalFib > 0 ? totalFib : (nut.fiber || 0)).toFixed(1))
  }
}

export function MealPlanView({ meals = {}, preferences = {} }: MealPlanViewProps) {
  const [activeReasonItem, setActiveReasonItem] = useState<{ name: string; reasons: string[] } | null>(null)

  const mealEntries = Object.entries(meals).sort(([keyA, objA], [keyB, objB]) => {
    return getMealSortScore(keyA, objA?.title) - getMealSortScore(keyB, objB?.title)
  })

  if (mealEntries.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <p className="text-sm text-ink-soft">No meals available for display.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {mealEntries.map(([mealKey, mealObj]) => {
        const items = mealObj.items || []
        const mealNut = getMealNutrients(mealObj)

        return (
          <Card key={mealKey} className="animate-rise overflow-hidden border-mist-200 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-mist-100 bg-mist-50/70 py-3 px-5 gap-2">
              <div>
                <CardTitle className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-600" />
                  {mealObj.title || mealKey}
                </CardTitle>
                <CardDescription className="text-xs">
                  Portion-controlled combination aligned with active clinical constraints
                </CardDescription>
              </div>

              {/* Meal Macro Pill Badges */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                <span className="inline-flex items-center rounded-md bg-orange-50 border border-orange-200/60 px-2 py-0.5 font-bold text-orange-700">
                  {mealNut.calories} kcal
                </span>
                <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 font-medium text-amber-700">
                  {mealNut.carbs}g C
                </span>
                <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 font-medium text-blue-700">
                  {mealNut.protein}g P
                </span>
                <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 font-medium text-rose-700">
                  {mealNut.fat}g F
                </span>
                <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 font-medium text-emerald-700">
                  {mealNut.fiber}g Fib
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {items.map((item, idx) => {
                  const itemNut = getItemNutrients(item)

                  return (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-xl border border-mist-200 bg-white p-3.5 transition hover:border-teal-300 hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="font-display text-xs font-bold text-ink leading-snug">
                            {item.name}
                          </h4>
                          <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded shrink-0">
                            {item.foodCode}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs text-ink-soft">
                          <span className="font-medium text-ink">Serving:</span> {item.portion}
                          {item.quantityGrams && (
                            <span className="font-mono text-[10px] text-ink-soft ml-1">({item.quantityGrams}g)</span>
                          )}
                        </p>
                      </div>

                      <div className="mt-3 border-t border-mist-100 pt-2.5 space-y-2">
                        {/* Macro Chips */}
                        <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                          <span className="rounded bg-orange-50 border border-orange-100 px-1.5 py-0.5 font-bold text-orange-700">
                            {itemNut.calories} kcal
                          </span>
                          <span className="rounded bg-amber-50 border border-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                            {itemNut.carbs}g C
                          </span>
                          <span className="rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 font-medium text-blue-700">
                            {itemNut.protein}g P
                          </span>
                          <span className="rounded bg-rose-50 border border-rose-100 px-1.5 py-0.5 font-medium text-rose-700">
                            {itemNut.fat}g F
                          </span>
                          <span className="rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">
                            {itemNut.fiber}g Fib
                          </span>
                        </div>

                        {item.reasons && item.reasons.length > 0 && (
                          <div className="pt-1 flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {item.reasons.slice(0, 2).map((r: string) => (
                                <span
                                  key={r}
                                  className="rounded bg-teal-50 border border-teal-100 px-1.5 py-0.5 text-[9px] font-medium text-teal-800"
                                >
                                  {r.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveReasonItem(item)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-600 hover:text-teal-800 transition-colors ml-auto shrink-0"
                            >
                              <HelpCircle className="h-3 w-3" /> Why?
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Reason Dialog / Modal */}
      {activeReasonItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-mist-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-mist-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <h3 className="font-display text-sm font-semibold text-ink">Recommendation Explanation</h3>
              </div>
              <button
                onClick={() => setActiveReasonItem(null)}
                className="text-xs font-semibold text-ink-soft hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="font-medium text-ink">{activeReasonItem.name}</p>
              <div className="space-y-2 rounded-xl bg-teal-50/70 p-3 text-teal-900">
                {activeReasonItem.reasons?.map((r: string) => (
                  <div key={r}>
                    <span className="font-bold text-teal-800">• {r.replace(/_/g, ' ')}:</span>{' '}
                    <span className="text-teal-700">
                      {REASON_EXPLANATION_MAP[r] || 'Evidence-based nutrient match for your profile.'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
