import { useState } from 'react'
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  UserCheck,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'

interface AddPatientModalProps {
  isOpen: boolean
  onClose: () => void
  onPatientAdded: () => void
}

export function AddPatientModal({ isOpen, onClose, onPatientAdded }: AddPatientModalProps) {
  const { showToast } = useToast()
  const [patientInput, setPatientInput] = useState('')
  const [reason, setReason] = useState('Clinical Consultation & Treatment')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = patientInput.trim()
    if (!query) {
      setError('Please enter a Patient ID or registered patient email.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await api.addDoctorPatient(query, reason)
      showToast(
        'Patient Added',
        res.message || `Patient ${res.patient?.name || query} added to your patients.`,
        'success'
      )
      setPatientInput('')
      setReason('Clinical Consultation & Treatment')
      onPatientAdded()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Unable to add patient. Please verify the Patient ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-mist-200 bg-white">
        <div className="bg-[#0F766E] p-4 text-white">
          <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-200" />
            Add Patient to My Patients
          </DialogTitle>
          <DialogDescription className="text-teal-100 text-xs mt-0.5">
            Permanently associate a registered patient account with your medical practice.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Patient ID or Account Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <Input
                value={patientInput}
                onChange={(e) => setPatientInput(e.target.value)}
                placeholder="e.g. P000001 or patient@example.com"
                className="pl-9 text-xs h-10 font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-ink-soft">
              Enter the patient's unique Patient ID (e.g. P000001) or registered email address.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Reason for Adding (Optional)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Regular Cardiac Follow-up / Referred Patient"
              className="text-xs h-9"
            />
          </div>

          <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-3 text-xs text-teal-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-teal-700" /> Authorized Clinical Relationship
            </p>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              Once added, this patient will appear permanently in your <strong>My Patients</strong> list, giving you direct access to their medical reports, vitals, risk analysis, and appointment history.
            </p>
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
                  <RotateCw className="h-3.5 w-3.5 animate-spin" /> Verifying & Adding...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" /> Add Patient Permanently
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
