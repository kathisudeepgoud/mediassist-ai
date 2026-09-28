import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RiskGauge } from '@/components/risk/RiskGauge'
import { TrendChart } from '@/components/trends/TrendChart'
import { api } from '@/services/api'
import { cn } from '@/utils/cn'
import {
  ShieldAlert,
  Calendar,
  Activity,
  FileText,
  TrendingUp,
  Cpu,
  Layers,
  AlertTriangle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface OrganRiskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  organKey: string | null
  organName?: string
}

const ALL_ORGANS = [
  { key: 'diabetes', name: 'Diabetes Risk' },
  { key: 'cbc', name: 'CBC Anemia Risk' },
  { key: 'heart', name: 'Heart Disease Risk' },
  { key: 'kidney', name: 'Kidney Disease Risk' },
  { key: 'liver', name: 'Liver Disease Risk' },
]

const ORGAN_COLOR_MAP: Record<string, string> = {
  diabetes: '#0f766e',
  heart: '#dc2626',
  kidney: '#7c3aed',
  liver: '#ea580c',
  cbc: '#059669',
}

const formatStatusLabel = (status: string) => {
  if (!status) return 'Normal'
  const s = status.toLowerCase().trim()
  if (s.includes('above') || s.includes('high')) return 'High'
  if (s.includes('below') || s.includes('low')) return 'Low'
  return status
}

const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' => {
  const s = (status || '').toLowerCase().trim()
  if (s.includes('above') || s.includes('high') || s.includes('danger')) return 'danger'
  if (s.includes('below') || s.includes('low') || s.includes('warning')) return 'warning'
  return 'success'
}

