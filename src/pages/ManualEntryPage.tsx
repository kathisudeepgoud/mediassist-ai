import React, { useState, useEffect } from 'react'
import type { ManualParameter, ManualParameterFormData } from '@/types/manualEntry'
import { ManualEntryModal } from '@/components/manual/ManualEntryModal'
import { ManualParameterList } from '@/components/manual/ManualParameterList'
import { ManualTrendsChart } from '@/components/manual/ManualTrendsChart'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Plus,
  ArrowRight,
  Database,
  CheckCircle2,
  FileCheck2,
  Layers,
  Cpu,
  FileText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/context/ToastContext'
import { api, getToken } from '@/services/api'

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

export default function ManualEntryPage() {
  const [parameters, setParameters] = useState<ManualParameter[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_INITIAL_PARAMETERS
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParameter, setEditingParameter] = useState<ManualParameter | null>(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleOpenAddModal = () => {
    setEditingParameter(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (item: ManualParameter) => {
    setEditingParameter(item)
    setIsModalOpen(true)
  }

  // Sync backend DB manual reports with ManualEntryPage state
  const fetchBackendManualParameters = async () => {
    if (!getToken()) return
    try {
      const res = await api.getReports()
      const allReports = res.reports || []
      const manualReports = allReports.filter((r) => 
        r.source === 'Manual Entry' || r.file_type === 'MANUAL' || r.fileType === 'MANUAL' || (r.type && r.type.toLowerCase().includes('manual'))
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
            createdAt: r.created_at || r.createdAt || r.report_date || new Date().toISOString()
          })
        }
      }

      if (extractedItems.length > 0) {
        setParameters(extractedItems)
      }
    } catch {
      /* ignore fetch error */
    }
  }

  // Initial load & real-time event listener for report updates across pages
  useEffect(() => {
    fetchBackendManualParameters()

    const handleReportsUpdated = () => {
      fetchBackendManualParameters()
    }

    window.addEventListener('medassist_reports_updated', handleReportsUpdated)
    return () => {
      window.removeEventListener('medassist_reports_updated', handleReportsUpdated)
    }
  }, [])

  // Sync parameter list to backend server using direct fast JSON endpoint
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
        summary: `Manual report with ${dataList.length} parameter(s): ` +
          dataList.map((d) => `${d.parameter} = ${d.value} ${d.unit || ''}`).join(', '),
        keyFindings: dataList.map((d) => `${d.parameter}: ${d.value} ${d.unit || ''}`),
        vitals: vitalsArray
      }

      await api.createManualReport(payload)
      window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
    } catch {
      // Silent catch for backend sync fallback
    }
  }

  const handleSaveParameter = async (data: ManualParameterFormData, id?: string) => {
    if (id) {
      setParameters((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...data } : item))
      )
      showToast('Success', 'Health parameter updated successfully', 'success')
    } else {
      await syncBatchParametersToBackend([data])
      showToast('Success', 'New health parameter saved as a new report!', 'success')
    }
  }

  // Batch Save Handler: Saves all values together as 1 NEW separate medical report
  const handleSaveBatchParameters = async (dataList: ManualParameterFormData[]) => {
    await syncBatchParametersToBackend(dataList)

    // Re-trigger ML Risk calculation
    api.analyzeDiseaseRisks().catch(() => {})

    showToast(
      'New Report Created!',
      `Created a separate medical report with ${dataList.length} parameter(s).`,
      'success'
    )
  }

  const handleDeleteParameter = async (id: string) => {
    const itemToDelete = parameters.find((p) => p.id === id)
    if (itemToDelete && itemToDelete.reportId) {
      try {
        await api.deleteReport(itemToDelete.reportId)
      } catch {
        /* ignore delete error */
      }
    }

    setParameters((prev) => {
      const updated = prev.filter((item) => item.id !== id)
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })

    window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
    showToast('Info', 'Parameter and report deleted from DB', 'info')
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all manually entered parameters from the database?')) {
      const reportIdsToDelete = Array.from(new Set(parameters.map((p) => p.reportId).filter(Boolean))) as string[]
      for (const rId of reportIdsToDelete) {
        try {
          await api.deleteReport(rId)
        } catch {
          /* ignore delete error */
        }
      }

      setParameters([])
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]))
      } catch {}

      window.dispatchEvent(new CustomEvent('medassist_reports_updated'))
      showToast('Info', 'All manual parameters cleared from DB', 'info')
    }
  }

  const getAiPayload = () => {
    return parameters.map((p) => ({
      parameter: p.parameter,
      value: p.value,
      unit: p.unit || '',
      reference: p.reference || '',
    }))
  }

  const handleAnalyzeWithAi = () => {
    const payload = getAiPayload()
    if (payload.length === 0) {
      showToast('Warning', 'Add at least one parameter before running AI analysis', 'warning')
      return
    }
    sessionStorage.setItem('medassist_ai_manual_payload', JSON.stringify(payload))
    showToast('Success', `${payload.length} manual parameters prepared for AI analysis`, 'success')
    navigate('/assistant')
  }

  return (
    <div className="space-y-6">
      {/* Page Header matching Medical Reports UI style */}
      <PageHeader
        crumbs={['MediAssist AI', 'Manual Entry']}
        title="Manual Health Entry"
        description="Directly input your health metrics manually."
        actions={
          <Button
            onClick={handleOpenAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Values
          </Button>
        }
      />

      {/* Live Graph Trends Section */}
      <ManualTrendsChart parameters={parameters} />

      {/* Main Parameters List Component */}
      <ManualParameterList
        parameters={parameters}
        onAddClick={handleOpenAddModal}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteParameter}
        onClearAll={handleClearAll}
      />

      {/* Modal Dialog for Add / Edit */}
      <ManualEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveParameter}
        onSaveBatch={handleSaveBatchParameters}
        initialData={editingParameter}
      />
    </div>
  )
}
