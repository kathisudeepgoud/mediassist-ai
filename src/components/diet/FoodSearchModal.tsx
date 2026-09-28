import { useState, useEffect } from 'react'
import { X, Search, Utensils, Flame, Beef, Leaf, Pill, Sparkle } from 'lucide-react'
import { api } from '@/services/api'
import { Badge } from '@/components/ui/badge'

interface FoodSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FoodSearchModal({ isOpen, onClose }: FoodSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [foods, setFoods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<any | null>(null)
  const [foodDetailLoading, setFoodDetailLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchFoods(searchTerm, selectedGroup)
    }
  }, [isOpen, selectedGroup])

  const fetchFoods = async (q: string, group: string) => {
    setLoading(true)
    try {
      const res = await api.searchFoods(q, group, 40)
      setFoods(res.foods || [])
    } catch (err) {
      console.error('Failed to search foods:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchFoods(searchTerm, selectedGroup)
  }

  const openFoodDetails = async (food: any) => {
    setFoodDetailLoading(true)
    setSelectedFood(null)
    try {
      const res = await api.getFoodDetails(food.id || food.foodCode)
      setSelectedFood(res.food)
    } catch (err) {
      console.error('Failed to load food details:', err)
      setSelectedFood(food)
    } finally {
      setFoodDetailLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-mist-200 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-mist-200 dark:border-zinc-800 px-6 py-4 bg-mist-50/50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <Utensils className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink dark:text-zinc-100">
                Indian Food Composition Tables (IFCT 2017) Explorer
              </h2>
              <p className="text-xs text-ink-soft dark:text-zinc-400">
                Official National Institute of Nutrition (NIN) database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-mist-200 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-mist-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
            <input
              type="text"
              placeholder="Search Indian foods by name, Hindi/local name, or code (e.g. Bajra, Ragi, Moong)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-mist-200 dark:border-zinc-800 bg-mist-50/50 dark:bg-zinc-800 pl-9 pr-4 py-2 text-xs text-ink dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </form>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-xl border border-mist-200 dark:border-zinc-800 bg-mist-50/50 dark:bg-zinc-800 px-3 py-2 text-xs text-ink dark:text-zinc-100"
          >
            <option value="">All Food Groups</option>
            <option value="A">A - Cereals & Millets</option>
            <option value="B">B - Grain Legumes & Pulses</option>
            <option value="C">C - Green Leafy Vegetables</option>
            <option value="D">D - Other Vegetables</option>
            <option value="E">E - Fruits</option>
            <option value="F">F - Roots & Tubers</option>
            <option value="G">G - Condiments & Spices</option>
            <option value="H">H - Nuts & Oil Seeds</option>
            <option value="L">L - Milk & Dairy Products</option>
            <option value="M">M - Eggs</option>
            <option value="N">N - Poultry</option>
            <option value="O">O - Animal Meat</option>
            <option value="P">P - Fish & Marine</option>
          </select>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-mist-200 dark:divide-zinc-800">
          {/* Foods List */}
          <div className="overflow-y-auto p-4 space-y-2 max-h-[55vh]">
            {loading ? (
              <div className="py-12 text-center text-xs text-ink-soft">Loading IFCT catalog...</div>
            ) : foods.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-soft">No foods found matching your query.</div>
            ) : (
              foods.map((food) => {
                const isSelected = selectedFood?.id === food.id
                const kj = food.nutrients?.enerc || 0
                const kcal = Math.round(kj / 4.184)
                const prot = food.nutrients?.protcnt || 0
                const fib = food.nutrients?.fibtg || 0

                return (
                  <div
                    key={food.id || food.foodCode}
                    onClick={() => openFoodDetails(food)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 dark:border-teal-700'
                        : 'border-mist-200 dark:border-zinc-800 hover:bg-mist-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                            {food.foodCode}
                          </span>
                          <h4 className="text-xs font-semibold text-ink dark:text-zinc-100">{food.foodName}</h4>
                        </div>
                        {food.scientificName && (
                          <p className="text-[11px] italic text-ink-soft dark:text-zinc-400 mt-0.5">
                            {food.scientificName}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {food.groupName}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-soft dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-coral-500" /> {kcal} kcal/100g
                      </span>
                      <span className="flex items-center gap-1">
                        <Beef className="h-3 w-3 text-blue-500" /> {Number(prot).toFixed(1)}g prot
                      </span>
                      <span className="flex items-center gap-1">
                        <Leaf className="h-3 w-3 text-emerald-500" /> {Number(fib).toFixed(1)}g fiber
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Selected Food Detail Panel */}
          <div className="overflow-y-auto p-4 bg-mist-50/30 dark:bg-zinc-900/30 max-h-[55vh]">
            {foodDetailLoading ? (
              <div className="py-16 text-center text-xs text-ink-soft">Loading nutrient profile...</div>
            ) : !selectedFood ? (
              <div className="py-16 text-center text-xs text-ink-soft">
                Select any food item from the list to view its complete chemical & nutrient breakdown.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-600">{selectedFood.foodCode}</span>
                    <Badge variant="outline">{selectedFood.groupName}</Badge>
                  </div>
                  <h3 className="text-sm font-bold text-ink dark:text-zinc-100 mt-1">{selectedFood.foodName}</h3>
                  {selectedFood.scientificName && (
                    <p className="italic text-ink-soft dark:text-zinc-400">{selectedFood.scientificName}</p>
                  )}
                </div>

                {/* Multilingual Names */}
                {selectedFood.localNames && selectedFood.localNames.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-ink-soft uppercase text-[10px] tracking-wide mb-1.5">
                      Regional Language Names
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {selectedFood.localNames.slice(0, 12).map((ln: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-mist-100 dark:bg-zinc-800 text-[11px] text-ink dark:text-zinc-300"
                        >
                          <strong className="text-ink-soft">{ln.language}:</strong> {ln.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrients Table */}
                <div>
                  <h5 className="font-semibold text-ink-soft uppercase text-[10px] tracking-wide mb-2">
                    Nutritional Composition (per 100g)
                  </h5>
                  <div className="rounded-xl border border-mist-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-800/60">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-mist-50 dark:bg-zinc-800 border-b border-mist-200 dark:border-zinc-700 text-ink-soft">
                        <tr>
                          <th className="py-1.5 px-3 font-medium">Nutrient</th>
                          <th className="py-1.5 px-3 font-medium">Category</th>
                          <th className="py-1.5 px-3 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mist-100 dark:divide-zinc-800">
                        {(selectedFood.nutrients || []).map((n: any, idx: number) => (
                          <tr key={idx} className="hover:bg-mist-50/50 dark:hover:bg-zinc-700/30">
                            <td className="py-1.5 px-3 font-medium text-ink dark:text-zinc-200">{n.name}</td>
                            <td className="py-1.5 px-3 text-ink-soft dark:text-zinc-400">{n.category}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-ink dark:text-zinc-100">
                              {Number(n.amountPer100g).toFixed(2)} {n.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-mist-200 dark:border-zinc-800 px-6 py-3 bg-mist-50/50 dark:bg-zinc-800/50 text-[11px] text-ink-soft dark:text-zinc-400">
          <span>Source: Indian Food Composition Tables (IFCT 2017) • NIN / ICMR</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-mist-200 dark:bg-zinc-800 text-ink dark:text-zinc-100 font-medium hover:bg-mist-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
