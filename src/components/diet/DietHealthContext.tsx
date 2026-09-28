import { ShieldAlert, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DietHealthContextProps {
  diseaseRisks: any[]
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  Low: 'success',
  LOW: 'success',
  Moderate: 'warning',
  MODERATE: 'warning',
  High: 'danger',
  HIGH: 'danger',
}

export function DietHealthContext({ diseaseRisks }: DietHealthContextProps) {
  if (!diseaseRisks || diseaseRisks.length === 0) return null

  return (
    <Card className="animate-rise border-mist-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-teal-600" />
              <h3 className="font-display text-sm font-semibold text-ink">Health Profile Context</h3>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">
              Dietary constraints automatically synchronized with your latest laboratory findings and ML risk predictions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {diseaseRisks.map((risk) => {
              const status = risk.status || (risk.percentage >= 60 ? 'High' : risk.percentage >= 30 ? 'Moderate' : 'Low')
              const variant = statusVariant[status] || 'success'

              return (
                <div
                  key={risk.id || risk.name}
                  className="flex items-center gap-2 rounded-lg border border-mist-200 bg-mist-50/60 px-3 py-1.5 text-xs transition-colors hover:bg-mist-100"
                >
                  <span className="font-medium text-ink">{risk.name || risk.id}</span>
                  <Badge variant={variant} className="text-[11px] py-0 px-1.5 font-semibold">
                    {status} ({risk.percentage}%)
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
