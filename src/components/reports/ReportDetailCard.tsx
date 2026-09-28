import { useState } from 'react'
import { Download, ExternalLink, Trash2, Loader2, Sparkles, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { VitalStatusBadge } from '@/components/shared/VitalStatusBadge'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'

interface ReportDetailCardProps {
  report: any
  onDelete?: (deletedId: string) => void
}

export function ReportDetailCard({ report, onDelete }: ReportDetailCardProps) {
  const { showToast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isExplaining, setIsExplaining] = useState(false)
  const [customKeyFindings, setCustomKeyFindings] = useState<any[] | null>(null)

  if (!report) return null

  const patientName = report.patient_name || report.patientName || 'Patient'
  const reportDate = report.report_date || report.reportDate || new Date().toISOString()
  const hospital = report.hospital || 'General Hospital'
  const doctor = report.doctor || 'Dr. Self / Lab'
  const type = report.type || 'Lab Test Report'
  const summary = report.summary || 'Summary of parsed lab report findings.'

  const rawVitals = Array.isArray(report.vitals) && report.vitals.length > 0
    ? report.vitals
    : Array.isArray(report.clinical_parameters || report.parameters) ? report.clinical_parameters || report.parameters : []

  // Check for non-clinical identifier, diagnosis, and interpretation lines
  const isNonClinicalLine = (name: string) =>
    /reg\.?\s*no|patient|mr\.|mrs\.|ms\.|received|sample\s*id|barcode|accession|specimen|uhid|mrn|report\s*id|diabetes\s*mellitus|impaired\s*tolerance|hypertension|prediabetes|anemia/i.test(name)

  // Filtered authoritative clinical measurements only
  const vitals = rawVitals
    .filter((v: any) => !isNonClinicalLine(v.label || v.name || ''))
    .map((v: any) => ({
      label: v.label || v.name || 'Parameter',
      value: v.value,
      unit: v.unit || '',
      status: v.status || (v.flag && String(v.flag).toLowerCase().includes('high') ? 'high' : v.flag && String(v.flag).toLowerCase().includes('low') ? 'low' : 'normal'),
      referenceRange: v.referenceRange || v.reference_range || 'N/A'
    }))

  const rawKeyFindings = customKeyFindings || (Array.isArray(report.key_findings || report.keyFindings)
    ? report.key_findings || report.keyFindings
    : [])

  const handleReExplain = async () => {
    if (!report.id) return
    setIsExplaining(true)
    try {
      const res = await api.reExplainReport(report.id)
      if (res && res.keyFindings && res.keyFindings.length > 0) {
        setCustomKeyFindings(res.keyFindings)
        showToast('AI Explanation Generated', 'Gemini AI explained your report values.')
        window.dispatchEvent(new Event('medassist_reports_updated'))
      } else {
        showToast('AI Unavailable', 'Gemini did not return explanations. Please check API configuration.', 'warning')
      }
    } catch (err: any) {
      showToast('AI Unavailable', err.message || 'Make sure Gemini API is configured.', 'warning')
    } finally {
      setIsExplaining(false)
    }
  }

  // Extract AI Explanations strictly for validated clinical measurements
  const explanationItems: { parameter: string; value?: any; unit?: string; status?: string; referenceRange?: string; explanation: string }[] = []

  if (rawKeyFindings.length > 0) {
    rawKeyFindings.forEach((item: any) => {
      if (typeof item === 'object' && item !== null && item.explanation && String(item.explanation).trim().length > 0) {
        const paramName = item.parameter || item.label || item.name || 'Parameter'
        if (!isNonClinicalLine(paramName)) {
          explanationItems.push({
            parameter: paramName,
            value: item.value,
            unit: item.unit,
            status: item.status,
            referenceRange: item.referenceRange,
            explanation: item.explanation
          })
        }
      }
    })
  }

  const formattedDate = new Date(reportDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const sourceTag = report.source || (report.file_type === 'MANUAL' || report.fileType === 'MANUAL' ? 'Manual Entry' : 'Uploaded PDF')

  const fields = [
    { label: 'Patient Name', value: patientName },
    { label: 'Report Date', value: formattedDate },
    { label: 'Hospital / Source', value: `${hospital} (${sourceTag})` },
    { label: 'Doctor / Reviewer', value: doctor },
  ]

  const handleDelete = async () => {
    if (!report.id) return
    setDeleting(true)
    try {
      await api.deleteReport(report.id)
      showToast('Report deleted', `${type} was deleted successfully.`, 'info')
      window.dispatchEvent(new Event('medassist_reports_updated'))
      if (onDelete) {
        onDelete(report.id)
      }
    } catch (err: any) {
      showToast('Delete error', err.message || 'Failed to delete report.', 'warning')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <Card className="animate-rise border-mist-200">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>{type}</CardTitle>
            <Badge variant="outline" className="text-[11px] font-normal">
              {sourceTag}
            </Badge>
          </div>
          <CardDescription className="mt-1">
            {hospital} &bull; Recorded on {formattedDate}
          </CardDescription>
        </div>

        {/* Delete Report Action */}
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 animate-in fade-in">
              <span className="text-xs text-rose-600 font-medium mr-1">Delete report?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-7 px-2 text-xs"
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              className="text-ink-soft hover:text-rose-600 h-8 w-8"
              title="Delete Report"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-mist-50/80 p-4 sm:grid-cols-4">
          {fields.map((f) => (
            <div key={f.label} className="space-y-0.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">
                {f.label}
              </span>
              <p className="text-sm font-semibold text-ink">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Clinical Summary */}
        <div className="rounded-xl border border-mist-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-teal-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Clinical Summary</h4>
          </div>
          <p className="text-xs leading-relaxed text-ink-soft">{summary}</p>
        </div>

        <Separator />

        {/* 1. ACTUAL EXTRACTED REPORT DATA (AUTHORITATIVE) */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600" />
                1. Actual Report Data (Authoritative)
              </h4>
              <p className="text-[11px] text-ink-soft mt-0.5">
                Authoritative laboratory and physiological measurements extracted from your medical document.
              </p>
            </div>
            <span className="text-xs text-ink-soft font-mono font-medium">
              {vitals.length} parameter{vitals.length === 1 ? '' : 's'}
            </span>
          </div>

          {vitals.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {vitals.map((vital: any, idx: number) => {
                const isNormal = vital.status === 'normal'
                const isHigh = vital.status === 'high'
                const isLow = vital.status === 'low'
                const isBorderline = vital.status === 'borderline'

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                      isHigh
                        ? 'border-rose-200 bg-rose-50/40'
                        : isLow
                        ? 'border-amber-200 bg-amber-50/40'
                        : isBorderline
                        ? 'border-purple-200 bg-purple-50/40'
                        : 'border-mist-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-xs font-semibold text-ink" title={vital.label}>
                        {vital.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        Ref: {vital.referenceRange || 'N/A'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-mono text-sm font-bold text-ink">
                        {vital.value} <span className="text-xs font-normal text-ink-soft">{vital.unit}</span>
                      </span>
                      <div className="mt-1">
                        <VitalStatusBadge status={vital.status} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-ink-soft italic">No vital readings or parameters recorded for this report.</p>
          )}
        </div>

        <Separator />

        {/* 2. DYNAMIC AI-GENERATED EXPLANATION (GEMINI AI) */}
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                  2. Simplified AI Explanation
                </h4>
                <Badge variant="outline" className="bg-white/80 border-teal-300 text-teal-800 text-[10px] px-1.5 py-0 font-medium">
                  Gemini AI
                </Badge>
              </div>
              <p className="text-[11px] text-teal-800/80 mt-0.5">
                Plain-language explanations generated dynamically by Google Gemini AI.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReExplain}
              disabled={isExplaining}
              className="h-7 text-[11px] px-2.5 border-teal-300 text-teal-800 hover:bg-teal-100/60"
            >
              {isExplaining ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Generating AI explanation...
                </>
              ) : (
                <>
                  <Activity className="mr-1.5 h-3 w-3 text-teal-600" />
                  {explanationItems.length > 0 ? 'Regenerate with Gemini' : 'Generate AI Explanation'}
                </>
              )}
            </Button>
          </div>

          {isExplaining ? (
            <div className="rounded-xl border border-teal-200 bg-white p-6 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600 mx-auto" />
              <p className="text-xs font-medium text-teal-900">
                Generating AI explanation...
              </p>
              <p className="text-[11px] text-ink-soft">
                Analyzing extracted values securely. Authoritative report data is preserved.
              </p>
            </div>
          ) : explanationItems.length > 0 ? (
            <div className="space-y-3">
              {explanationItems.map((item, idx) => {
                const matchedVital = vitals.find((v: any) => v.label.toLowerCase() === item.parameter.toLowerCase())
                const statusVal = item.status || matchedVital?.status || 'normal'
                const displayVal = item.value !== undefined ? item.value : matchedVital?.value
                const displayUnit = item.unit || matchedVital?.unit || ''
                const refRange = item.referenceRange || matchedVital?.referenceRange || 'Unavailable'

                return (
                  <div key={idx} className="rounded-xl border border-teal-100 bg-white p-3.5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-teal-600 shrink-0" />
                        <span className="text-xs font-bold text-ink">{item.parameter}</span>
                      </div>
                      {displayVal !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-ink-soft text-[11px]">Reported:</span>
                          <span className="font-mono font-bold text-ink">
                            {displayVal} {displayUnit}
                          </span>
                          <VitalStatusBadge status={statusVal} />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs pt-1 border-t border-mist-100">
                      <div className="md:col-span-4 bg-mist-50/70 rounded-lg p-2 text-[11px] text-ink-soft space-y-0.5">
                        <p className="font-semibold text-ink">Actual Report Data:</p>
                        <p>Result: <strong className="text-ink">{displayVal} {displayUnit}</strong></p>
                        <p>Ref: <strong className="text-ink">{refRange}</strong></p>
                      </div>
                      <div className="md:col-span-8 p-2 text-xs leading-relaxed text-ink-soft border-l-2 border-teal-400 bg-teal-50/20 rounded-r-lg">
                        <p className="font-semibold text-teal-950 text-[11px] mb-0.5">Gemini AI Explanation:</p>
                        <p>{item.explanation}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
              <p className="font-semibold">AI explanation is currently unavailable.</p>
              <p className="mt-0.5 text-[11px] text-amber-800">
                Your authoritative extracted report values are preserved above. Click &quot;Generate AI Explanation&quot; to have Gemini AI explain these findings in plain language.
              </p>
            </div>
          )}

          <p className="text-[10px] text-ink-soft/70 italic pt-1">
            Disclaimer: AI explanations are generated for educational and informational purposes only and do not constitute a medical diagnosis or prescription.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-2 pt-2">
          <Button onClick={() => showToast('Summary downloaded', `${type}.pdf saved.`)}>
            <Download className="h-4 w-4" /> Download Summary
          </Button>
          <Button variant="outline" onClick={() => showToast('Opening original', 'Opening original report document…', 'info')}>
            <ExternalLink className="h-4 w-4" /> View Original Report
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
