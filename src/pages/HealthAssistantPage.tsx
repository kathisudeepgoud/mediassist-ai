import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Sparkles, HeartPulse, Trash2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { suggestedQuestions, createWelcomeMessage } from '@/data/chat'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import type { ChatMessage } from '@/types'
import { cn } from '@/utils/cn'

interface ExtendedChatMessage extends ChatMessage {
  isEmergency?: boolean
  model?: string
}

function nowLabel() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function HealthAssistantPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [aiStatus, setAiStatus] = useState<{ available: boolean; model: string; error?: string } | null>(null)
  const [checkingAi, setCheckingAi] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const checkAiHealth = useCallback(async () => {
    setCheckingAi(true)
    try {
      const res = await api.getAiHealth()
      setAiStatus({
        available: res.available,
        model: res.model || 'gemini-3.6-flash',
        error: res.error,
      })
    } catch {
      setAiStatus({
        available: false,
        model: 'gemini-3.6-flash',
        error: 'Unable to connect to backend Gemini AI service',
      })
    } finally {
      setCheckingAi(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await api.getChatHistory()
      if (res.messages && res.messages.length > 0) {
        setMessages(
          res.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : nowLabel(),
          }))
        )
      } else {
        setMessages([createWelcomeMessage(user?.name)])
      }
    } catch {
      setMessages([createWelcomeMessage(user?.name)])
    } finally {
      setLoadingHistory(false)
    }
  }, [user?.name])

  useEffect(() => {
    checkAiHealth()
    loadHistory()
  }, [checkAiHealth, loadHistory])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim()
    if (!text || typing) return

    setErrorMessage(null)
    const userMsg: ExtendedChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: nowLabel(),
    }

    const assistantMsgId = `a-${Date.now()}`
    const placeholderAssistantMsg: ExtendedChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: nowLabel(),
    }

    setMessages((prev) => [...prev, userMsg, placeholderAssistantMsg])
    if (textToSend === undefined) {
      setInput('')
    }
    setTyping(true)

    try {
      await api.streamChatMessage(
        text,
        (tokenDelta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + tokenDelta }
                : msg
            )
          )
        },
        (completeData) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: completeData.fullText || msg.content,
                    model: completeData.model,
                    isEmergency: completeData.isEmergency,
                  }
                : msg
            )
          )
          setTyping(false)
        },
        async (streamErr) => {
          console.warn('[Stream fallback to standard chat]', streamErr.message)
          // Fallback to standard chat request if streaming fails
          try {
            const fallbackRes = await api.sendChatMessage(text)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: fallbackRes.message,
                      model: fallbackRes.model,
                      isEmergency: fallbackRes.isEmergency,
                    }
                  : msg
              )
            )
          } catch (err: any) {
            const fallbackReply = err.message || 'Error reaching the Health Assistant. Please check Gemini API configuration.'
            setErrorMessage(fallbackReply)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: `⚠️ ${fallbackReply}`,
                    }
                  : msg
              )
            )
          } finally {
            setTyping(false)
          }
        }
      )
    } catch (err: any) {
      const fallbackReply = err.message || 'Error reaching the Health Assistant. Please check Gemini API configuration.'
      setErrorMessage(fallbackReply)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `⚠️ ${fallbackReply}` }
            : msg
        )
      )
      setTyping(false)
    }
  }

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your conversation history?')) return
    setClearing(true)
    try {
      await api.clearChatHistory()
      setMessages([createWelcomeMessage(user?.name)])
      setErrorMessage(null)
    } catch (err: any) {
      alert(err.message || 'Failed to clear chat history')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          crumbs={['MediAssist AI', 'Health Assistant']}
          title="Health Assistant"
          description="Ask questions about your lab reports, vital trends, or personalized diet guidance."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            disabled={clearing || loadingHistory}
            className="h-8 gap-1.5 text-xs text-ink-soft hover:text-rose-600"
            title="Clear Chat History"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </Button>
        </div>
      </div>

      {aiStatus && !aiStatus.available && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Gemini AI is currently unavailable:</strong> {aiStatus.error || 'Please configure GEMINI_API_KEY in server/.env to enable AI responses.'}
            </span>
          </div>
          <button
            onClick={checkAiHealth}
            disabled={checkingAi}
            className="font-semibold underline hover:text-amber-950 ml-2"
          >
            Retry Connection
          </button>
        </div>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden border-mist-200 shadow-sm animate-rise">
        {/* Chat Messages Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <RefreshCw className="h-4 w-4 animate-spin text-teal-600" />
                Loading conversation history...
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex items-end gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && (
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-xs',
                      m.isEmergency
                        ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300'
                        : 'bg-teal-100 text-teal-700'
                    )}
                  >
                    {m.isEmergency ? <AlertTriangle className="h-4 w-4" /> : <HeartPulse className="h-4 w-4" />}
                  </span>
                )}

                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed animate-rise shadow-xs',
                    m.role === 'user'
                      ? 'rounded-br-sm bg-teal-600 text-white'
                      : m.isEmergency
                      ? 'rounded-bl-sm border border-rose-200 bg-rose-50 text-rose-950'
                      : 'rounded-bl-sm border border-mist-200 bg-mist-50/70 text-ink'
                  )}
                >
                  {m.isEmergency && (
                    <div className="mb-2 flex items-center gap-1.5 font-semibold text-rose-700 text-xs uppercase tracking-wide border-b border-rose-200 pb-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Urgent Medical Attention Notice
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{m.content}</div>

                  <div
                    className={cn(
                      'mt-2 flex items-center justify-between gap-3 text-[10px]',
                      m.role === 'user' ? 'text-teal-100' : 'text-ink-soft'
                    )}
                  >
                    <span>{m.timestamp}</span>
                    {m.role === 'assistant' && (
                      <span className="flex items-center gap-1 opacity-75">
                        <ShieldCheck className="h-3 w-3" />
                        {m.model ? `${m.model} (Local)` : 'MediAssist AI'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {typing && (
            <div className="flex items-end gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <HeartPulse className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-mist-200 bg-mist-50/80 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600" />
                <span className="ml-2 text-xs text-ink-soft">Analyzing with local AI...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input & Suggested Prompts Bar */}
        <div className="border-t border-mist-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={typing}
                className="flex items-center gap-1.5 rounded-full border border-mist-200 bg-mist-50/50 px-3 py-1.5 text-xs font-medium text-ink-soft transition-all hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3 text-teal-600" /> {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your lab reports, vital trends, or diet plan..."
              aria-label="Message"
              disabled={typing}
              className="border-mist-300 focus-visible:ring-teal-500"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || typing}
              aria-label="Send message"
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              100% Local Inference &amp; Zero Cloud Data Sharing. For informational purposes only.
            </span>
            {errorMessage && (
              <button
                onClick={() => send()}
                className="font-medium text-teal-700 hover:underline"
              >
                Retry last prompt
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
