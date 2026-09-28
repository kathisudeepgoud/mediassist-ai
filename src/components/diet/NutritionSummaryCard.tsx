import { Flame, Beef, Wheat, Leaf, Droplets, CheckCircle2, ShieldCheck, HeartPulse } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface NutritionSummaryCardProps {
  dailyNutrition: any
  targetCalories?: number
  preferences?: any
}

export function NutritionSummaryCard({
  dailyNutrition = {},
  targetCalories = 1800,
  preferences = {}
}: NutritionSummaryCardProps) {
  const calories = dailyNutrition.calories || 0
  const protein = dailyNutrition.protein || 0
  const carbs = dailyNutrition.carbs || 0
  const fat = dailyNutrition.fat || 0
  const fiber = dailyNutrition.fiber || 0
  const sodium = dailyNutrition.sodium || 0
  const potassium = dailyNutrition.potassium || 0
  const iron = dailyNutrition.iron || 0
  const calcium = dailyNutrition.calcium || 0

  const calPercent = Math.min(100, Math.round((calories / (targetCalories || 1800)) * 100))

  return (
    <Card className="animate-rise border-mist-200 shadow-xs">
      <CardHeader className="pb-3 border-b border-mist-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-50 text-coral-600">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-ink">Daily Nutrition Summary</CardTitle>
              <CardDescription className="text-xs">
                Aggregate nutritional breakdown calculated from meal portions and the IFCT 2017 database
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs py-1 px-2.5 bg-mist-50/60">
              {calories} / {targetCalories} kcal ({calPercent}%)
            </Badge>
            <Badge variant="outline" className="text-xs py-1 px-2.5 bg-teal-50/60 text-teal-700 border-teal-200">
              {preferences.dietType || preferences.diet_type || 'Vegetarian'}
            </Badge>
            <Badge variant="outline" className="text-xs py-1 px-2.5 bg-mist-50/60">
              {preferences.mealCount || preferences.meal_count || 5} Meals
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Caloric Fulfillment Bar */}
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium text-ink flex items-center gap-1.5">
              <HeartPulse className="h-3.5 w-3.5 text-coral-500" />
              <span>Target Caloric Fulfillment</span>
            </span>
            <span className="font-mono font-semibold text-teal-700">{calPercent}% of target ({calories} kcal)</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-mist-100">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-500"
              style={{ width: `${calPercent}%` }}
            />
          </div>
        </div>

        {/* Macronutrients Grid (4 Columns) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-mist-200 bg-mist-50/40 p-3 transition-colors hover:bg-mist-50/80">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Beef className="h-3.5 w-3.5 text-blue-600" />
                <span>Protein</span>
              </span>
              <span className="text-[11px] font-mono">{Math.round(((protein * 4) / (calories || 1)) * 100)}% energy</span>
            </div>
            <p className="mt-1.5 font-mono text-lg font-bold text-ink">{protein} g</p>
            <p className="text-[11px] text-ink-soft">High biological value</p>
          </div>

          <div className="rounded-xl border border-mist-200 bg-mist-50/40 p-3 transition-colors hover:bg-mist-50/80">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Wheat className="h-3.5 w-3.5 text-amber-600" />
                <span>Carbohydrates</span>
              </span>
              <span className="text-[11px] font-mono">{Math.round(((carbs * 4) / (calories || 1)) * 100)}% energy</span>
            </div>
            <p className="mt-1.5 font-mono text-lg font-bold text-ink">{carbs} g</p>
            <p className="text-[11px] text-ink-soft">Complex & low-GI grains</p>
          </div>

          <div className="rounded-xl border border-mist-200 bg-mist-50/40 p-3 transition-colors hover:bg-mist-50/80">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                <span>Dietary Fiber</span>
              </span>
              <Badge variant="success" className="text-[10px] py-0 px-1">RDA &ge;30g</Badge>
            </div>
            <p className="mt-1.5 font-mono text-lg font-bold text-ink">{fiber} g</p>
            <p className="text-[11px] text-emerald-700">Healthy glycemic satiety</p>
          </div>

          <div className="rounded-xl border border-mist-200 bg-mist-50/40 p-3 transition-colors hover:bg-mist-50/80">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-coral-500" />
                <span>Total Fat</span>
              </span>
              <span className="text-[11px] font-mono">{Math.round(((fat * 9) / (calories || 1)) * 100)}% energy</span>
            </div>
            <p className="mt-1.5 font-mono text-lg font-bold text-ink">{fat} g</p>
            <p className="text-[11px] text-ink-soft">MUFA & PUFA dominant</p>
          </div>
        </div>

        {/* Micronutrient Targets (4 Columns) */}
        <div className="border-t border-mist-100 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="flex flex-col justify-between rounded-lg border border-mist-100 bg-white p-2.5">
              <span className="text-ink-soft text-[11px]">Sodium (Na)</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-ink">{sodium} mg</span>
                <span className="text-[10px] text-ink-soft">&lt; 2000 mg</span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-mist-100 bg-white p-2.5">
              <span className="text-ink-soft text-[11px]">Potassium (K)</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-ink">{potassium} mg</span>
                <span className="text-[10px] text-ink-soft">Renal Safe</span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-mist-100 bg-white p-2.5">
              <span className="text-ink-soft text-[11px]">Dietary Iron (Fe)</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-ink">{iron} mg</span>
                <span className="text-[10px] text-teal-700">Anemia RDA</span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-mist-100 bg-white p-2.5">
              <span className="text-ink-soft text-[11px]">Calcium (Ca)</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="font-mono font-bold text-ink">{calcium} mg</span>
                <span className="text-[10px] text-ink-soft">Bone Health</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

