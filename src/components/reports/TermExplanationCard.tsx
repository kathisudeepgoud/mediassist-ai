import { BookOpenText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { TermExplanation } from '@/types'

export function TermExplanationCard({ term, meaning }: TermExplanation) {
  return (
    <Card className="animate-rise transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <BookOpenText className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-ink">{term}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{meaning}</p>
        </div>
      </CardContent>
    </Card>
  )
}
