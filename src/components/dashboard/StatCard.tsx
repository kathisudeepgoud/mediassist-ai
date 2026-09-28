import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  value?: number
  displayValue?: string
  decimals?: number
  suffix?: string
  icon: React.ReactNode
  accent?: 'teal' | 'blue' | 'coral' | 'rose'
  trend?: string
}

const accentMap = {
  teal: 'bg-teal-50 text-teal-600',
  blue: 'bg-blue-50 text-blue-600',
  coral: 'bg-coral-100 text-coral-600',
  rose: 'bg-rose-100 text-rose-500',
}

export function StatCard({ label, value, displayValue, decimals = 0, suffix = '', icon, accent = 'teal', trend }: StatCardProps) {
  const animated = useCountUp(value ?? 0, 900, decimals)
  return (
    <Card className="animate-rise transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-ink">
            {displayValue ?? (
              <>
                {animated}
                {suffix}
              </>
            )}
          </p>
          {trend && <p className="mt-1 text-xs text-teal-600">{trend}</p>}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accentMap[accent])}>{icon}</div>
      </CardContent>
    </Card>
  )
}
