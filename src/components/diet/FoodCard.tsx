import { Apple, Flame, Beef } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FoodItem } from '@/types'

export function FoodCard({ food, variant = 'recommend' }: { food: FoodItem; variant?: 'recommend' | 'avoid' }) {
  return (
    <Card className="animate-rise overflow-hidden transition-shadow hover:shadow-md">
      <div
        className={
          variant === 'recommend'
            ? 'flex h-24 items-center justify-center bg-teal-50 text-teal-600'
            : 'flex h-24 items-center justify-center bg-rose-100 text-rose-500'
        }
      >
        <Apple className="h-8 w-8" />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-sm font-semibold text-ink">{food.name}</p>
          <Badge variant="outline">{food.category}</Badge>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{food.benefits}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-coral-500" /> {food.calories} kcal
          </span>
          <span className="flex items-center gap-1">
            <Beef className="h-3.5 w-3.5 text-blue-500" /> {food.protein}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
