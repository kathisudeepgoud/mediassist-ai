import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, HeartPulse, ShieldAlert, CalendarClock, Upload, Edit3, TrendingUp, MessageCircleHeart, Salad, History } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/dashboard/StatCard'
import { RecentReportsTable } from '@/components/dashboard/RecentReportsTable'
import { TrendChart } from '@/components/trends/TrendChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { mockTrends } from '@/data/trends'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'

import DoctorDashboardPage from '@/pages/DoctorDashboardPage'

const trendTabs = ['blood-sugar', 'cholesterol', 'bmi', 'hemoglobin'] as const

function computeHealthMetrics(reports: any[], trends: any[], diseaseRisks: any[], hasRiskData: boolean, user: any) {
  const hasReports = reports && reports.length > 0
  const hasTrends = trends && trends.some((t: any) => t.data && t.data.length > 0)
  const hasVitals = hasRiskData || hasReports || hasTrends

  if (!hasVitals) {
    return {
      hasData: false,
      score: undefined,
      scoreDisplay: '--',
      scoreTrend: 'Insufficient data for score',
      scoreAccent: 'blue' as const,
      riskLevel: 'Insufficient Data',
      riskTrend: 'No parsed reports or vitals',
      riskAccent: 'teal' as const,
    }
  }

  let score = 100
  let highRiskCount = 0
  let moderateRiskCount = 0
  let abnormalVitalCount = 0

  if (diseaseRisks && diseaseRisks.length > 0) {
    diseaseRisks.forEach((r: any) => {
      if (r.status === 'High Risk' || (typeof r.percentage === 'number' && r.percentage >= 60)) {
        score -= 12
        highRiskCount++
      } else if (r.status === 'Moderate Risk' || (typeof r.percentage === 'number' && r.percentage >= 35)) {
        score -= 6
        moderateRiskCount++
      }
    })
  }

  if (trends && trends.length > 0) {
    trends.forEach((t: any) => {
      if (t.data && t.data.length > 0) {
        const latest = t.data[t.data.length - 1]
        const val = typeof latest === 'number' ? latest : latest?.value
        if (typeof val === 'number' && Array.isArray(t.normalRange) && t.normalRange.length === 2) {
          const [min, max] = t.normalRange
          if (val < min || val > max) {
            score -= 5
            abnormalVitalCount++
          }
        }
      }
    })
  }

  if (user?.smokingHabit === 'Daily' || user?.smoking_habit === 'Daily') {
    score -= 8
  } else if (user?.smokingHabit === 'Occasional' || user?.smoking_habit === 'Occasional') {
    score -= 4
  }

  if (user?.activityLevel === 'Sedentary' || user?.activity_level === 'Sedentary') {
    score -= 4
  }

  const h = user?.heightCm || user?.height_cm
  const w = user?.weightKg || user?.weight_kg
  if (h && w && h > 0) {
    const bmi = w / Math.pow(h / 100, 2)
    if (bmi < 18.5 || bmi > 30) {
      score -= 5
    }
  }

  const conditions = user?.existingConditions || user?.existing_conditions
  if (Array.isArray(conditions) && conditions.length > 0) {
    score -= Math.min(10, conditions.length * 3)
  }

  score = Math.max(20, Math.min(100, Math.round(score)))

  let riskLevel = 'Normal'
  let riskAccent: 'teal' | 'coral' | 'rose' = 'teal'
  let riskTrend = 'All vitals within normal range'

  if (highRiskCount > 0 || score < 65) {
    riskLevel = 'Needs Attention'
    riskAccent = 'rose'
    riskTrend = `${highRiskCount > 0 ? `${highRiskCount} high risk factor(s)` : 'Clinical attention needed'}`
  } else if (moderateRiskCount > 0 || abnormalVitalCount > 0 || score < 80) {
    riskLevel = 'Moderate Risk'
    riskAccent = 'coral'
    riskTrend = `${moderateRiskCount + abnormalVitalCount} parameter(s) to monitor`
  }

  let scoreTrend = 'Optimal health range'
  if (score < 65) scoreTrend = 'Requires clinical attention'
  else if (score < 80) scoreTrend = 'Moderate health range'

  return {
    hasData: true,
    score,
    scoreDisplay: undefined,
    scoreTrend,
    scoreAccent: (score >= 80 ? 'teal' : score >= 65 ? 'blue' : 'coral') as 'teal' | 'blue' | 'coral',
    riskLevel,
    riskTrend,
    riskAccent,
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuth()

  if (user?.role === 'doctor') {
    return <DoctorDashboardPage />
  }

  const [reports, setReports] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [diseaseRisks, setDiseaseRisks] = useState<any[]>([])
  const [hasRiskData, setHasRiskData] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportsRes, trendsRes, risksRes] = await Promise.all([
        api.getReports().catch(() => ({ reports: [] })),
        api.getTrends().catch(() => ({ trends: [] })),
        api.getDiseaseRisks().catch(() => ({ hasData: false, diseaseRisks: [] }))
      ])
      setReports(reportsRes.reports || [])
      setTrends(trendsRes.trends || [])
      setDiseaseRisks(risksRes.diseaseRisks || [])
      setHasRiskData(Boolean(risksRes.hasData))
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const handleUpdate = () => loadData()
    window.addEventListener('medassist_reports_updated', handleUpdate)
    return () => window.removeEventListener('medassist_reports_updated', handleUpdate)
  }, [])

  const userName = user?.name || 'there'
  const totalReportsCount = reports.length
  const lastReport = reports[0]
  const lastReportDateStr = lastReport
    ? new Date(lastReport.report_date || lastReport.reportDate || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No reports yet'

  const metrics = computeHealthMetrics(reports, trends, diseaseRisks, hasRiskData, user)

  return (
    <div>
      <PageHeader
        crumbs={['MediAssist AI', 'Dashboard']}
        title={`Welcome, ${userName}`}
        description="Here's a snapshot of your health, based on your parsed medical reports."
        actions={
          <button
            onClick={() => {
              loadData()
              showToast('Synced', 'Health data refreshed.')
            }}
            className="hidden text-xs font-medium text-teal-600 hover:underline sm:inline"
          >
            Refresh data
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Reports"
          value={totalReportsCount}
          icon={<FileText className="h-5 w-5" />}
          accent="teal"
          trend={totalReportsCount > 0 ? `${totalReportsCount} report(s) in DB` : 'Upload your first report'}
        />
        <StatCard
          label="Health Score"
          value={metrics.score}
          displayValue={metrics.scoreDisplay}
          suffix={metrics.hasData ? '/100' : ''}
          icon={<HeartPulse className="h-5 w-5" />}
          accent={metrics.scoreAccent}
          trend={metrics.scoreTrend}
        />
        <StatCard
          label="Clinical Vital Level"
          displayValue={metrics.riskLevel}
          icon={<ShieldAlert className="h-5 w-5" />}
          accent={metrics.riskAccent}
          trend={metrics.riskTrend}
        />
        <StatCard
          label="Last Report Date"
          displayValue={lastReportDateStr}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="rose"
        />
      </div>

      <Card className="mt-6 w-full animate-rise">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Health Trend Overview</CardTitle>
            <CardDescription>Longitudinal health measurements recorded across your medical reports</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : trends.length > 0 ? (
            <Tabs defaultValue={trends[0]?.id || 'blood-sugar'}>
              <TabsList className="mb-4 flex flex-wrap gap-1">
                {trends.map((t: any) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.name} ({t.data ? t.data.length : 0})
                  </TabsTrigger>
                ))}
              </TabsList>
              {trends.map((t: any) => (
                <TabsContent key={t.id} value={t.id}>
                  {t.data && t.data.length > 0 ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-ink-soft">
                        <span>
                          Normal Reference Range:{' '}
                          {Array.isArray(t.normalRange) ? `${t.normalRange[0]} - ${t.normalRange[1]}` : 'Standard Range'}{' '}
                          {t.unit}
                        </span>
                        <span>{t.data.length} measurement(s) recorded</span>
                      </div>
                      <TrendChart metric={t} height={280} />
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center rounded-lg bg-mist-50 text-xs text-ink-soft">
                      No measurements recorded for {t.name} yet. Upload a report to track trends.
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg bg-mist-50 text-xs text-ink-soft">
              No trend data recorded yet. Upload a report or add manual vitals to view health graphs.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 animate-rise">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your most recently uploaded medical reports</CardDescription>
          </div>
          <button onClick={() => navigate('/reports')} className="text-xs font-medium text-teal-600 hover:underline">
            View all
          </button>
        </CardHeader>
        <CardContent>
          <RecentReportsTable />
        </CardContent>
      </Card>
    </div>
  )
}
