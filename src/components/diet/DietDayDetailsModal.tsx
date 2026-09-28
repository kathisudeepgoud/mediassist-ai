import { useState } from 'react'
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Utensils
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WeeklyDietDay, MealItem } from '@/types'

interface DietDayDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  dayData: WeeklyDietDay | null
  preferences?: any
}

interface ExtractedNutrients {
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
  sodium: number
  potassium: number
  calcium: number
  iron: number
}

const REASON_EXPLANATION_MAP: Record<string, string> = {
  HIGH_DIETARY_FIBER: 'Rich in dietary fiber (≥ 8g/100g) supporting digestive health and prolonged glycemic satiety.',
  GOOD_FIBER_SOURCE: 'Provides healthy dietary fiber to meet the ICMR daily recommended intake.',
  HIGH_QUALITY_PLANT_PROTEIN: 'High-biological value plant protein source providing essential amino acids with low saturated fat.',
  RICH_IN_PROTEIN: 'High protein density (≥ 15g/100g) for lean muscle preservation and tissue maintenance.',
  NON_VEG_PROTEIN_SOURCE: 'High-biological value animal protein providing complete essential amino acid profiles for muscle repair.',
  LEAN_POULTRY_PROTEIN: 'Lean poultry protein with low saturated fat, supporting muscle maintenance and metabolic health.',
  RICH_IN_OMEGA3_AND_LEAN_PROTEIN: 'Rich in marine omega-3 fatty acids (EPA/DHA) and high-quality protein for cardiovascular wellness.',
  HIGH_BIOLOGICAL_VALUE_EGG_PROTEIN: 'Complete protein reference standard (Biological Value ~100) rich in choline and essential micronutrients.',
  LOW_SODIUM_HEART_SAFE: 'Naturally low in sodium (≤ 50mg/100g), supporting healthy blood pressure.',
  KIDNEY_SAFE_LOW_POTASSIUM: 'Controlled potassium levels suitable for renal metabolic safety.',
  RICH_IN_DIETARY_IRON: 'Iron-dense Indian food item helping sustain healthy hemoglobin and RBC synthesis.',
  SOURCE_OF_IRON: 'Provides dietary iron to prevent nutritional fatigue and anemia.',
  RICH_IN_VITAMIN_C: 'High ascorbic acid content which enhances non-heme iron absorption in the gut.',
  HEART_HEALTHY_UNSATURATED_FATS: 'Rich in cardioprotective MUFA and PUFA fatty acids with minimal saturated fat.',
  CLINICALLY_RECOMMENDED_STAPLE: 'Prioritized whole grain/millet with documented low glycemic impact.',
  REGIONAL_PREFERENCE_MATCH: 'Selected to match your chosen regional Indian cuisine preference.'
}

