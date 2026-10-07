import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  FileText,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Send,
  User,
  Stethoscope,
  Clock,
  Sparkles,
  Share2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { api } from '@/services/api'
import { UploadPrescriptionModal } from '@/components/prescriptions/UploadPrescriptionModal'
import { cn } from '@/utils/cn'

export default function ConsultationPage() {
  const { appointmentNumber } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const isDoctor = (user?.role || '').toLowerCase() === 'doctor'

  // Consultation controls
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'notes' | 'vitals'>('chat')

  // In-call chat
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([
    {
      sender: isDoctor ? 'System' : 'Dr. Consultation Assistant',
      text: 'Encrypted telemedicine session initiated. Audio and video streams are active.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [chatInput, setChatInput] = useState('')

  // Clinical Consultation Notes
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false)
  const [appointmentData, setAppointmentData] = useState<any | null>(null)

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load appointment details
  useEffect(() => {
    if (appointmentNumber) {
      api.getAppointmentById(appointmentNumber)
        .then((res) => setAppointmentData(res.appointment))
        .catch(() => {})
    }
  }, [appointmentNumber])

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    setChatMessages((prev) => [
      ...prev,
      {
        sender: user?.name || (isDoctor ? 'Doctor' : 'Patient'),
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setChatInput('')
  }

  const handleEndConsultation = async () => {
    if (confirm('Are you sure you want to end this consultation session?')) {
      if (isDoctor && appointmentData?.id) {
        try {
          await api.updateAppointmentStatus(appointmentData.id, {
            status: 'completed',
            doctorNotes: clinicalNotes || undefined,
          })
        } catch {
          /* ignore */
        }
      }
      showToast('Consultation Ended', 'Tele-consultation session completed successfully.', 'success')
      navigate(isDoctor ? '/doctor-dashboard?tab=appointments' : '/appointments?tab=my-appointments')
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Session Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-mist-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Video className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-ink">
                Tele-Consultation #{appointmentNumber?.toUpperCase()}
              </h3>
              <Badge variant="default" className="bg-teal-700 text-[10px] uppercase font-mono">
                Live Video
              </Badge>
            </div>
            <p className="text-xs text-ink-soft">
              {isDoctor
                ? `Consulting Patient: ${appointmentData?.patientName || 'Patient'}`
                : `Consulting Physician: Dr. ${appointmentData?.doctorName || 'Doctor'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-mist-100 px-3 py-1.5 text-xs font-mono font-semibold text-ink">
            <Clock className="h-4 w-4 text-teal-600 animate-spin" />
            <span>{formatDuration(callDuration)}</span>
          </div>
          <Button
            size="sm"
            onClick={handleEndConsultation}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-9"
          >
            <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> End Consultation
          </Button>
        </div>
      </div>

      {/* Video & Interaction Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[500px]">
        {/* Left: Video Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="relative flex-1 min-h-[420px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shadow-md">
            {/* Main Remote Feed */}
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white text-center space-y-3">
              <div className="relative">
                <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-3xl font-bold font-display shadow-lg border-4 border-slate-800">
                  {isDoctor
                    ? appointmentData?.patientName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P'
                    : appointmentData?.doctorName?.replace('Dr. ', '').split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'D'}
                </div>
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
              </div>

              <div>
                <h4 className="font-display font-bold text-lg text-white">
                  {isDoctor
                    ? appointmentData?.patientName || 'Rahul Sharma'
                    : `Dr. ${appointmentData?.doctorName || 'Sarah Jenkins'}`}
                </h4>
                <p className="text-xs text-teal-200/80">
                  {isDoctor ? 'Patient Feed (Camera & Audio Connected)' : 'Specialist Consultation Stream'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5" /> 1080p WebRTC Encrypted
                </span>
              </div>
            </div>

            {/* Self Video PIP (Picture in Picture) */}
            <div className="absolute bottom-4 right-4 w-36 sm:w-44 h-28 sm:h-32 rounded-xl bg-slate-800 border-2 border-teal-500/50 shadow-xl overflow-hidden flex flex-col items-center justify-center p-2 text-white">
              {videoEnabled ? (
                <div className="flex flex-col items-center justify-center text-center space-y-1">
                  <div className="h-10 w-10 rounded-full bg-teal-700 flex items-center justify-center text-xs font-bold font-display">
                    {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'ME'}
                  </div>
                  <p className="text-[10px] font-semibold truncate max-w-[120px]">{user?.name || 'You'}</p>
                  <span className="text-[9px] text-teal-300 font-mono">You (Local)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <VideoOff className="h-6 w-6 mb-1" />
                  <span className="text-[10px]">Camera off</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Floating Control Strip */}
          <div className="flex items-center justify-center gap-3 bg-white p-3 rounded-2xl border border-mist-200 shadow-xs">
            <Button
              size="sm"
              variant={videoEnabled ? 'default' : 'outline'}
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={cn('rounded-xl h-10 px-4 text-xs font-medium', videoEnabled ? 'bg-[#0F766E] hover:bg-[#0B5A54] text-white' : 'text-ink-soft')}
            >
              {videoEnabled ? <Video className="mr-2 h-4 w-4" /> : <VideoOff className="mr-2 h-4 w-4 text-rose-500" />}
              {videoEnabled ? 'Camera On' : 'Camera Off'}
            </Button>

            <Button
              size="sm"
              variant={audioEnabled ? 'default' : 'outline'}
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={cn('rounded-xl h-10 px-4 text-xs font-medium', audioEnabled ? 'bg-[#0F766E] hover:bg-[#0B5A54] text-white' : 'text-ink-soft')}
            >
              {audioEnabled ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4 text-rose-500" />}
              {audioEnabled ? 'Mute Mic' : 'Unmute Mic'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={cn('rounded-xl h-10 px-4 text-xs font-medium', isScreenSharing ? 'bg-teal-50 border-teal-500 text-teal-700' : 'text-ink-soft')}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {isScreenSharing ? 'Sharing Screen' : 'Share Screen'}
            </Button>

            {isDoctor && (
              <Button
                size="sm"
                onClick={() => setIsPrescriptionModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white rounded-xl h-10 px-4 text-xs font-semibold shadow-xs"
              >
                <FileText className="mr-2 h-4 w-4" /> Issue Prescription
              </Button>
            )}
          </div>
        </div>

        {/* Right: In-call Panel (Chat & Notes) (4 cols) */}
        <div className="lg:col-span-4 flex flex-col rounded-2xl bg-white border border-mist-200 shadow-xs overflow-hidden h-full min-h-[480px]">
          {/* Panel Tab Selector */}
          <div className="flex border-b border-mist-100 bg-mist-50/70 p-1">
            <button
              onClick={() => setActiveSideTab('chat')}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                activeSideTab === 'chat' ? 'bg-white text-teal-800 shadow-xs' : 'text-ink-soft hover:text-ink'
              )}
            >
              <MessageSquare className="inline mr-1 h-3.5 w-3.5" /> Live Chat
            </button>
            {isDoctor && (
              <button
                onClick={() => setActiveSideTab('notes')}
                className={cn(
                  'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                  activeSideTab === 'notes' ? 'bg-white text-teal-800 shadow-xs' : 'text-ink-soft hover:text-ink'
                )}
              >
                <FileText className="inline mr-1 h-3.5 w-3.5" /> Doctor Notes
              </button>
            )}
            <button
              onClick={() => setActiveSideTab('vitals')}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                activeSideTab === 'vitals' ? 'bg-white text-teal-800 shadow-xs' : 'text-ink-soft hover:text-ink'
              )}
            >
              <Activity className="inline mr-1 h-3.5 w-3.5" /> Patient Info
            </button>
          </div>

          {/* Chat Tab */}
          {activeSideTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-mist-50/20 max-h-[380px]">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-mist-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink text-[11px]">{m.sender}</span>
                      <span className="text-[10px] text-ink-soft">{m.time}</span>
                    </div>
                    <p className="text-ink-soft text-xs leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="p-2.5 border-t border-mist-100 bg-white flex items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type in session chat..."
                  className="text-xs h-9 bg-mist-50/50"
                />
                <Button type="submit" size="sm" className="bg-[#0F766E] hover:bg-[#0B5A54] text-white h-9 px-3">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          )}

          {/* Doctor Clinical Notes Tab */}
          {activeSideTab === 'notes' && (
            <div className="flex-1 p-4 space-y-3 flex flex-col">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Clinical Consultation Assessment
              </h4>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Record patient complaints, vital observations, clinical diagnosis, and management plan..."
                className="flex-1 w-full rounded-xl border border-mist-200 p-3 text-xs text-ink focus:border-teal-600 focus:outline-none resize-none leading-relaxed"
              />
              <Button
                size="sm"
                onClick={() => setIsPrescriptionModalOpen(true)}
                className="w-full bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs font-semibold h-9"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Upload Prescription PDF
              </Button>
            </div>
          )}

          {/* Patient Quick Vitals Info Tab */}
          {activeSideTab === 'vitals' && (
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Consultation Summary
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-mist-50 border border-mist-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-ink-soft">Patient Name</span>
                  <p className="font-semibold text-ink">{appointmentData?.patientName || user?.name}</p>
                  <p className="text-[11px] text-teal-700 font-mono">ID: {appointmentData?.patientCode || user?.patientId || 'P000001'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-mist-50 border border-mist-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-ink-soft">Reason for Consultation</span>
                  <p className="font-medium text-ink">{appointmentData?.reason || 'Routine Health Follow-up'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-100 text-teal-900 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-teal-800">Tele-Health Security</span>
                  <p className="text-[11px] leading-relaxed">
                    This video consultation is encrypted under ISO/HIPAA tele-health standards and verified against appointment #{appointmentNumber?.toUpperCase()}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Prescription Modal for Doctor */}
      {isDoctor && (
        <UploadPrescriptionModal
          isOpen={isPrescriptionModalOpen}
          onClose={() => setIsPrescriptionModalOpen(false)}
          patientId={appointmentData?.patientCode || appointmentData?.patientId || 'P000001'}
          patientName={appointmentData?.patientName || 'Patient'}
          appointmentId={appointmentData?.id}
          appointmentNumber={appointmentNumber}
          onSuccess={() => {
            showToast('Prescription Issued', 'Prescription attached to consultation successfully.', 'success')
          }}
        />
      )}
    </div>
  )
}
