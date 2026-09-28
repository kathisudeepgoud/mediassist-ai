import React from 'react'
import { ChevronRight, Flame, Calendar, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WeeklyDietDay } from '@/types'

interface WeeklyDietTableProps {
  weeklyPlan: WeeklyDietDay[]
  onSelectDay: (day: WeeklyDietDay) => void
}

function getMealPreview(items: any[] = []): string {
  if (!items || items.length === 0) return 'Standard meal'
  const names = items.map((i) => i.name?.replace(/\s*\([^)]*\)/g, '').trim())
  if (names.length <= 2) return names.join(' + ')
  return `${names.slice(0, 2).join(' + ')} + ${names.length - 2} more`
}

function getMealCalories(meal: any): number {
  if (meal?.nutrition?.calories && meal.nutrition.calories > 0) {
    return meal.nutrition.calories
  }
  const items = meal?.items || []
  let sum = 0
  for (const item of items) {
    const qty = Number(item.quantityGrams) || 100
    const factor = qty / 100.0
    const n = item.foodNutrients || item.nutrients || {}
    if (typeof item.calories === 'number' && item.calories > 0) {
      sum += item.calories
    } else if (n.calories !== undefined && !isNaN(Number(n.calories)) && Number(n.calories) > 0) {
      sum += Number(n.calories)
    } else if (n.enerc !== undefined && !isNaN(Number(n.enerc))) {
      sum += Math.round((Number(n.enerc) / 4.184) * factor)
    } else if (n.energy !== undefined && !isNaN(Number(n.energy))) {
      sum += Math.round(Number(n.energy) * factor)
    }
  }
  return sum
}

export const WeeklyDietTable: React.FC<WeeklyDietTableProps> = ({ weeklyPlan = [], onSelectDay }) => {
  if (!weeklyPlan || weeklyPlan.length === 0) {
    return (
      <Card className="border-mist-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm text-ink-soft">No weekly plan data available for display.</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-mist-200 bg-white shadow-xs animate-rise">
      <CardHeader className="border-b border-mist-100 bg-mist-50/50 py-4 px-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0F766E]" />
              7-Day Weekly Meal Schedule
            </CardTitle>
            <CardDescription className="text-xs text-ink-soft">
              Click &quot;View More&quot; on any day to inspect itemized portions, macronutrients, and clinical reasons.
            </CardDescription>
          </div>
          <Badge className="bg-teal-50 text-teal-800 border-teal-200 self-start sm:self-auto text-xs font-semibold">
            <Sparkles className="h-3 w-3 mr-1 text-teal-600" /> Complete 7-Day Plan
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-mist-200 bg-mist-50/70 text-xs font-bold uppercase tracking-wider text-ink-soft">
                <th className="py-3.5 px-4 font-semibold">Day</th>
                <th className="py-3.5 px-4 font-semibold">Breakfast</th>
                <th className="py-3.5 px-4 font-semibold">Lunch</th>
                <th className="py-3.5 px-4 font-semibold">Dinner</th>
                <th className="py-3.5 px-4 font-semibold text-center">Calories</th>
                <th className="py-3.5 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist-100">
              {weeklyPlan.map((dayPlan, idx) => {
                const meals = dayPlan.meals || {}
                const bf = meals.breakfast?.items || []
                const lunch = meals.lunch?.items || []
                const dinner = meals.dinner?.items || []
                const bfKcal = getMealCalories(meals.breakfast)
                const lunchKcal = getMealCalories(meals.lunch)
                const dinnerKcal = getMealCalories(meals.dinner)
                const dailyKcal = dayPlan.dailyNutrition?.calories || dayPlan.nutrition?.calories || (bfKcal + lunchKcal + dinnerKcal) || dayPlan.targetCalories || 1800
                const isEven = idx % 2 === 0

                return (
                  <tr
                    key={dayPlan.day || idx}
                    className={`transition-colors hover:bg-teal-50/40 ${isEven ? 'bg-white' : 'bg-mist-50/20'}`}
                  >
                    {/* Day Column */}
                    <td className="py-4 px-4 font-display font-semibold text-ink whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-xs font-bold text-teal-700 border border-teal-100">
                          D{idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink leading-tight">{dayPlan.day}</p>
                          {dayPlan.date && (
                            <p className="text-[11px] text-ink-soft font-normal">{dayPlan.date}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Breakfast Column */}
                    <td className="py-4 px-4 max-w-[220px]">
                      <p className="text-xs font-medium text-ink truncate" title={getMealPreview(bf)}>
                        {getMealPreview(bf)}
                      </p>
                      <span className="text-[11px] text-ink-soft font-mono">
                        {bfKcal} kcal
                      </span>
                    </td>

                    {/* Lunch Column */}
                    <td className="py-4 px-4 max-w-[240px]">
                      <p className="text-xs font-medium text-ink truncate" title={getMealPreview(lunch)}>
                        {getMealPreview(lunch)}
                      </p>
                      <span className="text-[11px] text-ink-soft font-mono">
                        {lunchKcal} kcal
                      </span>
                    </td>

                    {/* Dinner Column */}
                    <td className="py-4 px-4 max-w-[220px]">
                      <p className="text-xs font-medium text-ink truncate" title={getMealPreview(dinner)}>
                        {getMealPreview(dinner)}
                      </p>
                      <span className="text-[11px] text-ink-soft font-mono">
                        {dinnerKcal} kcal
                      </span>
                    </td>

                    {/* Calories Column */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800 font-mono text-xs font-bold">
                        <Flame className="h-3 w-3 mr-1 text-coral-600" />
                        {dailyKcal} kcal
                      </Badge>
                    </td>

                    {/* Actions Column */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        onClick={() => onSelectDay(dayPlan)}
                        className="h-8 gap-1 rounded-lg bg-[#0F766E] text-white hover:bg-[#0F766E]/90 text-xs font-semibold shadow-xs"
                      >
                        <span>View More</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
