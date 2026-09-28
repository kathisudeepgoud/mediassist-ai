import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Upload, Plus, FileText, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UploadZone } from '@/components/reports/UploadZone'
import { ReportDetailCard } from '@/components/reports/ReportDetailCard'
import { TermExplanationCard } from '@/components/reports/TermExplanationCard'
import { mockTermExplanations } from '@/data/reports'
import { ManualTrendsChart } from '@/components/manual/ManualTrendsChart'
import { ManualParameterList } from '@/components/manual/ManualParameterList'
import { ManualEntryModal } from '@/components/manual/ManualEntryModal'
import type { ManualParameter, ManualParameterFormData } from '@/types/manualEntry'
import { useToast } from '@/context/ToastContext'
import { api, getToken } from '@/services/api'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

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

export default function ReportUploadPage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'manual' ? 'manual' : 'pdf'
  const [uploadMode, setUploadMode] = useState<'pdf' | 'manual'>(initialTab)

  // PDF Upload State
  const [pdfReports, setPdfReports] = useState<any[]>([])
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(true)

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

  // Fetch PDF reports for PDF Upload view
  const fetchPdfReports = async () => {
    try {
      setPdfLoading(true)
      const res = await api.getReports()
      const list = res.reports || []
      setPdfReports(list)
      if (list.length > 0 && !selectedPdfId) {
        setSelectedPdfId(list[0].id)
      }
    } catch {
      /* ignore */
    } finally {
      setPdfLoading(false)
    }
  }

  // Fetch Manual parameters for Manual Entry view
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
    fetchPdfReports()
    fetchManualParameters()

    const handleReportsUpdated = () => {
      fetchPdfReports()
      fetchManualParameters()
    }

    window.addEventListener('medassist_reports_updated', handleReportsUpdated)
    return () => {
      window.removeEventListener('medassist_reports_updated', handleReportsUpdated)
    }
  }, [])

  // Handlers for PDF Upload Mode
  const handleUploadComplete = async (newReport?: any) => {
    await fetchPdfReports()
    if (newReport && newReport.id) {
      setSelectedPdfId(newReport.id)
    }
  }

  const handleDeletePdfComplete = async (deletedId: string) => {
    const updated = pdfReports.filter((r) => r.id !== deletedId)
    setPdfReports(updated)
    if (updated.length > 0) {
      setSelectedPdfId(updated[0].id)
    } else {
      setSelectedPdfId(null)
    }
  }

  const selectedPdfReport =
    pdfReports.find((r) => r.id === selectedPdfId) || (pdfReports.length > 0 ? pdfReports[0] : null)

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

      await api.createManualReport(payload)
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

      window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
      showToast('Info', 'All manual parameters cleared', 'info')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <PageHeader
        crumbs={['MediAssist AI', 'Report Upload']}
        title="Report Upload"
        description="Upload a medical report (PDF/Image) or input your health metrics manually."
      />

      {/* Two Buttons Mode Selector in a Single Row */}
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

      {/* PDF Upload Mode */}
      {uploadMode === 'pdf' && (
        <div className="space-y-6 animate-rise">
          <Card>
            <CardHeader>
              <CardTitle>Upload a Medical Report</CardTitle>
              <CardDescription>PDF, PNG, or JPG — text and vitals extracted automatically via AI</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadZone onComplete={handleUploadComplete} />
            </CardContent>
          </Card>

          {pdfLoading ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : selectedPdfReport ? (
            <ReportDetailCard report={selectedPdfReport} onDelete={handleDeletePdfComplete} />
          ) : (
            <Card className="p-8 text-center text-ink-soft">
              <p>No uploaded reports yet. Drag & drop a PDF report above to view AI health summary.</p>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>AI Report Explanation</CardTitle>
              <CardDescription>Medical terms from your report, explained simply</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {mockTermExplanations.map((t) => (
                <TermExplanationCard key={t.term} {...t} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manual Entry Mode */}
      {uploadMode === 'manual' && (
        <div className="space-y-6 animate-rise">
          {/* Manual Entry Sub-Header */}
          <div className="flex items-center justify-between rounded-2xl border border-mist-200 bg-white p-4 shadow-xs">
            <div>
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" /> Manual Health Entry
              </h3>
              <p className="text-xs text-ink-soft">
                Record your vitals manually. Entries created together are saved into a single report.
              </p>
            </div>
            <Button
              onClick={handleOpenAddModal}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Values
            </Button>
          </div>

          {/* Live Parameter Trend Graphs */}
          <ManualTrendsChart parameters={parameters} />

          {/* Sequence-Wise Manual Entry List */}
          <ManualParameterList
            parameters={parameters}
            onAddClick={handleOpenAddModal}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteParameter}
            onClearAll={handleClearAll}
          />

          {/* Manual Entry Modal */}
          <ManualEntryModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveParameter}
            onSaveBatch={handleSaveBatchParameters}
            initialData={editingParameter}
          />
        </div>
      )}
    </div>
  )
}
