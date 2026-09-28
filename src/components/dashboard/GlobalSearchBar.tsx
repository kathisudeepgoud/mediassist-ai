import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  FileText,
  ShieldAlert,
  Salad,
  TrendingUp,
  X,
  Loader2,
  ChevronRight,
  CornerDownLeft
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

interface SearchResultItem {
  id: string
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'default' | 'outline' | 'secondary' | 'rose' | 'amber' | 'teal'
  route: string
}

interface SearchCategory {
  category: string
  icon: React.ReactNode
  accentColor: string
  items: SearchResultItem[]
}

export function GlobalSearchBar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [cachedData, setCachedData] = useState<{
    reports: any[]
    trends: any[]
    diseaseRisks: any[]
    dietPlan: any
  }>({
    reports: [],
    trends: [],
    diseaseRisks: [],
    dietPlan: null
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch patient data when focused
  const fetchData = async () => {
    if (user?.role === 'doctor') return
    try {
      setIsLoading(true)
      const [reportsRes, trendsRes, risksRes, dietRes] = await Promise.all([
        api.getReports().catch(() => ({ reports: [] })),
        api.getTrends().catch(() => ({ trends: [] })),
        api.getDiseaseRisks().catch(() => ({ diseaseRisks: [] })),
        api.getCurrentDietPlan().catch(() => null)
      ])

      setCachedData({
        reports: reportsRes.reports || [],
        trends: trendsRes.trends || [],
        diseaseRisks: risksRes.diseaseRisks || [],
        dietPlan: dietRes
      })
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFocus = () => {
    if (cachedData.reports.length === 0 && cachedData.trends.length === 0) {
      fetchData()
    }
    setIsOpen(true)
  }

  const cleanQuery = query.trim().toLowerCase()

  // Compute filtered categories
  const categories: SearchCategory[] = []

  if (cleanQuery) {
    // 1. Reports
    const matchingReports: SearchResultItem[] = cachedData.reports
      .filter((r) => {
        const title = (r.file_name || r.name || r.title || 'Medical Report').toLowerCase()
        const dateStr = (r.report_date || r.reportDate || '').toLowerCase()
        const summary = (r.summary || '').toLowerCase()
        return title.includes(cleanQuery) || dateStr.includes(cleanQuery) || summary.includes(cleanQuery)
      })
      .slice(0, 4)
      .map((r) => ({
        id: `report-${r.id || r.report_id}`,
        title: r.file_name || r.name || 'Medical Report',
        subtitle: r.report_date ? `Date: ${new Date(r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Uploaded Lab Report',
        badge: r.status || 'Processed',
        badgeVariant: 'teal' as const,
        route: '/reports'
      }))

    if (matchingReports.length > 0) {
      categories.push({
        category: 'Medical Reports',
        icon: <FileText className="h-4 w-4 text-teal-700" />,
        accentColor: 'bg-teal-50 border-teal-200 text-teal-900',
        items: matchingReports
      })
    }

    // 2. Health Trends & Vitals
    const matchingTrends: SearchResultItem[] = cachedData.trends
      .filter((t) => {
        const name = (t.name || t.id || '').toLowerCase()
        const unit = (t.unit || '').toLowerCase()
        return name.includes(cleanQuery) || unit.includes(cleanQuery)
      })
      .slice(0, 4)
      .map((t) => {
        const latestVal = t.data && t.data.length > 0 ? (t.data[t.data.length - 1]?.value ?? t.data[t.data.length - 1]) : null
        return {
          id: `trend-${t.id}`,
          title: t.name,
          subtitle: latestVal !== null ? `Latest: ${latestVal} ${t.unit || ''}` : `Reference: ${t.normalRange ? t.normalRange.join(' - ') : 'Normal'} ${t.unit || ''}`,
          badge: `${t.data?.length || 0} records`,
          badgeVariant: 'secondary' as const,
          route: '/trends'
        }
      })

    if (matchingTrends.length > 0) {
      categories.push({
        category: 'Health Trends & Vitals',
        icon: <TrendingUp className="h-4 w-4 text-blue-700" />,
        accentColor: 'bg-blue-50 border-blue-200 text-blue-900',
        items: matchingTrends
      })
    }

    // 3. Disease Risks
    const matchingRisks: SearchResultItem[] = cachedData.diseaseRisks
      .filter((r) => {
        const name = (r.name || r.organ || '').toLowerCase()
        const status = (r.status || '').toLowerCase()
        return name.includes(cleanQuery) || status.includes(cleanQuery)
      })
      .slice(0, 4)
      .map((r) => ({
        id: `risk-${r.id || r.name}`,
        title: r.name || 'Disease Risk',
        subtitle: r.percentage !== null && r.percentage !== undefined ? `Risk Probability: ${r.percentage}%` : 'Analysis based on clinical vitals',
        badge: r.status || (r.percentage > 50 ? 'High' : 'Normal'),
        badgeVariant: (r.status === 'High Risk' ? 'rose' : r.status === 'Moderate Risk' ? 'amber' : 'teal') as any,
        route: '/disease-risk'
      }))

    if (matchingRisks.length > 0) {
      categories.push({
        category: 'Disease Risk Assessments',
        icon: <ShieldAlert className="h-4 w-4 text-rose-600" />,
        accentColor: 'bg-rose-50 border-rose-200 text-rose-900',
        items: matchingRisks
      })
    }

    // 4. Diet Plan Foods
    if (cachedData.dietPlan) {
      const dietItems: SearchResultItem[] = []
      const dp = cachedData.dietPlan

      if (Array.isArray(dp.weeklyPlan)) {
        dp.weeklyPlan.forEach((dayObj: any) => {
          if (dayObj.meals) {
            Object.entries(dayObj.meals).forEach(([mealKey, meal]: [string, any]) => {
              if (Array.isArray(meal.items)) {
                meal.items.forEach((item: any) => {
                  const foodName = typeof item === 'string' ? item : item.name || item.foodName || ''
                  if (foodName && foodName.toLowerCase().includes(cleanQuery) && !dietItems.some((d) => d.title.toLowerCase() === foodName.toLowerCase())) {
                    dietItems.push({
                      id: `diet-${dayObj.day}-${mealKey}-${foodName}`,
                      title: foodName,
                      subtitle: `${dayObj.dayName || dayObj.day} • ${meal.title || mealKey}`,
                      badge: 'Diet Item',
                      badgeVariant: 'teal' as const,
                      route: '/diet-planner'
                    })
                  }
                })
              }
            })
          }
        })
      } else if (dp.meals) {
        Object.entries(dp.meals).forEach(([mealKey, meal]: [string, any]) => {
          if (Array.isArray(meal.items)) {
            meal.items.forEach((item: any) => {
              const foodName = typeof item === 'string' ? item : item.name || item.foodName || ''
              if (foodName && foodName.toLowerCase().includes(cleanQuery) && !dietItems.some((d) => d.title.toLowerCase() === foodName.toLowerCase())) {
                dietItems.push({
                  id: `diet-${mealKey}-${foodName}`,
                  title: foodName,
                  subtitle: `Meal: ${meal.title || mealKey}`,
                  badge: 'Diet Item',
                  badgeVariant: 'teal' as const,
                  route: '/diet-planner'
                })
              }
            })
          }
        })
      }

      if (dietItems.length > 0) {
        categories.push({
          category: 'Diet Recommendations',
          icon: <Salad className="h-4 w-4 text-emerald-700" />,
          accentColor: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          items: dietItems.slice(0, 4)
        })
      }
    }
  }

  const allFlatItems = categories.flatMap((c) => c.items)

  const handleSelectResult = (route: string) => {
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(-1)
    navigate(route)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || allFlatItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < allFlatItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allFlatItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < allFlatItems.length) {
        handleSelectResult(allFlatItems[selectedIndex].route)
      } else if (allFlatItems.length > 0) {
        handleSelectResult(allFlatItems[0].route)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSelectedIndex(-1)
    }
  }

  const totalResults = allFlatItems.length

  return (
    <div ref={containerRef} className="relative hidden max-w-md lg:max-w-lg flex-1 sm:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <Input
          placeholder="Search reports, vitals, risks, foods…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setSelectedIndex(-1)
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="h-10 pl-9 pr-9 bg-mist-50/60 hover:bg-white focus:bg-white border-mist-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 rounded-xl text-xs text-ink transition-all shadow-2xs"
          aria-label="Search"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSelectedIndex(-1)
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-soft hover:bg-mist-100 hover:text-ink transition-colors"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-[100] mt-2 w-full min-w-[380px] sm:min-w-[500px] max-h-[32rem] overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-2xl ring-1 ring-black/5"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-xs text-ink-soft bg-white">
              <Loader2 className="mb-2 h-5 w-5 animate-spin text-teal-600" />
              <p className="font-medium text-ink">Searching patient records...</p>
            </div>
          ) : totalResults > 0 ? (
            <div className="flex flex-col max-h-[32rem]">
              <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white divide-y divide-mist-100">
                {categories.map((cat, idx) => (
                  <div key={cat.category} className={idx > 0 ? 'pt-3' : ''}>
                    {/* Category Header */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 mb-1.5 rounded-lg bg-mist-50 border border-mist-200/60">
                      <div className="flex items-center gap-2">
                        {cat.icon}
                        <span className="font-display text-xs font-bold text-ink">
                          {cat.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-ink-soft">
                        {cat.items.length} item{cat.items.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Result Items */}
                    <div className="space-y-1">
                      {cat.items.map((item) => {
                        const itemIndex = allFlatItems.findIndex((x) => x.id === item.id)
                        const isHighlighted = itemIndex === selectedIndex

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectResult(item.route)}
                            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all border ${
                              isHighlighted
                                ? 'border-teal-500 bg-teal-50/90 text-teal-950 shadow-xs'
                                : 'border-mist-100 bg-mist-50/40 hover:bg-teal-50/50 hover:border-teal-200 text-ink'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="truncate font-display text-xs font-semibold text-ink group-hover:text-teal-800">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="truncate text-[11px] text-ink-soft group-hover:text-ink/80 mt-0.5">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.badge && (
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    item.badgeVariant === 'rose'
                                      ? 'bg-rose-100 text-rose-800'
                                      : item.badgeVariant === 'amber'
                                      ? 'bg-amber-100 text-amber-800'
                                      : item.badgeVariant === 'secondary'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-teal-100 text-teal-800'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="h-3.5 w-3.5 text-mist-400 group-hover:text-teal-600 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Quick Action Footer */}
              <div className="border-t border-mist-100 bg-mist-50/80 px-4 py-2 flex items-center justify-between text-[11px] text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{totalResults}</span> matching record{totalResults > 1 ? 's' : ''} found
                </span>
                <span className="flex items-center gap-1 text-[10px] text-ink-soft/80">
                  <span>Press</span>
                  <kbd className="rounded border border-mist-300 bg-white px-1 py-0.5 text-[9px] font-mono text-ink shadow-2xs">Enter <CornerDownLeft className="inline h-2.5 w-2.5 -mt-0.5" /></kbd>
                  <span>to navigate</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="py-10 px-6 text-center text-xs text-ink-soft bg-white">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mist-100 text-mist-400 mb-3">
                <Search className="h-6 w-6 text-ink-soft" />
              </div>
              <p className="font-display font-semibold text-ink text-sm">No matching records found</p>
              <p className="text-[11px] text-ink-soft/80 mt-1 max-w-xs mx-auto">
                We couldn&apos;t find any records matching &quot;{query}&quot;. Try searching for report names, vitals (e.g. Glucose), or foods.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
