import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RiskGauge } from '@/components/risk/RiskGauge'
import { OrganRiskDetailModal } from '@/components/risk/OrganRiskDetailModal'
import { api } from '@/services/api'
import { cn } from '@/utils/cn'
import {
  RotateCw,
  Cpu,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Upload,
  Edit3,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
  FileHeart,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { DiseaseRisk } from '@/types'

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  Low: 'success',
  Moderate: 'warning',
  High: 'danger',
}

export default function DiseaseRiskPage() {
  const navigate = useNavigate()
  const [risks, setRisks] = useState<DiseaseRisk[]>([])
  const [hasData, setHasData] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Organ Detail Modal State
  const [selectedOrgan, setSelectedOrgan] = useState<{ key: string; name: string } | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const fetchRisks = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const data = isManualRefresh ? await api.analyzeDiseaseRisks() : await api.getDiseaseRisks()
      
      if (data && data.hasData !== false && Array.isArray(data.diseaseRisks) && data.diseaseRisks.length > 0) {
        setHasData(true)
        setRisks(data.diseaseRisks)
        if (data.lastAnalyzedAt) {
          setLastAnalyzedAt(
            new Date(data.lastAnalyzedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          )
        }
        if (isManualRefresh) {
          setShowToast(true)
          setTimeout(() => setShowToast(false), 4000)
        }
      } else {
        setHasData(false)
        setRisks([])
      }
    } catch (err: any) {
      setError(err?.message || 'Could not load disease risk predictions.')
      setHasData(false)
      setRisks([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRisks()

    const handleReportsUpdate = () => fetchRisks()
    window.addEventListener('medassist_reports_updated', handleReportsUpdate)
    return () => window.removeEventListener('medassist_reports_updated', handleReportsUpdate)
  }, [])

  const handleOpenDetails = (organKey: string, organName: string) => {
    setSelectedOrgan({ key: organKey, name: organName })
    setIsDetailModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header section with Action Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          crumbs={['MediAssist AI', 'Disease Risk']}
          title="Disease Risk Assessment"
          description="Estimated disease risk probabilities computed via Machine Learning Risk Analysis & Clinical Vitals."
        />

        {hasData && risks.length > 0 && (
          <div className="flex shrink-0 items-center gap-3">
            <Button
              onClick={() => fetchRisks(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 border-transparent bg-[#0F766E] text-white hover:bg-[#0F766E]/90 dark:bg-[#0F766E] dark:text-white dark:hover:bg-[#0F766E]/90 font-semibold shadow-sm"
            >
              <RotateCw className={cn('h-4 w-4 transition-transform', isRefreshing && 'animate-spin')} />
              <span>{isRefreshing ? 'Analyzing ML Risk...' : 'Refresh Risk Analysis'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <Card className="border-amber-200 bg-amber-50/50 p-8 text-center animate-rise">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-600" />
          <h3 className="mt-3 font-display text-lg font-bold text-ink">Unable to Load Risk Assessment</h3>
          <p className="mt-1 text-sm text-ink-soft max-w-md mx-auto">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={() => fetchRisks()} className="bg-[#0F766E] text-white hover:bg-[#0F766E]/90">
              <RotateCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        </Card>
      ) : !hasData || risks.length === 0 ? (
        /* Professional MedAssist Empty State for New Patients */
        <Card className="border-mist-200 bg-white shadow-sm overflow-hidden animate-rise">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-700 shadow-xs">
              <FileHeart className="h-10 w-10 text-[#0F766E]" />
            </div>

            <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-ink">
              Your Health Analysis Starts Here
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft max-w-lg mx-auto">
              No medical reports or health measurements are available yet. Upload your first medical report or enter your
              health measurements to generate personalized disease-risk analysis.
            </p>

            {/* Feature Highlights Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              <div className="flex items-start gap-3 rounded-xl border border-mist-100 bg-mist-50/60 p-3.5">
                <Cpu className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-ink">5 Multi-Organ Models</h4>
                  <p className="text-[11px] text-ink-soft mt-0.5">Diabetes, Heart, Kidney, Liver & CBC blood risk classifiers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-mist-100 bg-mist-50/60 p-3.5">
                <ShieldCheck className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-ink">Evidence-Based ML</h4>
                  <p className="text-[11px] text-ink-soft mt-0.5">Evaluated strictly using your extracted clinical vitals.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-mist-100 bg-mist-50/60 p-3.5">
                <Activity className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-ink">Longitudinal Trends</h4>
                  <p className="text-[11px] text-ink-soft mt-0.5">Tracks your biomarker trajectories over time.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Button
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 bg-[#0F766E] text-white hover:bg-[#0F766E]/90 font-semibold px-6 shadow-sm h-11"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Medical Report</span>
              </Button>

              <Button
                onClick={() => navigate('/manual')}
                variant="outline"
                className="flex items-center gap-2 border-mist-300 text-ink hover:bg-mist-50 font-semibold px-6 shadow-xs h-11"
              >
                <Edit3 className="h-4 w-4 text-[#0F766E]" />
                <span>Enter Health Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Valid Clinical Data State */
        <>
          {/* Model Engine Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-700 bg-[#0F766E] p-5 text-white shadow-md animate-rise">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm shadow-xs">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-bold tracking-tight text-white">Machine Learning Risk Engine</span>
                  <Badge className="border-teal-300/40 bg-teal-500/30 text-xs font-semibold text-teal-100 backdrop-blur-xs">
                    SMOTE Balanced (5 Organ Models)
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-teal-100/90 font-medium">
                  Multi-organ Machine Learning predictions for Diabetes, CBC Anemia, Heart Disease, Kidney Disease, and Liver Disease.
                </p>
              </div>
            </div>

            {lastAnalyzedAt && (
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-teal-50 backdrop-blur-xs">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>
                  Last Analyzed: <strong className="text-white">{lastAnalyzedAt}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Re-analysis Toast Alert */}
          {showToast && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-800 dark:text-emerald-200 animate-rise">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Risk Analysis Re-Evaluated!</strong> Updated disease probability models using latest lab results and machine learning analysis.
              </span>
            </div>
          )}

          {/* Risk Cards Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {risks.map((risk) => {
              const isInsufficient = risk.status === 'Insufficient Data' || risk.percentage === null

              return (
                <Card key={risk.id} className="animate-rise relative overflow-hidden flex flex-col justify-between">
                  <CardContent className="p-5 flex-1">
                    <div className="flex items-center gap-4">
                      <RiskGauge percentage={risk.percentage} status={risk.status} />
                      <div>
                        <p className="font-display text-base font-semibold text-ink">{risk.name}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {isInsufficient ? (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold">
                              Insufficient Data
                            </Badge>
                          ) : (
                            <>
                              <Badge variant={statusVariant[risk.status] || 'success'}>
                                {risk.status} Risk
                              </Badge>
                              <span className="text-xs font-medium text-ink-soft">({risk.percentage}%)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-ink-soft">{risk.explanation}</p>

                    {risk.suggestions && risk.suggestions.length > 0 && (
                      <div className="mt-4 border-t border-mist-100 pt-3 dark:border-mist-800">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          {isInsufficient ? 'Recommended Next Steps' : 'Actionable Suggestions'}
                        </p>
                        <ul className="space-y-1.5">
                          {risk.suggestions.slice(0, 2).map((s) => (
                            <li key={s} className="flex items-start gap-2 text-xs text-ink-soft">
                              <span
                                className={cn(
                                  'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                                  isInsufficient ? 'bg-amber-400' : 'bg-teal-500'
                                )}
                              />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>

                  {/* "View More" Button per Organ */}
                  <div className="p-4 pt-0">
                    <Button
                      size="sm"
                      onClick={() => handleOpenDetails(risk.id, risk.name)}
                      className="w-full justify-center gap-1.5 bg-[#0F766E] text-white hover:bg-[#0F766E]/90 font-bold border-transparent shadow-xs"
                    >
                      View More
                      <ChevronRight className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Organ Detail Modal */}
      <OrganRiskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        organKey={selectedOrgan?.key || null}
        organName={selectedOrgan?.name}
      />
    </div>
  )
}