const MEAL_TIMES: Record<string, string> = {
  breakfast: '08:00 AM - 09:00 AM',
  mid_morning: '11:00 AM - 11:30 AM',
  midMorning: '11:00 AM - 11:30 AM',
  lunch: '01:00 PM - 02:00 PM',
  evening_snack: '04:30 PM - 05:30 PM',
  eveningSnack: '04:30 PM - 05:30 PM',
  dinner: '07:30 PM - 08:30 PM'
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

function getItemNutrients(item: MealItem): ExtractedNutrients {
  const qty = Number(item.quantityGrams) || 100
  const factor = qty / 100.0
  const n = (item.foodNutrients || (item as any).nutrients || {}) as Record<string, any>

  // Calories: direct calories OR enerc in kJ (/ 4.184)
  let calories = 0
  if (typeof (item as any).calories === 'number' && (item as any).calories > 0) {
    calories = (item as any).calories
  } else if (n.calories !== undefined && !isNaN(Number(n.calories)) && Number(n.calories) > 0) {
    calories = Number(n.calories)
  } else if (n.enerc !== undefined && !isNaN(Number(n.enerc))) {
    calories = Math.round((Number(n.enerc) / 4.184) * factor)
  } else if (n.energy !== undefined && !isNaN(Number(n.energy))) {
    calories = Math.round(Number(n.energy) * factor)
  }

  // Protein: protcnt or protein
  let protein = 0
  if (typeof (item as any).protein === 'number' && (item as any).protein > 0) {
    protein = (item as any).protein
  } else if (n.protein !== undefined && !isNaN(Number(n.protein))) {
    protein = Number(n.protein)
  } else if (n.protcnt !== undefined && !isNaN(Number(n.protcnt))) {
    protein = Number((Number(n.protcnt) * factor).toFixed(1))
  }

  // Carbs: choavldf or carbs or carbohydrates
  let carbs = 0
  if (typeof (item as any).carbs === 'number' && (item as any).carbs > 0) {
    carbs = (item as any).carbs
  } else if (n.carbs !== undefined && !isNaN(Number(n.carbs))) {
    carbs = Number(n.carbs)
  } else if (n.choavldf !== undefined && !isNaN(Number(n.choavldf))) {
    carbs = Number((Number(n.choavldf) * factor).toFixed(1))
  } else if (n.carbohydrates !== undefined && !isNaN(Number(n.carbohydrates))) {
    carbs = Number((Number(n.carbohydrates) * factor).toFixed(1))
  }

  // Fat: fatce or fat or fats
  let fat = 0
  if (typeof (item as any).fat === 'number' && (item as any).fat > 0) {
    fat = (item as any).fat
  } else if (n.fat !== undefined && !isNaN(Number(n.fat))) {
    fat = Number(n.fat)
  } else if (n.fatce !== undefined && !isNaN(Number(n.fatce))) {
    fat = Number((Number(n.fatce) * factor).toFixed(1))
  } else if (n.fats !== undefined && !isNaN(Number(n.fats))) {
    fat = Number((Number(n.fats) * factor).toFixed(1))
  }

  // Fiber: fibtg or fiber
  let fiber = 0
  if (typeof (item as any).fiber === 'number' && (item as any).fiber > 0) {
    fiber = (item as any).fiber
  } else if (n.fiber !== undefined && !isNaN(Number(n.fiber))) {
    fiber = Number(n.fiber)
  } else if (n.fibtg !== undefined && !isNaN(Number(n.fibtg))) {
    fiber = Number((Number(n.fibtg) * factor).toFixed(1))
  }

  // Micronutrients
  let sodium = 0
  if (n.sodium !== undefined && !isNaN(Number(n.sodium))) sodium = Number(n.sodium)
  else if (n.na !== undefined && !isNaN(Number(n.na))) sodium = Math.round(Number(n.na) * factor)

  let potassium = 0
  if (n.potassium !== undefined && !isNaN(Number(n.potassium))) potassium = Number(n.potassium)
  else if (n.k !== undefined && !isNaN(Number(n.k))) potassium = Math.round(Number(n.k) * factor)

  let calcium = 0
  if (n.calcium !== undefined && !isNaN(Number(n.calcium))) calcium = Number(n.calcium)
  else if (n.ca !== undefined && !isNaN(Number(n.ca))) calcium = Math.round(Number(n.ca) * factor)

  let iron = 0
  if (n.iron !== undefined && !isNaN(Number(n.iron))) iron = Number(n.iron)
  else if (n.fe !== undefined && !isNaN(Number(n.fe))) iron = Number((Number(n.fe) * factor).toFixed(1))

  return {
    calories: Math.round(calories),
    carbs: Number(carbs.toFixed(1)),
    protein: Number(protein.toFixed(1)),
    fat: Number(fat.toFixed(1)),
    fiber: Number(fiber.toFixed(1)),
    sodium: Math.round(sodium),
    potassium: Math.round(potassium),
    calcium: Math.round(calcium),
    iron: Number(iron.toFixed(1))
  }
}

function getMealNutrients(mealObj: any): ExtractedNutrients {
  const items: MealItem[] = mealObj?.items || []
  if (items.length === 0) {
    const nut = mealObj?.nutrition || {}
    return {
      calories: nut.calories || 0,
      carbs: Number(nut.carbs || 0),
      protein: Number(nut.protein || 0),
      fat: Number(nut.fat || 0),
      fiber: Number(nut.fiber || 0),
      sodium: nut.sodium || 0,
      potassium: nut.potassium || 0,
      calcium: nut.calcium || 0,
      iron: nut.iron || 0
    }
  }

  let totalCal = 0
  let totalCarbs = 0
  let totalProt = 0
  let totalFat = 0
  let totalFib = 0
  let totalNa = 0
  let totalK = 0
  let totalCa = 0
  let totalFe = 0

  for (const item of items) {
    const itemNut = getItemNutrients(item)
    totalCal += itemNut.calories
    totalCarbs += itemNut.carbs
    totalProt += itemNut.protein
    totalFat += itemNut.fat
    totalFib += itemNut.fiber
    totalNa += itemNut.sodium
    totalK += itemNut.potassium
    totalCa += itemNut.calcium
    totalFe += itemNut.iron
  }

  const nut = mealObj?.nutrition || {}
  return {
    calories: totalCal > 0 ? totalCal : (nut.calories || 0),
    carbs: Number((totalCarbs > 0 ? totalCarbs : (nut.carbs || 0)).toFixed(1)),
    protein: Number((totalProt > 0 ? totalProt : (nut.protein || 0)).toFixed(1)),
    fat: Number((totalFat > 0 ? totalFat : (nut.fat || 0)).toFixed(1)),
    fiber: Number((totalFib > 0 ? totalFib : (nut.fiber || 0)).toFixed(1)),
    sodium: totalNa > 0 ? Math.round(totalNa) : (nut.sodium || 0),
    potassium: totalK > 0 ? Math.round(totalK) : (nut.potassium || 0),
    calcium: totalCa > 0 ? Math.round(totalCa) : (nut.calcium || 0),
    iron: Number((totalFe > 0 ? totalFe : (nut.iron || 0)).toFixed(1))
  }
}

export function DietDayDetailsModal({
  isOpen,
  onClose,
  dayData,
  preferences = {}
}: DietDayDetailsModalProps) {
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({})

  if (!dayData) return null

  const meals = dayData.meals || {}
  const mealEntries = Object.entries(meals).sort(([keyA, objA], [keyB, objB]) => {
    return getMealSortScore(keyA, objA?.title) - getMealSortScore(keyB, objB?.title)
  })

  // Calculate day totals across all meals with fallback
  const rawDayNut = dayData.dailyNutrition || dayData.nutrition || {}
  let dayCalories = rawDayNut.calories || 0
  let dayCarbs = rawDayNut.carbs || 0
  let dayProtein = rawDayNut.protein || 0
  let dayFat = rawDayNut.fat || 0
  let dayFiber = rawDayNut.fiber || 0

  let sumCal = 0
  let sumC = 0
  let sumP = 0
  let sumF = 0
  let sumFib = 0

  mealEntries.forEach(([_, m]) => {
    const mNut = getMealNutrients(m)
    sumCal += mNut.calories
    sumC += mNut.carbs
    sumP += mNut.protein
    sumF += mNut.fat
    sumFib += mNut.fiber
  })

  if (dayCalories <= 0 && sumCal > 0) dayCalories = sumCal
  if (dayCarbs <= 0 && sumC > 0) dayCarbs = Number(sumC.toFixed(1))
  if (dayProtein <= 0 && sumP > 0) dayProtein = Number(sumP.toFixed(1))
  if (dayFat <= 0 && sumF > 0) dayFat = Number(sumF.toFixed(1))
  if (dayFiber <= 0 && sumFib > 0) dayFiber = Number(sumFib.toFixed(1))

  const toggleItemReason = (itemId: string) => {
    setExpandedReasons(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 sm:rounded-2xl border-mist-200">
        {/* Top Header Banner */}
        <div className="sticky top-0 z-20 border-b border-mist-200 bg-white/95 px-6 py-4 backdrop-blur-md shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs shadow-xs">
                  D{dayData.dayNumber || 1}
                </span>
                <DialogTitle className="font-display text-lg font-bold text-ink">
                  {dayData.dayName || dayData.day} Meal Plan
                </DialogTitle>
                <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200 font-semibold px-2 py-0.5">
                  {preferences.dietType || preferences.diet_type || 'Vegetarian'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-ink-soft mt-1">
                {dayData.date ? `${dayData.date} • ` : ''}Itemized portions, IFCT 2017 nutritional breakdowns, and clinical reasons.
              </DialogDescription>
            </div>

            {/* Nutrition Highlights Bar (Clean, Structured Macro Badges) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Calories */}
              <div className="flex items-center rounded-lg border border-orange-200/80 bg-orange-50/80 px-2.5 py-1 text-xs font-mono font-semibold text-orange-800 shadow-2xs">
                <span>{dayCalories} <span className="font-sans text-[11px] font-medium text-orange-600/90">kcal</span></span>
              </div>

              {/* Carbs */}
              <div className="flex items-center rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-xs font-mono font-semibold text-amber-800 shadow-2xs">
                <span>{dayCarbs}g <span className="font-sans text-[11px] font-medium text-amber-600/90">C</span></span>
              </div>

              {/* Protein */}
              <div className="flex items-center rounded-lg border border-blue-200/80 bg-blue-50/80 px-2.5 py-1 text-xs font-mono font-semibold text-blue-800 shadow-2xs">
                <span>{dayProtein}g <span className="font-sans text-[11px] font-medium text-blue-600/90">P</span></span>
              </div>

              {/* Fat */}
              <div className="flex items-center rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-xs font-mono font-semibold text-rose-800 shadow-2xs">
                <span>{dayFat}g <span className="font-sans text-[11px] font-medium text-rose-600/90">F</span></span>
              </div>

              {/* Fiber */}
              <div className="flex items-center rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-800 shadow-2xs">
                <span>{dayFiber}g <span className="font-sans text-[11px] font-medium text-emerald-600/90">Fib</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body: Meal Schedule Cards */}
        <div className="p-6 space-y-6">
          {mealEntries.length === 0 ? (
            <div className="p-10 text-center border border-dashed rounded-xl text-xs text-ink-soft bg-mist-50/40">
              <Utensils className="h-8 w-8 mx-auto text-mist-400 mb-2" />
              No meal data configured for this day.
            </div>
          ) : (
            mealEntries.map(([mealKey, mealObj]) => {
              const items: MealItem[] = mealObj.items || []
              const mealNut = getMealNutrients(mealObj)
              const timeSlot = MEAL_TIMES[mealKey] || ''

              return (
                <div
                  key={mealKey}
                  className="rounded-xl border border-mist-200 bg-white overflow-hidden shadow-xs hover:border-teal-300/80 transition-all duration-200"
                >
                  {/* Meal Slot Header with Full Corrected C, P, F, Fib, Kcal */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-mist-100 bg-mist-50/70 px-4 py-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-display text-sm font-bold text-ink flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-teal-600" />
                        {mealObj.title || mealKey}
                      </h4>
                      {timeSlot && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft font-mono bg-white px-2 py-0.5 rounded-md border border-mist-200">
                          <Clock className="h-3 w-3 text-mist-400" /> {timeSlot}
                        </span>
                      )}
                      <span className="text-[11px] text-ink-soft">
                        ({items.length} {items.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>

                    {/* Meal Macro Summary Badges */}
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
                  </div>

                  {/* Meal Items Grid */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {items.map((item, idx) => {
                      const itemNut = getItemNutrients(item)
                      const itemUniqueKey = `${mealKey}-${item.foodCode || idx}`
                      const isReasonsExpanded = expandedReasons[itemUniqueKey]

                      return (
                        <div
                          key={idx}
                          className="flex flex-col justify-between rounded-xl border border-mist-200/90 bg-mist-50/30 p-3.5 transition hover:bg-white hover:border-teal-300 hover:shadow-xs"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <h5 className="font-display text-xs font-bold text-ink leading-snug">
                                {item.name}
                              </h5>
                              <span className="font-mono text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded shrink-0">
                                {item.foodCode}
                              </span>
                            </div>

                            <p className="mt-1.5 text-xs text-ink-soft">
                              <span className="font-medium text-ink">Portion:</span> {item.portion}
                              {item.quantityGrams && (
                                <span className="font-mono text-[10px] text-ink-soft ml-1">({item.quantityGrams}g)</span>
                              )}
                            </p>
                          </div>

                          <div className="mt-3 border-t border-mist-100 pt-2.5 space-y-2">
                            {/* Structured Item Macro Chips (Kcal, C, P, F, Fib) */}
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

                            {/* Clinical Reasons & Why Toggle */}
                            {item.reasons && item.reasons.length > 0 && (
                              <div className="pt-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-wrap gap-1">
                                    {!isReasonsExpanded && item.reasons.slice(0, 2).map((r: string) => (
                                      <span
                                        key={r}
                                        className="rounded bg-teal-50/90 border border-teal-100 px-1.5 py-0.5 text-[9px] font-medium text-teal-800"
                                      >
                                        {r.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                    {!isReasonsExpanded && item.reasons.length > 2 && (
                                      <span className="text-[9px] text-ink-soft self-center">
                                        +{item.reasons.length - 2}
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleItemReason(itemUniqueKey)}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-teal-600 hover:text-teal-800 ml-auto shrink-0 transition-colors"
                                  >
                                    <HelpCircle className="h-3 w-3" />
                                    Why?
                                    {isReasonsExpanded ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>

                                {isReasonsExpanded && (
                                  <div className="mt-2 rounded-lg bg-teal-50/80 border border-teal-100 p-2.5 space-y-1.5 text-[10px] text-teal-950 animate-fadeIn">
                                    {item.reasons.map((r: string) => (
                                      <div key={r}>
                                        <span className="font-bold text-teal-900">• {r.replace(/_/g, ' ')}:</span>{' '}
                                        <span className="text-teal-800">
                                          {REASON_EXPLANATION_MAP[r] || 'Evidence-based nutrient match for your profile.'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}

          {/* Clinical Guidance Footnote */}
          <div className="flex items-start gap-3 rounded-xl border border-teal-200/70 bg-teal-50/50 p-4 text-xs text-teal-900 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-teal-950">Dietitian & Clinical Recommendation</p>
              <p className="text-teal-800 text-[11px] leading-relaxed">
                Stay well hydrated with 2.5–3 liters of water throughout the day. Cook meals with minimal cold-pressed mustard, sunflower, or olive oil (under 3–4 tsp/day) to keep saturated fats within clinical targets.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 border-t border-mist-100 bg-mist-50/90 px-6 py-3 flex items-center justify-between backdrop-blur-md">
          <span className="text-xs font-medium text-ink-soft">
            Day {dayData.dayNumber || 1} of 7 • Weekly Diet Schedule
          </span>
          <Button size="sm" onClick={onClose} className="px-5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white shadow-xs">
            Close Day View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

