import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Edit3, History, Layers } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReportDetailCard } from '@/components/reports/ReportDetailCard'
import { TermExplanationCard } from '@/components/reports/TermExplanationCard'
import { mockTermExplanations } from '@/data/reports'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { api } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'

export default function MedicalReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    try {
      setLoading(true)
      const res = await api.getReports()
      const list = res.reports || []
      setReports(list)
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()

    const handleReportsUpdated = () => {
      fetchReports()
    }

    window.addEventListener('medassist_reports_updated', handleReportsUpdated)
    return () => {
      window.removeEventListener('medassist_reports_updated', handleReportsUpdated)
    }
  }, [])

  const handleDeleteComplete = async (deletedId: string) => {
    const updated = reports.filter((r) => r.id !== deletedId)
    setReports(updated)
    if (updated.length > 0) {
      setSelectedId(updated[0].id)
    } else {
      setSelectedId(null)
    }
    window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
  }

  const selected = reports.find((r) => r.id === selectedId) || (reports.length > 0 ? reports[0] : null)

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={['MediAssist AI', 'Report History']}
        title="Report History"
        description="View details, vital values, and AI explanations for every PDF report and manual entry."
        actions={
          <Button
            onClick={() => navigate('/upload')}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add / Upload Report
          </Button>
        }
      />

      {reports.length === 0 && !loading ? (
        <Card className="p-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <History className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-ink">No Report History Found</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-soft mx-auto">
            You haven't uploaded any PDF reports or added manual health entries yet.
          </p>
          <Button
            onClick={() => navigate('/upload')}
            className="mt-5 bg-teal-600 hover:bg-teal-700 text-white gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" /> Upload or Add First Report
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Selected Report Details */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : selected ? (
              <ReportDetailCard report={selected} onDelete={handleDeleteComplete} />
            ) : null}

            {/* AI Medical Term Explanation */}
            <Card className="animate-rise">
              <CardHeader>
                <CardTitle>AI Report Explanation</CardTitle>
                <CardDescription>Medical terms from your reports explained in plain language</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {mockTermExplanations.map((t) => (
                  <TermExplanationCard key={t.term} {...t} />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: All Reports History List (PDF + Manual) */}
          <Card className="animate-rise h-fit">
            <CardHeader className="border-b border-mist-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-teal-600" /> Every Report ({reports.length})
              </CardTitle>
              <CardDescription>Select any report (PDF or Manual) to view complete vitals & details</CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                reports.map((r) => {
                  const isSelected = r.id === selectedId
                  const isManual =
                    r.source === 'Manual Entry' ||
                    r.file_type === 'MANUAL' ||
                    r.fileType === 'MANUAL' ||
                    (r.type && r.type.toLowerCase().includes('manual'))

                  const sourceTag = isManual ? 'Manual Entry' : r.source || 'Uploaded PDF'
                  const rDate = new Date(
                    r.report_date || r.reportDate || r.created_at || Date.now()
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left transition-all',
                        isSelected
                          ? 'border-teal-500 bg-teal-50/80 shadow-xs'
                          : 'border-mist-200 bg-white hover:bg-mist-50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          {isManual ? (
                            <Edit3 className="h-4 w-4 shrink-0 text-teal-600" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                          )}
                          <span className="font-bold text-xs text-ink truncate">
                            {r.type || (isManual ? 'Manual Health Entry' : 'Medical Report')}
                          </span>
                        </div>
                        <Badge
                          variant={isManual ? 'success' : 'blue'}
                          className="shrink-0 text-[10px]"
                        >
                          {sourceTag}
                        </Badge>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-soft">
                        <span className="truncate">{r.hospital || 'Self / Lab'}</span>
                        <span className="font-mono text-[10px] shrink-0">{rDate}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
