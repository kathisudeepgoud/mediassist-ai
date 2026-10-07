import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Edit3, History, Upload, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReportDetailCard } from '@/components/reports/ReportDetailCard'
import { TermExplanationCard } from '@/components/reports/TermExplanationCard'
import { UploadZone } from '@/components/reports/UploadZone'
import { ManualEntryModal } from '@/components/manual/ManualEntryModal'
import type { ManualParameter, ManualParameterFormData } from '@/types/manualEntry'
import { mockTermExplanations } from '@/data/reports'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { api, getToken } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/context/ToastContext'

const LOCAL_STORAGE_KEY = 'medassist_manual_parameters'

const DEFAULT_INITIAL_PARAMETERS: ManualParameter[] = [
  {
    id: 'param-1',
    parameter: 'Blood Sugar (Fasting)',
    value: '105',
    unit: 'mg/dL',
    reference: '70–99',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'param-2',
    parameter: 'HbA1c Level',
    value: '5.8',
    unit: '%',
    reference: '4.0–5.6',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'param-3',
    parameter: 'Body Mass Index (BMI)',
    value: '24.5',
    unit: 'kg/m²',
    reference: '18.5–24.9',
    createdAt: new Date().toISOString(),
  },
]

export default function MedicalReportsPage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'manual' ? 'manual' : 'pdf'
  const [uploadMode, setUploadMode] = useState<'pdf' | 'manual'>(initialTab)

  const [reports, setReports] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Manual Entry State
  const [parameters, setParameters] = useState<ManualParameter[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return DEFAULT_INITIAL_PARAMETERS
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParameter, setEditingParameter] = useState<ManualParameter | null>(null)

  const { showToast } = useToast()

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

  const fetchManualParameters = async () => {
    if (!getToken()) return
    try {
      const res = await api.getReports()
      const allReports = res.reports || []
      const manualReports = allReports.filter(
        (r) =>
          r.source === 'Manual Entry' ||
          r.file_type === 'MANUAL' ||
          r.fileType === 'MANUAL' ||
          (r.type && r.type.toLowerCase().includes('manual'))
      )

      const extractedItems: ManualParameter[] = []
      for (const r of manualReports) {
        const vitals = Array.isArray(r.vitals) ? r.vitals : []
        for (const v of vitals) {
          extractedItems.push({
            id: v.id || `manual-${r.id}-${Math.random()}`,
            reportId: r.id,
            parameter: v.label || v.name || 'Parameter',
            value: String(v.value !== undefined ? v.value : ''),
            unit: v.unit || '',
            reference: v.referenceRange || v.reference_range || '',
            createdAt: r.created_at || r.createdAt || r.report_date || new Date().toISOString(),
          })
        }
      }

      if (extractedItems.length > 0) {
        setParameters(extractedItems)
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    fetchReports()
    fetchManualParameters()

    const handleReportsUpdated = () => {
      fetchReports()
      fetchManualParameters()
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

  // Handlers for Manual Entry Mode
  const handleOpenAddModal = () => {
    setEditingParameter(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (item: ManualParameter) => {
    setEditingParameter(item)
    setIsModalOpen(true)
  }

  const syncBatchParametersToBackend = async (dataList: ManualParameterFormData[]) => {
    if (!getToken()) return
    try {
      const vitalsArray = dataList.map((d) => ({
        label: d.parameter,
        value: d.value,
        unit: d.unit || 'units',
        status: 'normal',
        referenceRange: d.reference || 'Standard Reference Range',
      }))

      const payload = {
        type: 'Manual Health Entry',
        hospital: 'Self-Reported / Home Reading',
        doctor: 'Self / Patient Entry',
        summary:
          `Manual report with ${dataList.length} parameter(s): ` +
          dataList.map((d) => `${d.parameter} = ${d.value} ${d.unit || ''}`).join(', '),
        keyFindings: dataList.map((d) => `${d.parameter}: ${d.value} ${d.unit || ''}`),
        vitals: vitalsArray,
      }

      const res = await api.createManualReport(payload)
      if (res?.report?.id) {
        setSelectedId(res.report.id)
      }
      fetchReports()
      window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
    } catch {
      /* silent catch */
    }
  }

  const handleSaveParameter = async (data: ManualParameterFormData, id?: string) => {
    if (id) {
      setParameters((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
      showToast('Success', 'Health parameter updated successfully', 'success')
    } else {
      await syncBatchParametersToBackend([data])
      showToast('Success', 'New health parameter saved as a new report!', 'success')
    }
  }

  const handleSaveBatchParameters = async (dataList: ManualParameterFormData[]) => {
    await syncBatchParametersToBackend(dataList)
    api.analyzeDiseaseRisks().catch(() => {})
    showToast('New Report Created!', `Created a separate report with ${dataList.length} parameter(s).`, 'success')
  }

  const handleDeleteParameter = async (id: string) => {
    const itemToDelete = parameters.find((p) => p.id === id)
    if (itemToDelete && itemToDelete.reportId) {
      try {
        await api.deleteReport(itemToDelete.reportId)
      } catch {}
    }

    setParameters((prev) => {
      const updated = prev.filter((item) => item.id !== id)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })

    fetchReports()
    window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
    showToast('Info', 'Parameter deleted from DB', 'info')
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all manually entered parameters?')) {
      const reportIdsToDelete = Array.from(new Set(parameters.map((p) => p.reportId).filter(Boolean))) as string[]
      for (const rId of reportIdsToDelete) {
        try {
          await api.deleteReport(rId)
        } catch {}
      }

      setParameters([])
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]))
      } catch {}

      fetchReports()
      window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
      showToast('Info', 'All manual parameters cleared', 'info')
    }
  }

  const selected = reports.find((r) => r.id === selectedId) || (reports.length > 0 ? reports[0] : null)

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={['MediAssist AI', 'Medical Reports']}
        title="Medical Reports & Health History"
        description="Upload a medical report (PDF) or log your health metrics manually with AI-powered extraction and analysis."
      />

      {/* Mode Selector (PDF Upload / Manual Entry) */}
      <div className="flex items-center gap-3 rounded-2xl border border-mist-200 bg-white p-2 shadow-xs">
        <Button
          variant={uploadMode === 'pdf' ? 'default' : 'ghost'}
          onClick={() => setUploadMode('pdf')}
          className={cn(
            'flex-1 gap-2.5 py-2.5 text-xs font-bold transition-all rounded-xl',
            uploadMode === 'pdf'
              ? 'bg-[#0F766E] text-white hover:bg-[#0F766E]/90 shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-mist-50'
          )}
        >
          <Upload className="h-4 w-4" /> PDF Upload
        </Button>

        <Button
          variant={uploadMode === 'manual' ? 'default' : 'ghost'}
          onClick={() => setUploadMode('manual')}
          className={cn(
            'flex-1 gap-2.5 py-2.5 text-xs font-bold transition-all rounded-xl',
            uploadMode === 'manual'
              ? 'bg-[#0F766E] text-white hover:bg-[#0F766E]/90 shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-mist-50'
          )}
        >
          <Plus className="h-4 w-4" /> Manual Entry
        </Button>
      </div>

      {/* 1. Report Upload Always Visible Above History */}
      {uploadMode === 'pdf' && (
        <Card className="border-mist-200 bg-white shadow-xs animate-rise">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-teal-600" /> Upload Medical Diagnostic Report
            </CardTitle>
            <CardDescription className="text-xs">
              PDF documents — text and vitals extracted automatically via local AI & OCR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadZone
              onComplete={(newReport) => {
                fetchReports()
                if (newReport?.id) {
                  setSelectedId(newReport.id)
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Section */}
      {uploadMode === 'manual' && (
        <Card className="border-mist-200 bg-white shadow-xs animate-rise">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-teal-600" /> Manual Health Metrics Entry
                </CardTitle>
                <CardDescription className="text-xs">
                  Record your vital values, glucose, BP, cholesterol, or custom health metrics manually. Saved entries immediately appear in your report history.
                </CardDescription>
              </div>
              <Button
                onClick={handleOpenAddModal}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 text-xs shadow-sm h-9 px-4 shrink-0"
              >
                <Plus className="h-4 w-4" /> Add Health Values
              </Button>
            </div>
          </CardHeader>
          <ManualEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveParameter}
            onSaveBatch={handleSaveBatchParameters}
            initialData={editingParameter}
          />
        </Card>
      )}

      {/* 2. Report History & Details Section */}
      {reports.length === 0 && !loading ? (
        <Card className="p-8 text-center shadow-xs border-dashed border-mist-300">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <History className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-ink">No Report History Found</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-soft mx-auto">
            Upload a PDF lab report or add manual health metrics above to view parsed biomarkers and AI insights.
          </p>
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
