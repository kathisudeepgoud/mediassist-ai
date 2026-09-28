import { useState, useEffect } from 'react'
import {
  RotateCw,
  SlidersHorizontal,
  Utensils,
  History,
  AlertTriangle,
  Flame,
  Sparkles,
  Trash2,
  CalendarDays,
  CheckCircle2
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'
import { NutritionSummaryCard } from '@/components/diet/NutritionSummaryCard'
import { MealPlanView } from '@/components/diet/MealPlanView'
import { WeeklyDietTable } from '@/components/diet/WeeklyDietTable'
import { DietDayDetailsModal } from '@/components/diet/DietDayDetailsModal'
import { FoodExplorerTable } from '@/components/diet/FoodExplorerTable'
import { FoodDetailModal } from '@/components/diet/FoodDetailModal'
import { DietPreferencesModal } from '@/components/diet/DietPreferencesModal'
import type { WeeklyDietDay } from '@/types'

export default function DietPlannerPage() {
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dietPlan, setDietPlan] = useState<any | null>(null)
  const [profileData, setProfileData] = useState<any | null>(null)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // Modals state
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false)
  const [selectedFoodForDetail, setSelectedFoodForDetail] = useState<any | null>(null)
  const [selectedDayForModal, setSelectedDayForModal] = useState<WeeklyDietDay | null>(null)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)

  useEffect(() => {
    loadDietData()
  }, [])

  const loadDietData = async () => {
    setLoading(true)
    try {
      const [profileRes, planRes, histRes] = await Promise.all([
        api.getDietProfile().catch(() => null),
        api.getCurrentDietPlan().catch(() => null),
        api.getDietPlanHistory().catch(() => ({ total: 0, history: [] }))
      ])

      if (profileRes) setProfileData(profileRes)
      if (planRes) setDietPlan(planRes)
      if (histRes) setHistoryList(histRes.history || [])
    } catch (err: any) {
      console.error('Failed to load diet data:', err)
      showToast('Diet Planner', err.message || 'Failed to load diet data', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePlan = async () => {
    setGenerating(true)
    try {
      const res = await api.generateDietPlan()
      setDietPlan(res)
      showToast('Diet Plan Ready', '7-day personalized weekly diet plan generated from your health profile.', 'success')
      const histRes = await api.getDietPlanHistory().catch(() => ({ total: 0, history: [] }))
      setHistoryList(histRes.history || [])
    } catch (err: any) {
      console.error('Failed to generate diet plan:', err)
      showToast('Generation Failed', err.message || 'Could not generate plan', 'danger')
    } finally {
      setGenerating(false)
    }
  }

  const handleSavePreferences = async (updatedPrefs: any) => {
    try {
      await api.updateDietProfile(updatedPrefs)
      showToast('Preferences Saved', 'Updating your personalized weekly meal plan...', 'info')
      const res = await api.generateDietPlan()
      setDietPlan(res)
      const profileRes = await api.getDietProfile()
      setProfileData(profileRes)
      showToast('Plan Synchronized', 'Weekly meal plan updated with your new preferences.', 'success')
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not save preferences', 'danger')
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!planId) return
    setDeletingId(planId)
    try {
      await api.deleteDietPlan(planId)
      setHistoryList((prev) => prev.filter((p) => p.id !== planId))
      showToast('Plan Deleted', 'The historical diet plan has been removed.', 'success')
    } catch (err: any) {
      console.error('Failed to delete diet plan:', err)
      showToast('Delete Failed', err.message || 'Could not delete diet plan', 'danger')
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenDayModal = (day: WeeklyDietDay) => {
    setSelectedDayForModal(day)
    setIsDayModalOpen(true)
  }

  const preferences = profileData?.preferences || {}
  const dailyNutrition = dietPlan?.dailyNutrition || {}
  const weeklyPlan: WeeklyDietDay[] = dietPlan?.weeklyPlan || []
  const meals = dietPlan?.meals || {}
  const safety = dietPlan?.safety || {}
  const hasWeeklyPlan = weeklyPlan && weeklyPlan.length > 0

  return (
    <div className="space-y-6">
      {/* 1. Standard Page Header */}
      <PageHeader
        crumbs={['MediAssist AI', 'Diet Planner']}
        title="Weekly Diet Planner"
        description="Personalized 7-day nutrition recommendations based on your health profile and laboratory results."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrefModalOpen(true)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4 text-ink-soft" />
              Preferences
            </Button>
            <Button
              size="sm"
              onClick={handleGeneratePlan}
              disabled={generating}
              className="gap-1.5 font-medium"
            >
              <RotateCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : dietPlan ? 'Regenerate Weekly Plan' : 'Generate Weekly Plan'}
            </Button>
          </div>
        }
      />

      {/* 2. Loading Skeleton */}
      {loading && (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {/* Clinical Safety & Disclaimer Notice (if any alerts) */}
      {safety.warnings && safety.warnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 animate-rise">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">Clinical Dietary Notes:</span>
            <ul className="space-y-0.5 text-amber-800">
              {safety.warnings.map((w: any, idx: number) => (
                <li key={idx}>• {w.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. Main Content View */}
      {!loading && (
        <div className="space-y-6">
          {/* Daily Nutrition Summary placed prominently at top */}
          <NutritionSummaryCard
            dailyNutrition={dailyNutrition}
            targetCalories={dietPlan?.targetCalories || 1800}
            preferences={preferences}
          />

          {/* Empty State if no plan generated yet */}
          {!dietPlan || (!hasWeeklyPlan && Object.keys(meals).length === 0) ? (
            <Card className="py-12 text-center border-dashed">
              <CardContent className="flex flex-col items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 mb-3">
                  <Utensils className="h-6 w-6" />
                </div>
                <h3 className="font-display text-base font-semibold text-ink">No Personalized Weekly Diet Plan Yet</h3>
                <p className="mt-1 max-w-sm text-sm text-ink-soft">
                  Generate a complete 7-day customized meal plan tailored to your laboratory values and dietary preferences.
                </p>
                <Button onClick={handleGeneratePlan} disabled={generating} className="mt-4 gap-2">
                  <Sparkles className="h-4 w-4" />
                  {generating ? 'Generating 7-Day Plan...' : 'Generate 7-Day Weekly Plan'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Primary Layout: 7-Day Weekly Diet Plan Table */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-teal-600" />
                    Personalized 7-Day Weekly Diet Plan
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Complete weekly schedule (Monday – Sunday) with authentic Indian foods rotating daily for balanced nutrition.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs py-1 px-2.5 bg-mist-50/60">
                    {preferences.dietType || preferences.diet_type || 'Vegetarian'}
                  </Badge>
                  <Badge variant="outline" className="text-xs py-1 px-2.5 bg-mist-50/60">
                    {preferences.foodPreference || preferences.food_preference || 'All Cuisines'}
                  </Badge>
                  <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs py-1 px-2.5">
                    7-Day Schedule
                  </Badge>
                </div>
              </div>

              {/* 7-Day Responsive Weekly Table */}
              {hasWeeklyPlan ? (
                <WeeklyDietTable
                  weeklyPlan={weeklyPlan}
                  onSelectDay={handleOpenDayModal}
                />
              ) : (
                <MealPlanView meals={meals} preferences={preferences} />
              )}
            </div>
          )}

          {/* 4. Explore Indian Foods Section */}
          <FoodExplorerTable onSelectFood={(food) => setSelectedFoodForDetail(food)} />

          {/* 5. Plan History Section with Delete Option */}
          <Card className="animate-rise">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-teal-600" /> Previous Diet Plans
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical meal plans and rule versions persisted in your medical profile
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs"
              >
                {showHistory ? 'Hide History' : `View History (${historyList.length})`}
              </Button>
            </CardHeader>

            {showHistory && (
              <CardContent className="p-0 border-t border-mist-100">
                {historyList.length === 0 ? (
                  <p className="p-6 text-center text-xs text-ink-soft">No previous plans recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-mist-200 bg-mist-50/50 text-[11px] uppercase tracking-wider text-ink-soft font-medium">
                          <th className="py-2.5 px-4">Date Generated</th>
                          <th className="py-2.5 px-3">Patient ID</th>
                          <th className="py-2.5 px-3 font-mono">Calories</th>
                          <th className="py-2.5 px-3">Safety Status</th>
                          <th className="py-2.5 px-3 font-mono">Rule Version</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mist-100">
                        {historyList.map((h: any) => {
                          const summary =
                            typeof h.nutritionSummary === 'string'
                              ? JSON.parse(h.nutritionSummary)
                              : h.nutritionSummary || {}
                          const isDeleting = deletingId === h.id

                          return (
                            <tr key={h.id} className="hover:bg-mist-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-medium text-ink">
                                {new Date(h.generatedAt || h.createdAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-ink-soft">{h.patientId || 'P000001'}</td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-coral-600">
                                {summary.calories || '-'} kcal
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant="outline" className="text-[10px]">
                                  {h.safetyStatus || 'SAFE'}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-ink-soft">
                                {h.ruleVersion || '1.0.0-IFCT2017'}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePlan(h.id)}
                                  disabled={isDeleting}
                                  className="h-7 w-7 p-0 text-ink-soft hover:text-rose-600 hover:bg-rose-50"
                                  title="Delete diet plan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Preferences Modal */}
      <DietPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        initialPreferences={preferences}
        onSave={handleSavePreferences}
      />

      {/* Food Detail Modal */}
      <FoodDetailModal
        food={selectedFoodForDetail}
        isOpen={Boolean(selectedFoodForDetail)}
        onClose={() => setSelectedFoodForDetail(null)}
      />

      {/* Day Details Modal */}
      <DietDayDetailsModal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        dayData={selectedDayForModal}
        preferences={preferences}
      />
    </div>
  )
}

