import { useState, useEffect } from 'react'
import { Search, Utensils, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'

interface FoodExplorerTableProps {
  onSelectFood: (food: any) => void
}

const FOOD_GROUPS = [
  { code: '', label: 'All Groups' },
  { code: 'A', label: 'Cereals & Millets' },
  { code: 'B', label: 'Grain Legumes & Pulses' },
  { code: 'C', label: 'Green Leafy Vegetables' },
  { code: 'D', label: 'Other Vegetables' },
  { code: 'E', label: 'Fruits' },
  { code: 'F', label: 'Roots & Tubers' },
  { code: 'G', label: 'Condiments & Spices' },
  { code: 'H', label: 'Nuts & Oil Seeds' },
  { code: 'L', label: 'Milk & Dairy' },
  { code: 'M', label: 'Eggs' },
  { code: 'P', label: 'Fish & Seafood' }
]

export function FoodExplorerTable({ onSelectFood }: FoodExplorerTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [foods, setFoods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFoods = async (q: string, group: string) => {
    setLoading(true)
    try {
      const res = await api.searchFoods(q, group, 25)
      setFoods(res.foods || [])
    } catch (err) {
      console.error('Failed to search foods:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFoods(searchTerm, selectedGroup)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedGroup])

  return (
    <Card className="animate-rise">
      <CardHeader className="border-b border-mist-100 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Utensils className="h-4 w-4 text-teal-600" /> Explore Indian Foods (IFCT 2017)
            </CardTitle>
            <CardDescription className="text-xs">
              Search and inspect nutritional composition for 542 foods from the National Institute of Nutrition
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-soft" />
              <input
                type="text"
                placeholder="Search food or Hindi name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-mist-200 bg-white py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink-soft focus:border-teal-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="rounded-lg border border-mist-200 bg-white px-2.5 py-1.5 text-xs text-ink focus:border-teal-500 focus:outline-none"
            >
              {FOOD_GROUPS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : foods.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-soft">
            No Indian foods found matching &quot;{searchTerm}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead>
                <tr className="border-b border-mist-200 bg-mist-50/50 text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-3">Food Name</th>
                  <th className="py-2.5 px-3">Group</th>
                  <th className="py-2.5 px-3 font-mono text-right">Energy (100g)</th>
                  <th className="py-2.5 px-3 font-mono text-right">Protein</th>
                  <th className="py-2.5 px-3 font-mono text-right">Fiber</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {foods.map((food) => {
                  const kj = food.nutrients?.enerc || 0
                  const kcal = Math.round(kj / 4.184)
                  const prot = Number(food.nutrients?.protcnt || 0).toFixed(1)
                  const fib = Number(food.nutrients?.fibtg || 0).toFixed(1)

                  return (
                    <tr
                      key={food.id || food.foodCode}
                      className="transition-colors hover:bg-mist-50/70"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-teal-700">
                        {food.foodCode}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-ink">{food.foodName}</p>
                        {food.scientificName && (
                          <p className="text-[11px] italic text-ink-soft">{food.scientificName}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px]">
                          {food.groupName}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right font-medium text-ink">
                        {kcal} kcal
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-ink-soft">
                        {prot} g
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-teal-700 font-medium">
                        {fib} g
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectFood(food)}
                          className="font-medium text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-0.5"
                        >
                          View <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