export const OrganRiskDetailModal: React.FC<OrganRiskDetailModalProps> = ({
  isOpen,
  onClose,
  organKey,
  organName = 'Disease Risk Details',
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(organKey)
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetricIndex, setSelectedMetricIndex] = useState(0)

  useEffect(() => {
    if (organKey) {
      setActiveKey(organKey)
    }
  }, [organKey])

  useEffect(() => {
    if (!isOpen || !activeKey) {
      setDetails(null)
      setError(null)
      return
    }

    async function loadDetails() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.getDiseaseRiskDetails(activeKey!)
        setDetails(res)
      } catch (err: any) {
        setError(err?.message || 'Could not load details for this disease model.')
      } finally {
        setLoading(false)
      }
    }

    loadDetails()
  }, [isOpen, activeKey])

  if (!isOpen) return null

  const currentIndex = ALL_ORGANS.findIndex((o) => o.key === activeKey)
  const currentOrganObj = ALL_ORGANS[currentIndex] || { key: activeKey || 'disease', name: organName }

  const handlePrevOrgan = () => {
    const prevIdx = (currentIndex - 1 + ALL_ORGANS.length) % ALL_ORGANS.length
    setActiveKey(ALL_ORGANS[prevIdx].key)
    setSelectedMetricIndex(0)
  }

  const handleNextOrgan = () => {
    const nextIdx = (currentIndex + 1) % ALL_ORGANS.length
    setActiveKey(ALL_ORGANS[nextIdx].key)
    setSelectedMetricIndex(0)
  }

  const currentRisk = details?.current_risk || {}
  const currentVitals = details?.current_vitals || []
  const historicalReports = details?.historical_reports || []
  const featureImportances = details?.feature_importance || []
  const trendData = details?.trend_data || []

  const organColor = activeKey ? ORGAN_COLOR_MAP[activeKey] || '#0f766e' : '#0f766e'

  // Construct metric datasets for trend visualization
  const trendMetrics = currentVitals
    .map((v: any) => {
      const points = trendData
        .filter((td: any) => td[v.label] !== undefined && td[v.label] !== null)
        .map((td: any) => ({
          date: td.date ? new Date(td.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date',
          value: Number(td[v.label]),
        }))

      return {
        id: v.label,
        name: v.label,
        unit: v.unit || '',
        color: organColor,
        normalRange: [0, 100] as [number, number],
        data: points,
      }
    })
    .filter((m: any) => m.data.length > 0)

  const activeTrendMetric = trendMetrics[selectedMetricIndex] || trendMetrics[0]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-0 shadow-2xl">
        {/* Modal Header with Prev / Next Disease Risk Arrow Navigation */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-mist-200 bg-white px-6 py-4 text-ink shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 shadow-xs">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="font-display text-xl font-bold tracking-tight text-ink">
                  {details?.disease_name || currentOrganObj.name}
                </DialogTitle>
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">
                  {currentIndex >= 0 ? `${currentIndex + 1} of ${ALL_ORGANS.length}` : 'Model Details'}
                </span>
              </div>
              <p className="text-xs text-ink-soft font-medium">
                Model Explanation & Historical Health Trajectory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Prev Disease Risk Arrow */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevOrgan}
              className="h-8 gap-1 rounded-lg border-mist-200 bg-white text-xs font-semibold text-ink-soft hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 transition-all shadow-xs"
              title="Previous Disease Risk Model"
            >
              <ChevronLeft className="h-4 w-4 text-teal-700" /> Prev
            </Button>

            {/* Next Disease Risk Arrow */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextOrgan}
              className="h-8 gap-1 rounded-lg border-mist-200 bg-white text-xs font-semibold text-ink-soft hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 transition-all shadow-xs"
              title="Next Disease Risk Model"
            >
              Next <ChevronRight className="h-4 w-4 text-teal-700" />
            </Button>

            <div className="h-4 w-px bg-mist-200 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-ink-soft hover:bg-mist-100 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-80 w-full items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
            <span className="text-sm font-medium text-ink-soft">Loading organ risk details...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="mt-2 font-semibold text-ink">{error}</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {/* Top Overview & Gauge Banner */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="flex items-center justify-center border-mist-200 bg-white p-5 shadow-xs md:col-span-1">
                <div className="flex flex-col items-center text-center">
                  <RiskGauge percentage={currentRisk.percentage} status={currentRisk.status || 'Insufficient Data'} />
                  <div className="mt-2 flex items-center gap-2">
                    {currentRisk.status === 'Insufficient Data' || currentRisk.percentage === null || currentRisk.percentage === undefined ? (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold">
                        Insufficient Data
                      </Badge>
                    ) : (
                      <>
                        <Badge variant={getStatusVariant(currentRisk.status)}>
                          {formatStatusLabel(currentRisk.status)} Risk
                        </Badge>
                        <span className="text-sm font-bold font-mono text-ink">
                          {currentRisk.percentage}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="flex flex-col justify-between border border-teal-200 bg-teal-50/80 p-5 shadow-xs md:col-span-2">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-800">
                    <Activity className="h-4 w-4 text-teal-700" /> Risk Interpretation & Model Summary
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed font-medium text-slate-800">
                    {currentRisk.interpretation ||
                      'The model identified a risk pattern based on extracted physiological parameters. This prediction provides quantitative decision support.'}
                  </p>
                </div>

                {/* Medical Safety Disclaimer Alert */}
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                  <span>
                    <strong className="font-semibold text-amber-950">Medical Safety Notice:</strong> The features below represent model input factors and ML algorithm influence. This is a model-based risk estimate and not a medical diagnosis.
                  </span>
                </div>
              </Card>
            </div>

            {/* Section 1: Current Report Vitals */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-soft flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-600" /> Current Report Vitals ({currentVitals.length})
                </h3>
              </div>

              {currentVitals.length === 0 ? (
                <Card className="p-4 text-center text-xs text-ink-soft">
                  No current vital readings available for this organ category.
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {currentVitals.map((v: any) => (
                    <div
                      key={v.label}
                      className="rounded-xl border border-mist-200 bg-white p-3.5 shadow-xs hover:border-teal-300 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink-soft truncate" title={v.label}>
                          {v.label}
                        </span>
                        <Badge variant={getStatusVariant(v.status)} className="text-[10px]">
                          {formatStatusLabel(v.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 font-mono text-2xl font-extrabold text-ink">
                        {v.value} <span className="text-xs font-normal text-ink-soft">{v.unit}</span>
                      </p>
                      <div className="mt-2 flex items-center justify-between border-t border-mist-100 pt-2 text-[11px] text-ink-soft">
                        <span>Ref: {v.referenceRange}</span>
                        <span>Date: {v.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Why Model Predicted This Risk */}
            <div>
              <div className="mb-3">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-soft flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-teal-600" /> Factors Contributing to Prediction
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Feature importance ranking computed by the trained risk classifier.
                </p>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-mist-200 bg-white p-4 shadow-xs">
                {featureImportances.map((fi: any, idx: number) => {
                  const pct = Math.round((fi.importance || 0.1) * 100)
                  return (
                    <div key={fi.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-ink flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-50 text-[10px] font-bold text-teal-700">
                            {idx + 1}
                          </span>
                          {fi.feature}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-teal-700">
                            {formatStatusLabel(fi.level)}
                          </span>
                          <span className="font-mono text-xs text-ink-soft">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-mist-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${Math.max(pct * 2, 8)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-ink-soft italic pl-7">{fi.explanation}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Section 3: Historical Health Data */}
            <div>
              <div className="mb-3">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-soft flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-teal-600" /> Historical Reports & Vital Values ({historicalReports.length})
                </h3>
                <p className="text-xs text-ink-soft">
                  Independent date-wise report records stored in database.
                </p>
              </div>

              {historicalReports.length === 0 ? (
                <Card className="p-4 text-center text-xs text-ink-soft">
                  No historical reports recorded for this organ.
                </Card>
              ) : (
                <div className="space-y-3">
                  {historicalReports.map((hr: any) => (
                    <Card key={hr.reportId} className="border-mist-200 bg-white p-4 shadow-xs">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-mist-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                            <Layers className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-display text-sm font-semibold text-ink">{hr.type}</span>
                            <p className="text-[11px] text-ink-soft">{hr.hospital} · {hr.doctor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={hr.source === 'Manual Entry' ? 'success' : 'blue'}>
                            {hr.source}
                          </Badge>
                          <span className="text-xs font-mono text-ink-soft">{hr.date}</span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {hr.vitals.map((v: any) => (
                          <div
                            key={v.id || v.label}
                            className="rounded-xl border border-mist-200 bg-white p-2.5 shadow-xs hover:border-teal-300 transition-all"
                          >
                            <span className="block text-[10px] font-medium text-ink-soft truncate">{v.label}</span>
                            <span className="text-sm font-bold font-mono text-ink">
                              {v.value} {v.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Parameter Trends Chart (LAST SECTION) */}
            {trendMetrics.length > 0 && (
              <div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-soft flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-600" /> Longitudinal Parameter Trend
                  </h3>

                  {/* Clean Tab Buttons matching App UI (No dark black backgrounds) */}
                  <div className="flex flex-wrap gap-1.5">
                    {trendMetrics.map((tm: any, idx: number) => (
                      <button
                        key={tm.name}
                        onClick={() => setSelectedMetricIndex(idx)}
                        className={cn(
                          'rounded-lg px-3 py-1 text-xs font-semibold transition-all border',
                          selectedMetricIndex === idx
                            ? 'bg-[#0F766E] text-white border-transparent shadow-xs'
                            : 'bg-mist-100 text-ink-soft hover:bg-teal-50 hover:text-teal-700 border-mist-200'
                        )}
                      >
                        {tm.name}
                      </button>
                    ))}
                  </div>
                </div>

                <Card className="border-mist-200 bg-white p-4 shadow-xs">
                  {activeTrendMetric ? (
                    <div>
                      {/* Metric Summary Header in Graphs */}
                      <div className="mb-3 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-ink shadow-xs">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Graph Parameter</p>
                          <p className="text-sm font-extrabold text-teal-950">{activeTrendMetric.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Latest Vital Value</p>
                          <p className="font-mono text-2xl font-extrabold text-teal-950">
                            {activeTrendMetric.data[activeTrendMetric.data.length - 1]?.value}{' '}
                            <span className="text-xs font-normal text-teal-700">{activeTrendMetric.unit}</span>
                          </p>
                        </div>
                      </div>
                      <TrendChart metric={activeTrendMetric} height={220} />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-ink-soft">
                      No longitudinal trend data available for this parameter.
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
