import { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  Send,
  User,
  Search,
  CheckCheck,
  RotateCw,
  Stethoscope,
  Clock,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

export default function MessagesPage() {
  const { user } = useAuth()
  const isDoctor = (user?.role || '').toLowerCase() === 'doctor'

  const [conversations, setConversations] = useState<any[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load conversations list
  const loadConversations = async (autoSelect = true) => {
    setConversationsLoading(true)
    try {
      const res = await api.getConversations()
      const list = res.conversations || []
      setConversations(list)

      if (autoSelect && list.length > 0 && !selectedPartner) {
        setSelectedPartner(list[0].partner)
      }
    } catch {
      /* ignore */
    } finally {
      setConversationsLoading(false)
    }
  }

  // Load messages for selected partner
  const loadMessages = async (partnerId: string) => {
    setMessagesLoading(true)
    setError(null)
    try {
      const res = await api.getMessageThread(partnerId)
      setMessages(res.messages || [])
      setTimeout(scrollToBottom, 100)
    } catch (err: any) {
      setError(err.message || 'Unable to load message thread.')
    } finally {
      setMessagesLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedPartner?.id) {
      loadMessages(selectedPartner.id)
    }
  }, [selectedPartner?.id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedPartner?.id || sending) return

    const messageText = newMessage.trim()
    setSending(true)
    try {
      const res = await api.sendMessage(selectedPartner.id, messageText)
      setNewMessage('')
      setMessages((prev) => [...prev, res.data])
      setTimeout(scrollToBottom, 50)
      // Refresh conversations list in background
      loadConversations(false)
    } catch (err: any) {
      setError(err.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    // If current user is a patient, strictly only show registered doctors
    if (!isDoctor && c.partner?.role && c.partner.role.toLowerCase() !== 'doctor') {
      return false
    }
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.partner?.name?.toLowerCase().includes(q) ||
      c.partner?.patientId?.toLowerCase().includes(q) ||
      c.partner?.doctorId?.toLowerCase().includes(q) ||
      c.partner?.specialization?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={['MediAssist AI', 'Messages']}
        title={isDoctor ? 'Doctor Clinical Chat' : 'Chat with Registered Doctors'}
        description={
          isDoctor
            ? 'Secure, persistent text-based consultations with your authorized roster of patients.'
            : 'Directly communicate with verified and registered medical doctors.'
        }
      />

      {/* Main Chat Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[520px]">
        {/* Left: Conversation List (4 cols) */}
        <div className="md:col-span-4 flex flex-col rounded-2xl bg-white border border-mist-200 shadow-xs overflow-hidden h-full">
          {/* Search Header */}
          <div className="p-3.5 border-b border-mist-100 bg-mist-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-xs text-ink uppercase tracking-wider">
                {isDoctor ? 'My Patients Chat' : 'Registered Doctors'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadConversations(false)}
                className="h-7 w-7 p-0 text-ink-soft hover:text-ink"
                title="Refresh conversations"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isDoctor ? "Search patients..." : "Search registered doctors..."}
                className="pl-8 text-xs h-8 bg-white"
              />
            </div>
          </div>

          {/* Conversation List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-mist-100">
            {conversationsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3.5 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const partner = conv.partner
                const isSelected = selectedPartner?.id === partner.id
                const initials = partner.name
                  ? partner.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                  : 'U'

                return (
                  <div
                    key={partner.id}
                    onClick={() => setSelectedPartner(partner)}
                    className={cn(
                      'flex items-start gap-3 p-3.5 cursor-pointer transition-colors',
                      isSelected ? 'bg-teal-50/80 border-l-4 border-l-teal-600' : 'hover:bg-mist-50/70 bg-white'
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs bg-teal-100 text-teal-800 font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-xs text-ink truncate">
                          {isDoctor ? partner.name : `Dr. ${partner.name}`}
                        </p>
                        {conv.latestMessage?.createdAt && (
                          <span className="text-[10px] text-ink-soft shrink-0">
                            {new Date(conv.latestMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-teal-700 font-mono">
                        {partner.patientId ? `ID: ${partner.patientId}` : partner.specialization || 'Doctor'}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-ink-soft truncate leading-tight">
                          {conv.latestMessage?.message || 'No messages yet. Click to start.'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-ink-soft">
                <MessageSquare className="mx-auto h-8 w-8 text-mist-300 mb-2" />
                <p className="text-xs font-semibold text-ink">No conversations</p>
                <p className="text-[11px] mt-0.5">
                  {isDoctor
                    ? 'Add patients in My Patients tab or receive bookings to start messaging.'
                    : 'No registered doctors available for direct messaging yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Chat Area (8 cols) */}
        <div className="md:col-span-8 flex flex-col rounded-2xl bg-white border border-mist-200 shadow-xs overflow-hidden h-full">
          {selectedPartner ? (
            <>
              {/* Chat Partner Top Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-mist-100 bg-gradient-to-r from-teal-50/60 to-transparent">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs bg-teal-600 text-white font-bold">
                      {selectedPartner.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                      {isDoctor ? selectedPartner.name : `Dr. ${selectedPartner.name}`}
                      <Badge variant="outline" className="text-[10px] font-mono text-teal-700 bg-teal-50 border-teal-200">
                        {selectedPartner.patientId ? `Patient ID: ${selectedPartner.patientId}` : (selectedPartner.doctorId ? `Dr. ${selectedPartner.doctorId} • Registered Doctor` : 'Registered Doctor')}
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-ink-soft">
                      {selectedPartner.specialization || (selectedPartner.age ? `${selectedPartner.age} yrs • ${selectedPartner.gender || ''}` : 'Authorized Medical Consultation')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-mist-50/30">
                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {messagesLoading ? (
                  <div className="space-y-3 py-4">
                    <Skeleton className="h-10 w-48 rounded-xl" />
                    <Skeleton className="h-12 w-64 rounded-xl ml-auto" />
                    <Skeleton className="h-10 w-56 rounded-xl" />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={cn('flex flex-col max-w-[78%] animate-rise', isMe ? 'ml-auto items-end' : 'mr-auto items-start')}
                      >
                        <div
                          className={cn(
                            'p-3 rounded-2xl text-xs leading-relaxed shadow-xs',
                            isMe
                              ? 'bg-[#0F766E] text-white rounded-br-xs'
                              : 'bg-white text-ink border border-mist-200 rounded-bl-xs'
                          )}
                        >
                          {msg.message}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-ink-soft px-1">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCheck className={cn('h-3 w-3', msg.isRead ? 'text-teal-600' : 'text-ink-soft')} />}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-16 text-center text-ink-soft">
                    <MessageSquare className="mx-auto h-10 w-10 text-mist-300 mb-2" />
                    <p className="text-xs font-semibold text-ink">Start the Conversation</p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Type a message below to communicate directly with{' '}
                      {isDoctor ? selectedPartner.name : `Dr. ${selectedPartner.name}`}.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bottom Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-mist-100 bg-white flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Write message to ${selectedPartner.name}...`}
                  className="text-xs h-10 flex-1 bg-mist-50/50"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-[#0F766E] hover:bg-[#0B5A54] text-white text-xs h-10 px-4 shrink-0 shadow-sm"
                >
                  {sending ? <RotateCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-soft">
              <MessageSquare className="h-12 w-12 text-mist-300 mb-3" />
              <h4 className="font-display font-semibold text-base text-ink">Select a Conversation</h4>
              <p className="text-xs text-ink-soft mt-1 max-w-sm">
                Choose a doctor or patient from the left panel to open their authorized communication channel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
