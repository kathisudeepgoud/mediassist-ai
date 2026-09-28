import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendChart } from '@/components/trends/TrendChart'
import { mockTrends } from '@/data/trends'
import { cn } from '@/utils/cn'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'

const filters = [
  { label: 'Last Month', months: 1 },
  { label: 'Last 6 Months', months: 6 },
  { label: 'Last Year', months: 12 },
  { label: 'Last 3 Years', months: 36 },
]

export default function HealthTrendsPage() {
  const [activeFilter, setActiveFilter] = useState(filters[2])
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTrends = async () => {
    try {
      setLoading(true)
      const res = await api.getTrends()
      if (res.trends) {
        setTrends(res.trends)
      }
    } catch {
      setTrends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends()
    const handleUpdate = () => fetchTrends()
    window.addEventListener('medassist_reports_updated', handleUpdate)
    return () => window.removeEventListener('medassist_reports_updated', handleUpdate)
  }, [])

  const filteredMetrics = useMemo(
    () =>
      trends.map((m) => {
        const rawData = m.data || []
        // Keep at least 3 points or max matching filter count so graph line is always rendered
        const sliceCount = Math.max(3, Math.min(rawData.length, activeFilter.months * 2))
        return {
          ...m,
          data: rawData.slice(Math.max(0, rawData.length - sliceCount)),
        }
      }),
    [trends, activeFilter]
  )

  return (
    <div>
      <PageHeader
        crumbs={['MediAssist AI', 'Health Trends']}
        title="Health Trends"
        description="Track how your key health markers (Blood Sugar, Cholesterol, BMI, Hemoglobin, Vitamin D, Blood Pressure) change over time."
      />

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-xl bg-mist-100 p-1 animate-rise">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(f)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activeFilter.label === f.label ? 'bg-white text-teal-700 shadow-sm' : 'text-ink-soft hover:text-ink'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredMetrics.map((metric) => {
            const latest = metric.data[metric.data.length - 1]
            const first = metric.data[0]
            const delta = latest && first ? Math.round((latest.value - first.value) * 10) / 10 : 0
            const normMin = Array.isArray(metric.normalRange) ? metric.normalRange[0] : 0
            const normMax = Array.isArray(metric.normalRange) ? metric.normalRange[1] : 100

            return (
              <Card key={metric.id} className="animate-rise">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{metric.name}</CardTitle>
                    <CardDescription>
                      Normal range: {normMin}–{normMax} {metric.unit}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-semibold text-ink">
                      {latest?.value ?? 'N/A'} <span className="text-xs font-normal text-ink-soft">{metric.unit}</span>
                    </p>
                    <p className={cn('text-xs', delta > 0 ? 'text-coral-600' : delta < 0 ? 'text-teal-600' : 'text-ink-soft')}>
                      {delta > 0 ? '+' : ''}
                      {delta} over period
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {metric.data && metric.data.length > 0 ? (
                    <TrendChart metric={metric} height={220} />
                  ) : (
                    <div className="flex h-52 items-center justify-center rounded-lg bg-mist-50 text-xs text-ink-soft">
                      No measurements recorded for {metric.name} yet. Upload a report to track trends.
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
