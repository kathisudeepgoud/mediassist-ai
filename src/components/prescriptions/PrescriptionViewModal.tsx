import {
  FileText,
  Download,
  Calendar,
  User,
  Stethoscope,
  Pill,
  ExternalLink,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, getToken } from '@/services/api'

interface PrescriptionViewModalProps {
  isOpen: boolean
  onClose: () => void
  prescription: any | null
}

export function PrescriptionViewModal({ isOpen, onClose, prescription }: PrescriptionViewModalProps) {
  if (!prescription) return null

  const downloadUrl = api.getPrescriptionDownloadUrl(prescription.id || prescription.prescriptionNumber)

  const handleDownload = () => {
    const token = getToken()
    fetch(downloadUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed')
        return res.blob()
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = prescription.fileName || `Prescription_${prescription.prescriptionNumber || 'Doc'}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      })
      .catch((err) => {
        console.error('Download error:', err)
        window.open(downloadUrl, '_blank')
      })
  }

  let medsList: any[] = []
  if (prescription.medications) {
    try {
      medsList = typeof prescription.medications === 'string'
        ? JSON.parse(prescription.medications)
        : prescription.medications
    } catch {
      medsList = []
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-mist-200 bg-white">
        <div className="bg-[#0F766E] p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-200" />
                Medical Prescription #{prescription.prescriptionNumber || prescription.id}
              </DialogTitle>
              <DialogDescription className="text-teal-100 text-xs mt-0.5">
                Uploaded on{' '}
                {new Date(prescription.uploadedAt || prescription.createdAt || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Header Doctor & Patient Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-mist-50 border border-mist-200 text-xs">
            <div className="space-y-1">
              <span className="text-ink-soft uppercase text-[10px] font-bold tracking-wider">Prescribing Doctor</span>
              <p className="font-semibold text-ink text-sm flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-teal-600" />
                Dr. {prescription.doctorName || 'Doctor'}
              </p>
              {prescription.doctorSpecialization && (
                <p className="text-[11px] text-teal-700">{prescription.doctorSpecialization}</p>
              )}
            </div>

            <div className="space-y-1 sm:border-l sm:border-mist-200 sm:pl-3">
              <span className="text-ink-soft uppercase text-[10px] font-bold tracking-wider">Appointment Details</span>
              {prescription.appointmentNumber ? (
                <p className="font-medium text-ink flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-teal-600" />
                  Appt #{prescription.appointmentNumber}
                </p>
              ) : (
                <p className="text-ink-soft italic">Clinical consultation record</p>
              )}
              {prescription.appointmentDate && (
                <p className="text-[11px] text-ink-soft">
                  Date: {new Date(prescription.appointmentDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Diagnosis */}
          {prescription.diagnosis && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Diagnosis</h4>
              <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-100 text-xs font-medium text-teal-900">
                {prescription.diagnosis}
              </div>
            </div>
          )}

          {/* Medications Table */}
          {medsList.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-teal-600" /> Prescribed Medicines
              </h4>
              <div className="overflow-x-auto rounded-lg border border-mist-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-mist-50 text-[11px] text-ink-soft uppercase font-semibold">
                    <tr>
                      <th className="p-2">Medicine</th>
                      <th className="p-2">Dosage</th>
                      <th className="p-2">Frequency</th>
                      <th className="p-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist-100">
                    {medsList.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-mist-50/50">
                        <td className="p-2 font-medium text-ink">{m.name}</td>
                        <td className="p-2 text-ink-soft">{m.dosage || '—'}</td>
                        <td className="p-2 text-ink-soft">{m.frequency || '—'}</td>
                        <td className="p-2 text-ink-soft">{m.duration || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Instructions */}
          {prescription.instructions && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Doctor Instructions</h4>
              <p className="p-2.5 rounded-lg bg-mist-50 text-xs text-ink leading-relaxed border border-mist-200">
                {prescription.instructions}
              </p>
            </div>
          )}

          {/* PDF File Attachment Card */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white font-bold">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{prescription.fileName || 'Prescription.pdf'}</p>
                <p className="text-[11px] text-teal-700">Official Doctor Signed Medical PDF</p>
              </div>
            </div>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
