import { useState } from 'react'
import {
  FileText,
  UploadCloud,
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RotateCw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'

interface UploadPrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: string
  patientName: string
  appointmentId?: string
  appointmentNumber?: string
  onSuccess?: (prescription: any) => void
}

interface MedicationRow {
  name: string
  dosage: string
  frequency: string
  duration: string
}

export function UploadPrescriptionModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  appointmentId,
  appointmentNumber,
  onSuccess,
}: UploadPrescriptionModalProps) {
  const { showToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [instructions, setInstructions] = useState('')
  const [medications, setMedications] = useState<MedicationRow[]>([
    { name: '', dosage: '', frequency: 'Once daily', duration: '5 days' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: 'Twice daily', duration: '7 days' }])
  }

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const handleMedChange = (index: number, field: keyof MedicationRow, value: string) => {
    const updated = [...medications]
    updated[index][field] = value
    setMedications(updated)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Please upload a valid PDF document.')
        return
      }
      if (selected.size > 15 * 1024 * 1024) {
        setError('File size exceeds the 15MB limit.')
        return
      }
      setError(null)
      setFile(selected)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please attach a prescription PDF document.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('patientId', patientId)
      if (appointmentId) formData.append('appointmentId', appointmentId)
      if (diagnosis) formData.append('diagnosis', diagnosis)
      if (instructions) formData.append('instructions', instructions)
      formData.append('medications', JSON.stringify(medications.filter((m) => m.name.trim())))

      const res = await api.uploadPrescription(formData)
      showToast('Prescription Uploaded', `Prescription for ${patientName} uploaded successfully.`, 'success')
      if (onSuccess) onSuccess(res.prescription)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to upload prescription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-mist-200 bg-white">
        <div className="bg-[#0F766E] p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-200" />
                Upload Clinical Prescription
              </DialogTitle>
              <DialogDescription className="text-teal-100 text-xs mt-0.5">
                Patient: <span className="font-semibold text-white">{patientName}</span> ({patientId})
                {appointmentNumber ? ` • Appt #${appointmentNumber}` : ''}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PDF File Upload Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Prescription PDF Document *</label>
            <div className="border-2 border-dashed border-mist-200 hover:border-teal-500 rounded-xl p-4 text-center transition-colors bg-mist-50/50">
              <input
                type="file"
                id="prescription-file-input"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="prescription-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-1"
              >
                <UploadCloud className="h-8 w-8 text-teal-600" />
                {file ? (
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold mt-1">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-[11px] font-normal text-ink-soft">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-ink">Click to upload prescription PDF</p>
                    <p className="text-[11px] text-ink-soft">PDF format only, up to 15MB</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Clinical Diagnosis */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Clinical Diagnosis / Findings</label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Mild Hypertension, Type 2 Diabetes follow-up"
              className="text-xs h-9"
            />
          </div>

          {/* Medications Structured Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">Prescribed Medications</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMedication}
                className="h-7 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
              >
                <Plus className="mr-1 h-3 w-3" /> Add Medication
              </Button>
            </div>

            <div className="space-y-2">
              {medications.map((med, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-mist-50 border border-mist-200">
                  <Input
                    placeholder="Medicine Name (e.g. Metformin)"
                    value={med.name}
                    onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                    className="text-xs h-8 flex-1"
                  />
                  <Input
                    placeholder="Dosage (500mg)"
                    value={med.dosage}
                    onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                    className="text-xs h-8 w-24"
                  />
                  <Input
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                    className="text-xs h-8 w-28"
                  />
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(idx)}
                      className="p-1 text-ink-soft hover:text-rose-500 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Doctor's Advice & Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Take medicines after food. Avoid high sodium and recheck BP in 2 weeks."
              rows={2}
              className="w-full rounded-md border border-mist-200 p-2.5 text-xs text-ink focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-mist-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs font-medium h-9"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <RotateCw className="h-3.5 w-3.5 animate-spin" /> Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <UploadCloud className="h-3.5 w-3.5" /> Upload Prescription
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
