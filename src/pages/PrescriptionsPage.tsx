import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Calendar,
  Stethoscope,
  Search,
  CheckCircle2,
  ExternalLink,
  Pill,
  RotateCw,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api, getToken } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { PrescriptionViewModal } from '@/components/prescriptions/PrescriptionViewModal'
import { cn } from '@/utils/cn'

export default function PrescriptionsPage() {
  const { user } = useAuth()
  const isDoctor = (user?.role || '').toLowerCase() === 'doctor'

  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null)

  const loadPrescriptions = async () => {
    setLoading(true)
    try {
      const res = await api.getMyPrescriptions()
      setPrescriptions(res.prescriptions || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrescriptions()
  }, [])

  const handleDownload = (p: any) => {
    const downloadUrl = api.getPrescriptionDownloadUrl(p.id || p.prescriptionNumber)
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
        a.download = p.fileName || `Prescription_${p.prescriptionNumber || 'Doc'}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      })
      .catch(() => {
        window.open(downloadUrl, '_blank')
      })
  }

  const filtered = prescriptions.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    const otherName = isDoctor ? p.patientName : p.doctorName
    return (
      otherName?.toLowerCase().includes(q) ||
      p.diagnosis?.toLowerCase().includes(q) ||
      p.prescriptionNumber?.toLowerCase().includes(q) ||
      p.appointmentNumber?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          crumbs={['MediAssist AI', 'Prescriptions']}
          title={isDoctor ? 'Prescriptions Issued' : 'Prescription History & Downloads'}
          description={
            isDoctor
              ? 'Review and manage verified digital prescriptions issued to your patients.'
              : 'Access and download official signed medical prescriptions issued by your consulting physicians.'
          }
        />
        <Button
          variant="outline"
          size="sm"
          onClick={loadPrescriptions}
          className="self-start sm:self-auto text-ink-soft hover:text-ink shrink-0"
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh Prescriptions
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by doctor, diagnosis, or prescription #..."
          className="pl-10 text-xs h-10 bg-white"
        />
      </div>

      {/* Prescription Cards List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((p) => {
            const displayName = isDoctor ? p.patientName : p.doctorName
            const code = isDoctor ? p.patientCode : p.doctorCode

            let medsCount = 0
            if (p.medications) {
              try {
                const meds = typeof p.medications === 'string' ? JSON.parse(p.medications) : p.medications
                medsCount = Array.isArray(meds) ? meds.length : 0
              } catch {
                medsCount = 0
              }
            }

            return (
              <Card
                key={p.id}
                className="border-mist-200 bg-white rounded-2xl shadow-xs transition-all hover:shadow-sm hover:border-teal-300"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left File & Doctor Details */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <FileText className="h-6 w-6" />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display font-bold text-sm text-ink">
                            {isDoctor ? `Patient: ${displayName}` : `Dr. ${displayName}`}
                          </h4>
                          {code && (
                            <Badge variant="outline" className="font-mono text-[10px] text-teal-700 bg-teal-50">
                              {code}
                            </Badge>
                          )}
                          <Badge variant="default" className="text-[10px] uppercase font-mono bg-teal-700">
                            #{p.prescriptionNumber || p.id?.slice(0, 8)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-teal-600" />
                            Uploaded{' '}
                            {new Date(p.uploadedAt || p.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {p.appointmentNumber && (
                            <span className="text-teal-800 font-medium">Appt #{p.appointmentNumber}</span>
                          )}
                          {medsCount > 0 && (
                            <span className="flex items-center gap-1 text-teal-700">
                              <Pill className="h-3 w-3" /> {medsCount} medication(s)
                            </span>
                          )}
                        </div>

                        {p.diagnosis && (
                          <p className="text-xs text-ink-soft pt-1 line-clamp-1">
                            Diagnosis: <span className="font-medium text-ink">{p.diagnosis}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPrescription(p)}
                        className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50 h-9"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(p)}
                        className="bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs font-semibold h-9"
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="py-16 text-center text-ink-soft bg-white rounded-2xl border border-mist-200">
            <FileText className="mx-auto h-12 w-12 text-mist-300 mb-3" />
            <h4 className="font-display font-semibold text-base text-ink">No Prescriptions Available</h4>
            <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
              {isDoctor
                ? 'You have not uploaded any prescriptions yet. Complete an appointment to issue a prescription.'
                : 'Your consulting doctors will upload official prescriptions here following your medical consultations.'}
            </p>
          </div>
        )}
      </div>

      {/* Prescription View Modal */}
      <PrescriptionViewModal
        isOpen={Boolean(selectedPrescription)}
        onClose={() => setSelectedPrescription(null)}
        prescription={selectedPrescription}
      />
    </div>
  )
}
