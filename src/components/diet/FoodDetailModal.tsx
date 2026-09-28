import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'

interface FoodDetailModalProps {
  food: any | null
  isOpen: boolean
  onClose: () => void
}

export function FoodDetailModal({ food, isOpen, onClose }: FoodDetailModalProps) {
  const [details, setDetails] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (food && isOpen) {
      setLoading(true)
      setDetails(null)
      const foodIdentifier = food.id || food.foodCode || food.food_code
      api
        .getFoodDetails(foodIdentifier)
        .then((res) => {
          if (res?.food) {
            setDetails(res.food)
          } else {
            setDetails(food)
          }
        })
        .catch((err) => {
          console.error('Failed to fetch food details:', err)
          setDetails(food)
        })
        .finally(() => setLoading(false))
    } else if (!isOpen) {
      setDetails(null)
      setLoading(false)
    }
  }, [food, isOpen])

  if (!isOpen || !food) return null

  const displayFood = details || food
  const localNames = Array.isArray(displayFood.localNames)
    ? displayFood.localNames
    : Array.isArray(displayFood.local_names)
    ? displayFood.local_names
    : []
  const nutrientList = Array.isArray(displayFood.nutrients)
    ? displayFood.nutrients
    : []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="border-b border-mist-100 pb-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              {displayFood.foodCode || displayFood.food_code}
            </span>
            <Badge variant="outline">{displayFood.groupName || displayFood.group_name || 'Indian Food'}</Badge>
          </div>
          <DialogTitle className="mt-1 text-lg">{displayFood.foodName || displayFood.food_name || 'Food Details'}</DialogTitle>
          {(displayFood.scientificName || displayFood.scientific_name) && (
            <DialogDescription className="italic text-xs">
              {displayFood.scientificName || displayFood.scientific_name}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3 text-xs">
          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              {/* Regional Names */}
              {localNames.length > 0 && (
                <div>
                  <p className="font-semibold text-ink-soft uppercase text-[10px] tracking-wide mb-1.5">
                    Regional Indian Names
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {localNames.map((ln: any, idx: number) => (
                      <span
                        key={idx}
                        className="rounded bg-mist-100 px-2 py-0.5 text-[11px] text-ink"
                      >
                        <strong className="text-ink-soft">{ln.language}:</strong> {ln.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Composition Table */}
              <div>
                <p className="font-semibold text-ink-soft uppercase text-[10px] tracking-wide mb-2">
                  Nutritional Composition (per 100g)
                </p>
                {nutrientList.length === 0 ? (
                  <div className="rounded-xl border border-mist-200 bg-mist-50/50 p-4 text-center text-xs text-ink-soft">
                    Detailed nutrient breakdown loading or unavailable.
                  </div>
                ) : (
                  <div className="rounded-xl border border-mist-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-mist-50 text-ink-soft text-[11px] border-b border-mist-200 font-medium">
                        <tr>
                          <th className="py-2 px-3">Nutrient</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mist-100">
                        {nutrientList.map((n: any, idx: number) => (
                          <tr key={idx} className="hover:bg-mist-50/50">
                            <td className="py-1.5 px-3 font-medium text-ink">{n.name}</td>
                            <td className="py-1.5 px-3 text-ink-soft">{n.category}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-ink">
                              {Number(n.amountPer100g || n.amount_per_100g || 0).toFixed(2)} {n.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-mist-100 pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
