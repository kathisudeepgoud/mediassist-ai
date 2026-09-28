import { useNavigate } from 'react-router-dom'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PulseMark } from '@/components/shared/PulseMark'

export default function ErrorPage({ code = '404', message = "We couldn't find the page you're looking for." }: { code?: string; message?: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mist-50 px-6 text-center">
      <div className="mb-6 flex items-center gap-2.5">
        <PulseMark className="h-8 w-8" />
        <span className="font-display text-lg font-semibold text-ink">MediAssist AI</span>
      </div>

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 animate-rise">
        <AlertOctagon className="h-8 w-8" />
      </div>
      <p className="mt-5 font-mono text-sm font-medium text-ink-soft">Error {code}</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Something went off track</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">{message}</p>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw className="h-4 w-4" /> Retry
        </Button>
        <Button onClick={() => { try { navigate('/dashboard') } catch { window.location.href = '/dashboard' } }}>
          <Home className="h-4 w-4" /> Return Home
        </Button>
      </div>
    </div>
  )
}
