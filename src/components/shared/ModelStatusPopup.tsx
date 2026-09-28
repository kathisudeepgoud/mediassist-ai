import { useEffect, useState } from 'react'
import { Cpu, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react'
import { api } from '@/services/api'
import { cn } from '@/utils/cn'

type ModelStatusState = 'loading' | 'ready' | 'error'

export function ModelStatusPopup() {
  const [status, setStatus] = useState<ModelStatusState>('loading')
  const [message, setMessage] = useState<string>('Initializing AI Model...')
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [dismissed, setDismissed] = useState<boolean>(false)

  const checkStatus = async () => {
    try {
      const res = await api.getModelStatus()
      if (res && res.is_ready) {
        setStatus('ready')
        setMessage(res.message || 'AI Model loaded successfully')
      } else if (res && res.model_status === 'loading') {
        setStatus('loading')
        setMessage(res.message || 'Loading AI embedding model into memory...')
      } else {
        setStatus('error')
        setMessage(res?.message || 'Model service not responding')
      }
    } catch {
      // Backend unavailable or initializing
      setStatus('loading')
      setMessage('Waiting for backend model service...')
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const runCheck = async () => {
      await checkStatus()
    }

    runCheck()

    // Poll only if not ready
    if (status !== 'ready') {
      interval = setInterval(() => {
        checkStatus()
      }, 5000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status])

  // Auto-collapse 3 seconds after model becomes ready
  useEffect(() => {
    if (status === 'ready') {
      const timer = setTimeout(() => {
        setIsCollapsed(true)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setIsCollapsed(false)
    }
  }, [status])

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-teal-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-lg backdrop-blur-md transition-all hover:bg-teal-50 hover:shadow-xl"
        title="Check AI Model Status"
      >
        <Cpu className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
        <span>AI Model Status</span>
      </button>
    )
  }

  // Collapsed Pill View (Bottom Right Corner)
  if (isCollapsed && status === 'ready') {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 rounded-full border border-teal-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur-md transition-all hover:bg-teal-50 hover:border-teal-300 hover:shadow-xl"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
          </span>
          <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
          <span>AI Model Ready</span>
          <ChevronUp className="h-3 w-3 text-slate-400" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-50 w-80 rounded-2xl border bg-white/95 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-rise text-slate-800',
        status === 'loading'
          ? 'border-teal-200 shadow-teal-900/5'
          : status === 'ready'
          ? 'border-emerald-200 shadow-emerald-900/5'
          : 'border-rose-200 shadow-rose-900/5'
      )}
    >
      {/* Header bar matching MedAssist UI */}
      <div className="flex items-center justify-between border-b border-mist-100 px-4 py-2.5 bg-mist-50/50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          {status === 'loading' ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-600"></span>
            </span>
          ) : status === 'ready' ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
          ) : (
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
            </span>
          )}
          <Cpu className="h-4 w-4 text-teal-600" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-700">
            {status === 'loading' ? 'Model Loading' : status === 'ready' ? 'Model Loaded' : 'Model Status'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => checkStatus()}
            className="rounded-lg p-1 text-slate-400 hover:bg-mist-200/60 hover:text-slate-700 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="rounded-lg p-1 text-slate-400 hover:bg-mist-200/60 hover:text-slate-700 transition-colors"
            title="Minimize"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-slate-400 hover:bg-mist-200/60 hover:text-slate-700 transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {status === 'loading' ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            </div>
          ) : status === 'ready' ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
          )}

          <div className="space-y-1">
            <h4 className="font-display text-sm font-semibold leading-tight text-slate-900">
              {status === 'loading'
                ? 'AI Model Loading...'
                : status === 'ready'
                ? 'Model Loaded Successfully'
                : 'Model Initialization'}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {status === 'loading' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-teal-50/70 border border-teal-100 px-3 py-2 text-[11px] font-medium text-teal-900">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-teal-600" />
            <span>Please wait for model loading before uploading PDF for best extraction results.</span>
          </div>
        )}
      </div>
    </div>
  )
}
