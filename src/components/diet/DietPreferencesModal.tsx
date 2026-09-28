import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, SlidersHorizontal, AlertCircle } from 'lucide-react'

interface DietPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  initialPreferences?: any
  onSave: (updated: any) => Promise<void>
}

const COMMON_ALLERGIES = [
  'Peanuts',
  'Tree nuts (Almonds/Walnuts)',
  'Dairy / Milk / Lactose',
  'Gluten / Wheat',
  'Eggs',
  'Fish',
  'Shellfish / Prawns',
  'Soy',
  'Sesame (Til)',
  'Mustard (Sarson)'
]

const DIET_TYPES = [
  { id: 'Vegetarian', label: 'Vegetarian' },
  { id: 'Eggetarian', label: 'Eggetarian' },
  { id: 'Non-Vegetarian', label: 'Non-Vegetarian' }
]
const REGIONS = ['All', 'North Indian', 'South Indian', 'East Indian', 'West Indian']
const ACTIVITY_LEVELS = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active']
const HEALTH_GOALS = [
  'Maintenance',
  'Weight Loss (Caloric Deficit)',
  'Muscle Gain & High Protein',
  'Manage Diabetes (Low GI)',
  'Heart Health (Low Sodium & Fats)',
  'Kidney Care (Renal Safety)'
]

export function DietPreferencesModal({
  isOpen,
  onClose,
  initialPreferences,
  onSave
}: DietPreferencesModalProps) {
  const [dietType, setDietType] = useState(initialPreferences?.dietType || initialPreferences?.diet_type || 'Vegetarian')
  const [foodPreference, setFoodPreference] = useState(initialPreferences?.foodPreference || initialPreferences?.food_preference || 'All')
  const [activityLevel, setActivityLevel] = useState(initialPreferences?.activityLevel || initialPreferences?.activity_level || 'Moderately Active')
  const [mealCount, setMealCount] = useState<number>(initialPreferences?.mealCount || initialPreferences?.meal_count || 5)
  const [healthGoal, setHealthGoal] = useState(initialPreferences?.healthGoal || initialPreferences?.health_goal || 'Maintenance')
  const [allergies, setAllergies] = useState<string[]>(initialPreferences?.allergies || [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialPreferences) {
      setDietType(initialPreferences.dietType || initialPreferences.diet_type || 'Vegetarian')
      setFoodPreference(initialPreferences.foodPreference || initialPreferences.food_preference || 'All')
      setActivityLevel(initialPreferences.activityLevel || initialPreferences.activity_level || 'Moderately Active')
      setMealCount(initialPreferences.mealCount || initialPreferences.meal_count || 5)
      setHealthGoal(initialPreferences.healthGoal || initialPreferences.health_goal || 'Maintenance')
      setAllergies(initialPreferences.allergies || [])
    }
  }, [initialPreferences, isOpen])

  if (!isOpen) return null

  const toggleAllergy = (a: string) => {
    if (allergies.includes(a)) {
      setAllergies(allergies.filter((x) => x !== a))
    } else {
      setAllergies([...allergies, a])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        dietType,
        foodPreference,
        activityLevel,
        mealCount,
        healthGoal,
        allergies,
        excludedFoods: []
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="border-b border-mist-100 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5 text-teal-600" /> Dietary Preferences & Constraints
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure your dietary patterns, regional cuisine preferences, and allergens.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-3 text-xs">
          {/* Dietary Pattern */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">
              Dietary Pattern
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {DIET_TYPES.map((dt) => {
                const active = dietType === dt.id
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDietType(dt.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      active
                        ? 'border-teal-400 bg-teal-50 text-teal-700 shadow-xs'
                        : 'border-mist-200 text-ink hover:bg-mist-50'
                    }`}
                  >
                    <span className="font-semibold text-xs text-ink">{dt.label}</span>
                    {active && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Regional & Activity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1.5">
                Regional Cuisine Preference
              </label>
              <select
                value={foodPreference}
                onChange={(e) => setFoodPreference(e.target.value)}
                className="w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1.5">
                Physical Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
              >
                {ACTIVITY_LEVELS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meals per day & Health Goal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1.5">
                Daily Meal Schedule
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMealCount(5)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition ${
                    mealCount === 5
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-mist-200 text-ink hover:bg-mist-50'
                  }`}
                >
                  5 Meals (with Snacks)
                </button>
                <button
                  type="button"
                  onClick={() => setMealCount(3)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition ${
                    mealCount === 3
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-mist-200 text-ink hover:bg-mist-50'
                  }`}
                >
                  3 Main Meals
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1.5">
                Health Target / Goal
              </label>
              <select
                value={healthGoal}
                onChange={(e) => setHealthGoal(e.target.value)}
                className="w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
              >
                {HEALTH_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Allergies & Intolerances
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_ALLERGIES.map((a) => {
                const checked = allergies.includes(a)
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAllergy(a)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs text-left transition ${
                      checked
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-mist-200 text-ink-soft hover:bg-mist-50'
                    }`}
                  >
                    <span className="truncate">{a}</span>
                    {checked && <Check className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-mist-100 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
