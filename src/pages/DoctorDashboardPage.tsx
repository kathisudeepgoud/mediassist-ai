import { useState, useEffect, useRef } from 'react'
import {
  Users,
  ShieldAlert,
  Bell,
  Search,
  AlertCircle,
  Activity,
  Salad,
  Calendar,
  Hospital,
  User as UserIcon,
  RotateCw,
  CheckCircle2,
  ExternalLink,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TrendChart } from '@/components/trends/TrendChart'
import { RiskGauge } from '@/components/risk/RiskGauge'
import { api } from '@/services/api'
import { recommendedFoods, foodsToAvoid, weeklyMealPlan } from '@/data/diet'
import { FoodCard } from '@/components/diet/FoodCard'
import { WeeklyDietTable } from '@/components/diet/WeeklyDietTable'
import { DietDayDetailsModal } from '@/components/diet/DietDayDetailsModal'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

export default function DoctorDashboardPage() {
  // Dashboard Stats State
  const [stats, setStats] = useState<{ doctorId: string; totalPatients: number; highRiskPatients: number; newAlerts: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Patient Search State
  const [searchId, setSearchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [patientData, setPatientData] = useState<any | null>(null)
  const [patientDietPlan, setPatientDietPlan] = useState<any | null>(null)
  const [selectedDayModal, setSelectedDayModal] = useState<any | null>(null)
  const [notFoundError, setNotFoundError] = useState<string | null>(null)
  const [isRefreshingRisk, setIsRefreshingRisk] = useState(false)

  // Patient Alerts State
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'NEW' | 'REVIEWED'>('ALL')

  const patientSectionRef = useRef<HTMLDivElement | null>(null)

  // Fetch Dashboard Stats & Alerts on load
  const loadDashboardStats = async () => {
    setStatsLoading(true)
    try {
      const res = await api.getDoctorStats()
      setStats(res)
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false)
    }
  }

  const loadAlerts = async (statusFilter = alertFilter) => {
    setAlertsLoading(true)
    try {
      const res = await api.getDoctorAlerts(statusFilter === 'ALL' ? undefined : statusFilter)
      setAlerts(res.alerts || [])
    } catch {
      /* ignore */
    } finally {
      setAlertsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardStats()
    loadAlerts(alertFilter)
  }, [alertFilter])

  // Handle Search submit
  const handleSearch = async (e?: React.FormEvent, targetId?: string) => {
    if (e) e.preventDefault()
    const queryId = (targetId || searchId).trim()
    if (!queryId) return

    setLoading(true)
    setNotFoundError(null)
    setPatientData(null)

    try {
      const res = await api.searchPatient(queryId)
      setPatientData(res)
      setSearchId(queryId)
      // Load patient's live IFCT diet plan
      try {
        const dietRes = await api.getCurrentDietPlan(queryId)
        setPatientDietPlan(dietRes)
      } catch {
        setPatientDietPlan(null)
      }

      // Smooth scroll to patient details
      setTimeout(() => {
        patientSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err: any) {
      setNotFoundError(err.message || 'Patient not found under your registered patients.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Clear Searched Patient
  const handleClearPatient = () => {
    setPatientData(null)
    setPatientDietPlan(null)
    setSearchId('')
    setNotFoundError(null)
  }

  // Handle Refresh Disease Risk
  const handleRefreshRisk = async () => {
    if (!patientData?.patient?.patientId) return
    setIsRefreshingRisk(true)
    try {
      const data = await api.searchPatient(patientData.patient.patientId)
      setPatientData(data)
    } catch {
      /* ignore */
    } finally {
      setIsRefreshingRisk(false)
    }
  }

  // Handle Alert Review & View Patient
  const handleViewPatientFromAlert = async (alert: any) => {
    try {
      if (alert.status === 'NEW') {
        await api.reviewPatientAlert(alert.id || alert.alertId)
        // Refresh alerts and stats in background
        loadAlerts(alertFilter)
        loadDashboardStats()
      }
    } catch {
      /* ignore */
    }

    // Search and load patient profile
    handleSearch(undefined, alert.patientId)
  }

  const patient = patientData?.patient
  const reports = patientData?.reports || []
  const trends = patientData?.trends || []
  const diseaseRisks = patientData?.diseaseRisks || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          crumbs={['MediAssist AI', 'Doctor Portal']}
          title="Doctor Portal & Clinical Management"
          description="Comprehensive dashboard for assigned patient statistics, security-enforced patient records search, and automated high-risk ML clinical alerts."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadDashboardStats()
            loadAlerts()
          }}
          className="self-start sm:self-auto text-ink-soft hover:text-ink shrink-0"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh Portal
        </Button>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Patients Card */}
        <Card className="border-teal-100 bg-white shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Total Patients</p>
                <h3 className="mt-1 font-display text-3xl font-bold text-teal-800">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalPatients ?? 0}
                </h3>
                <p className="mt-1 text-[11px] text-teal-600 font-medium">Registered under Dr. {stats?.doctorId || 'D000001'}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* High-Risk Patients Card */}
        <Card className="border-amber-100 bg-white shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">High-Risk Patients</p>
                <h3 className="mt-1 font-display text-3xl font-bold text-amber-600">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.highRiskPatients ?? 0}
                </h3>
                <p className="mt-1 text-[11px] text-amber-700 font-medium">Unique high-risk patient patterns</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Patient Alerts Card */}
        <Card className="border-rose-100 bg-white shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">New Patient Alerts</p>
                <h3 className="mt-1 font-display text-3xl font-bold text-rose-600">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.newAlerts ?? 0}
                </h3>
                <p className="mt-1 text-[11px] text-rose-600 font-medium">Unreviewed clinical predictions</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Bell className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* 1. FULL WIDTH PATIENT SEARCH BAR (TOP) */}
      {/* ========================================================= */}
      <Card className="w-full border-[#0F766E]/40 bg-gradient-to-r from-[#073632] via-[#0F766E] to-[#0B5A54] text-white shadow-md rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-teal-200" />
                Patient Record Lookup & Clinical History
              </CardTitle>
              <CardDescription className="text-teal-100 text-xs mt-0.5">
                Search patient records by unique Patient ID assigned to your medical practice.
              </CardDescription>
            </div>
            {patientData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPatient}
                className="h-8 text-xs text-teal-100 hover:text-white hover:bg-white/10 self-start sm:self-auto"
              >
                <X className="mr-1 h-3.5 w-3.5" /> Clear Selected Patient
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-200" />
              <Input
                type="text"
                placeholder="Enter Patient ID (e.g., P000001)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="border-[#0F766E] bg-[#073632]/80 pl-10 text-white placeholder:text-teal-200/70 focus:border-teal-300 focus:ring-teal-300 font-mono text-sm h-10 w-full"
              />
            </div>
            <Button
              type="submit"
              className="bg-teal-600 font-medium text-white hover:bg-teal-500 shadow-sm transition-colors border-none h-10 px-6 shrink-0"
              disabled={loading}
            >
              {loading ? (
                'Searching...'
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Search Patient Records
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error State: Unauthorized / Patient Not Found */}
      {notFoundError && (
        <Card className="border-rose-200 bg-rose-50/80 shadow-sm animate-rise">
          <CardContent className="flex items-center gap-3 p-5 text-rose-700">
            <AlertCircle className="h-6 w-6 shrink-0 text-rose-500" />
            <div>
              <p className="font-display font-semibold text-rose-900">Access Denied / Patient Not Found</p>
              <p className="mt-0.5 text-sm text-rose-700">{notFoundError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {/* Selected Patient Medical Profile View (When active) */}
      {!loading && patientData && (
        <div ref={patientSectionRef} className="space-y-6 animate-rise border-t border-mist-200 pt-2">
          {/* Patient Banner */}
          <Card className="border-teal-100 bg-white shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-mist-100">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-700 text-white font-display text-lg font-bold">
                  {patient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{patient.name}</CardTitle>
                    <Badge variant="success" className="font-mono text-xs px-2 py-0.5">
                      {patient.patientId}
                    </Badge>
                  </div>
                  <CardDescription className="mt-0.5">
                    {patient.email} {patient.phone ? `• ${patient.phone}` : ''}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-medium text-ink-soft">
                <div className="rounded-lg bg-mist-100 px-3 py-1.5">
                  Age: <span className="font-semibold text-ink">{patient.age || 'N/A'}</span>
                </div>
                <div className="rounded-lg bg-mist-100 px-3 py-1.5">
                  Gender: <span className="font-semibold text-ink">{patient.gender || 'N/A'}</span>
                </div>
                <div className="rounded-lg bg-mist-100 px-3 py-1.5">
                  Blood Group: <span className="font-semibold text-ink">{patient.bloodGroup || 'N/A'}</span>
                </div>
                <div className="rounded-lg bg-mist-100 px-3 py-1.5">
                  Height: <span className="font-semibold text-ink">{patient.heightCm ? `${patient.heightCm} cm` : 'N/A'}</span>
                </div>
                <div className="rounded-lg bg-mist-100 px-3 py-1.5">
                  Weight: <span className="font-semibold text-ink">{patient.weightKg ? `${patient.weightKg} kg` : 'N/A'}</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 1. Patient Medical Reports (Separated Reports) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-teal-600" />
                Patient Medical Reports ({reports.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Each report record is kept strictly separate with its corresponding vital readings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-mist-200 text-xs uppercase tracking-wide text-ink-soft">
                        <th className="py-2.5 pr-3 font-medium">Report Date</th>
                        <th className="py-2.5 pr-3 font-medium">Type</th>
                        <th className="py-2.5 pr-3 font-medium">Hospital/Lab</th>
                        <th className="py-2.5 pr-3 font-medium">Doctor</th>
                        <th className="py-2.5 font-medium">Associated Vital Readings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r: any) => (
                        <tr key={r.id} className="border-b border-mist-100 last:border-0 align-top">
                          <td className="py-3 pr-3 font-mono text-xs font-semibold text-ink">
                            {new Date(r.reportDate || r.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 pr-3 text-ink-soft font-medium">{r.type}</td>
                          <td className="py-3 pr-3 text-ink-soft">
                            <span className="flex items-center gap-1">
                              <Hospital className="h-3.5 w-3.5 text-teal-600" />
                              {r.hospital}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-ink-soft">
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-3.5 w-3.5 text-ink-soft" />
                              {r.doctor}
                            </span>
                          </td>
                          <td className="py-3 text-ink-soft">
                            <div className="flex flex-wrap gap-1.5">
                              {r.vitals && r.vitals.length > 0 ? (
                                r.vitals.map((v: any, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-block rounded-md bg-mist-100 px-2 py-0.5 text-[11px] font-medium text-ink"
                                  >
                                    {v.label}: <strong className="text-teal-700">{v.value} {v.unit}</strong>
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-ink-soft italic">No vitals extracted</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-ink-soft">No medical reports uploaded by this patient.</p>
              )}
            </CardContent>
          </Card>

          {/* 2. Historical Vital Graphs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-teal-600" />
                Historical Vital Readings & Trends
              </CardTitle>
              <CardDescription className="text-xs">
                Longitudinal measurements recorded across reports for {patient.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trends.some((t: any) => t.data && t.data.length > 0) ? (
                <Tabs defaultValue={trends[0]?.id || 'blood-sugar'}>
                  <TabsList className="mb-4">
                    {trends.map((t: any) => (
                      <TabsTrigger key={t.id} value={t.id}>
                        {t.name} ({t.data.length})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {trends.map((t: any) => (
                    <TabsContent key={t.id} value={t.id}>
                      {t.data && t.data.length > 0 ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs text-ink-soft">
                            <span>
                              Normal Reference Range: {t.normalRange[0]} - {t.normalRange[1]} {t.unit}
                            </span>
                            <span>{t.data.length} historical record(s)</span>
                          </div>
                          <TrendChart metric={t} height={240} />
                        </div>
                      ) : (
                        <div className="py-8 text-center text-sm text-ink-soft">
                          No historical measurements recorded for {t.name} yet.
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <p className="py-6 text-center text-sm text-ink-soft">No vital trend data available for this patient yet.</p>
              )}
            </CardContent>
          </Card>

          {/* 3. ML Disease Risk Analysis */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  Disease Risk Assessment (ML Model Predictions)
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Machine Learning Risk Analysis derived from patient lab parameters
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshRisk}
                disabled={isRefreshingRisk}
                className="flex items-center gap-1.5 border-teal-500/30 text-xs font-medium text-teal-700 hover:bg-teal-50"
              >
                <RotateCw className={cn('h-3.5 w-3.5', isRefreshingRisk && 'animate-spin')} />
                <span>{isRefreshingRisk ? 'Re-analyzing...' : 'Refresh Risk'}</span>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {diseaseRisks.map((risk: any) => (
                  <div key={risk.id} className="rounded-xl border border-mist-200 p-4 bg-white shadow-xs">
                    <div className="flex items-center gap-4">
                      <RiskGauge percentage={risk.percentage} status={risk.status} />
                      <div>
                        <p className="font-display font-semibold text-ink">High {risk.name} Prediction</p>
                        <Badge
                          variant={risk.status === 'High' ? 'danger' : risk.status === 'Moderate' ? 'warning' : 'success'}
                          className="mt-1"
                        >
                          {risk.status} Risk Pattern ({risk.percentage}%)
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-ink-soft">{risk.explanation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Diet & Nutritional Guidance */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-mist-100 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Salad className="h-5 w-5 text-teal-600" />
                  Personalized Diet Plan & Nutritional Guidance (IFCT 2017)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Personalized 7-day Indian meal plan optimized with mathematical MILP constraints for patient risk levels
                </CardDescription>
              </div>
              {patientDietPlan?.dailyNutrition && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <Badge variant="outline" className="text-teal-700 bg-teal-50 border-teal-200">
                    {patientDietPlan.dailyNutrition.calories || 1800} kcal/day
                  </Badge>
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                    {patientDietPlan.dailyNutrition.protein || 50}g protein
                  </Badge>
                  {patientDietPlan.dailyNutrition.fiber && (
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                      {patientDietPlan.dailyNutrition.fiber}g fiber
                    </Badge>
                  )}
                  {patientDietPlan.dailyNutrition.sodium && (
                    <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">
                      {patientDietPlan.dailyNutrition.sodium}mg sodium
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {patientDietPlan?.weeklyPlan && patientDietPlan.weeklyPlan.length > 0 ? (
                <div className="space-y-4">
                  <WeeklyDietTable
                    weeklyPlan={patientDietPlan.weeklyPlan}
                    onSelectDay={(day) => setSelectedDayModal(day)}
                  />

                  {patientDietPlan.safety?.warnings && patientDietPlan.safety.warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Active Clinical Diet Constraints:
                      </p>
                      {patientDietPlan.safety.warnings.map((w: any, idx: number) => (
                        <p key={idx} className="text-[11px] text-amber-800">• {w.message || w}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : patientDietPlan?.meals ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(patientDietPlan.meals).map(([mealKey, mealObj]: [string, any]) => (
                      <div key={mealKey} className="rounded-xl border border-mist-200 p-3 bg-mist-50/40">
                        <div className="flex items-center justify-between border-b border-mist-200 pb-2 mb-2">
                          <h5 className="font-bold text-xs text-ink">{mealObj.title || mealKey}</h5>
                          <span className="font-mono text-[11px] font-semibold text-coral-600">
                            {mealObj.nutrition?.calories || 0} kcal
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {(mealObj.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="text-xs flex items-start justify-between gap-1">
                              <span className="text-ink-soft">• {item.name}</span>
                              <span className="font-mono text-[10px] text-teal-600 shrink-0">{item.portionSize || `${item.quantityGrams || 100}g`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {patientDietPlan.safety?.warnings && patientDietPlan.safety.warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Active Clinical Diet Constraints:
                      </p>
                      {patientDietPlan.safety.warnings.map((w: any, idx: number) => (
                        <p key={idx} className="text-[11px] text-amber-800">• {w.message || w}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Tabs defaultValue="recommend">
                  <TabsList className="mb-4">
                    <TabsTrigger value="recommend">Recommended Foods</TabsTrigger>
                    <TabsTrigger value="avoid">Foods to Avoid</TabsTrigger>
                    <TabsTrigger value="meal-plan">Weekly Meal Plan</TabsTrigger>
                  </TabsList>

                  <TabsContent value="recommend">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {recommendedFoods.map((f) => (
                        <FoodCard key={f.id} food={f} variant="recommend" />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="avoid">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {foodsToAvoid.map((f) => (
                        <FoodCard key={f.id} food={f} variant="avoid" />
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="meal-plan">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-mist-200 text-xs uppercase tracking-wide text-ink-soft">
                            <th className="py-2 pr-3 font-medium">Day</th>
                            <th className="py-2 pr-3 font-medium">Breakfast</th>
                            <th className="py-2 pr-3 font-medium">Lunch</th>
                            <th className="py-2 pr-3 font-medium">Dinner</th>
                            <th className="py-2 font-medium">Snacks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyMealPlan.map((d) => (
                            <tr key={d.day} className="border-b border-mist-100 last:border-0 align-top">
                              <td className="py-2.5 pr-3 font-medium text-ink">
                                <Badge>{d.day.slice(0, 3)}</Badge>
                              </td>
                              <td className="py-2.5 pr-3 text-ink-soft text-xs">{d.breakfast}</td>
                              <td className="py-2.5 pr-3 text-ink-soft text-xs">{d.lunch}</td>
                              <td className="py-2.5 pr-3 text-ink-soft text-xs">{d.dinner}</td>
                              <td className="py-2.5 text-ink-soft text-xs">{d.snacks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selected Day Inspection Modal for Doctor */}
      <DietDayDetailsModal
        isOpen={Boolean(selectedDayModal)}
        onClose={() => setSelectedDayModal(null)}
        dayData={selectedDayModal}
        preferences={patientDietPlan?.preferences || {}}
      />

      {/* ========================================================= */}
      {/* 2. RECENT HIGH-RISK PATIENT ALERTS (BOTTOM - FULL WIDTH) */}
      {/* ========================================================= */}
      <Card className="w-full border-mist-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-mist-100">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-rose-500" />
              Recent High-Risk Patient Alerts
            </CardTitle>
            <CardDescription className="text-xs">
              Automated ML risk patterns requiring clinical physician evaluation
            </CardDescription>
          </div>

          {/* Status Filter Buttons: [All] [New] [Reviewed] */}
          <div className="flex items-center gap-1.5 rounded-lg bg-mist-100 p-1 text-xs self-start sm:self-auto">
            <Button
              size="sm"
              variant={alertFilter === 'ALL' ? 'default' : 'ghost'}
              onClick={() => setAlertFilter('ALL')}
              className={cn('h-7 text-xs font-medium px-2.5', alertFilter === 'ALL' ? 'bg-[#0F766E] text-white' : 'text-ink-soft')}
            >
              <Filter className="mr-1 h-3 w-3" />
              All ({alerts.length})
            </Button>
            <Button
              size="sm"
              variant={alertFilter === 'NEW' ? 'default' : 'ghost'}
              onClick={() => setAlertFilter('NEW')}
              className={cn('h-7 text-xs font-medium px-2.5', alertFilter === 'NEW' ? 'bg-rose-600 text-white' : 'text-ink-soft')}
            >
              New ({alerts.filter((a) => a.status === 'NEW').length})
            </Button>
            <Button
              size="sm"
              variant={alertFilter === 'REVIEWED' ? 'default' : 'ghost'}
              onClick={() => setAlertFilter('REVIEWED')}
              className={cn('h-7 text-xs font-medium px-2.5', alertFilter === 'REVIEWED' ? 'bg-teal-700 text-white' : 'text-ink-soft')}
            >
              Reviewed ({alerts.filter((a) => a.status === 'REVIEWED').length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {alertsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alt) => (
                <div
                  key={alt.id || alt.alertId}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 text-sm transition-all hover:shadow-xs',
                    alt.status === 'NEW' ? 'border-rose-200 bg-rose-50/40' : 'border-mist-200 bg-white'
                  )}
                >
                  {/* Left: Patient ID (Adjusted UI) + Details */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Adjusted Patient ID Badge */}
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border shrink-0 text-center min-w-[84px]',
                        alt.status === 'NEW'
                          ? 'bg-rose-100/90 border-rose-300 text-rose-800'
                          : 'bg-mist-100 border-mist-200 text-teal-800'
                      )}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">ID</span>
                      <span className="font-mono font-bold text-xs leading-none mt-0.5">{alt.patientId}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink text-sm">{alt.patientName}</p>
                        {alt.age && (
                          <span className="text-xs text-ink-soft">
                            ({alt.age} yrs{alt.gender ? `, ${alt.gender}` : ''})
                          </span>
                        )}
                        <Badge
                          variant={alt.status === 'NEW' ? 'danger' : 'outline'}
                          className={cn('text-[10px] px-1.5 py-0', alt.status === 'NEW' ? 'bg-rose-600 text-white' : '')}
                        >
                          {alt.status === 'NEW' ? 'New Alert' : 'Reviewed'}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-soft mt-0.5">
                        High-risk pattern detected by the <strong className="text-ink">{alt.disease}</strong> model (
                        <span className="text-rose-600 font-semibold">{alt.riskProbability ? `${alt.riskProbability}%` : 'HIGH'}</span>
                        )
                        {alt.reportDate && (
                          <span className="text-ink-soft/70 ml-2">
                            • {new Date(alt.reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Action Button */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      size="sm"
                      variant={alt.status === 'NEW' ? 'default' : 'outline'}
                      onClick={() => handleViewPatientFromAlert(alt)}
                      className={cn(
                        'text-xs font-medium h-8 px-3',
                        alt.status === 'NEW' ? 'bg-[#0F766E] text-white hover:bg-[#0B5A54]' : 'text-teal-800 hover:bg-teal-50'
                      )}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View Patient Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-ink-soft">
              <CheckCircle2 className="mx-auto h-8 w-8 text-teal-500 mb-2" />
              <p className="font-semibold text-ink">No high-risk patient alerts matching criteria.</p>
              <p className="text-xs text-ink-soft mt-1">Alerts automatically generate when patient disease risk models return high risk.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
