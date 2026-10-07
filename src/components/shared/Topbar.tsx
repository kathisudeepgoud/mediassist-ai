import { Menu, Bell, CheckCircle2, Info, AlertTriangle, CheckCheck, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast, type ToastVariant } from '@/context/ToastContext'
import { cn } from '@/utils/cn'
import { GlobalSearchBar } from '@/components/dashboard/GlobalSearchBar'

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 10) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

const variantIconMap: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />,
  info: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  danger: <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />,
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } = useToast()

  const displayName = user?.name || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="relative z-50 flex items-center gap-3 border-b border-mist-200 bg-white px-4 py-3 sm:px-6 shadow-xs">
      <button onClick={onMenuClick} className="rounded-md p-2 text-ink-soft hover:bg-mist-100 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <GlobalSearchBar />

      <div className="ml-auto flex items-center gap-2">
        {/* Top-Right Notification Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative outline-none" aria-label="Notifications">
              <Bell className={cn('h-5 w-5 text-ink-soft hover:text-ink transition-colors', unreadCount > 0 && 'text-teal-700 animate-pulse')} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-mist-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-mist-100 bg-mist-50/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold text-ink">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Read all
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-soft hover:bg-mist-200 hover:text-rose-600"
                    title="Clear all notifications"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-mist-100">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markAsRead(n.id)}
                    className={cn(
                      'group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-mist-50',
                      !n.read ? 'bg-teal-50/40' : 'bg-white'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{variantIconMap[n.variant]}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-xs font-semibold leading-snug', !n.read ? 'text-ink' : 'text-ink-soft')}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-ink-soft">
                          {formatTimeAgo(n.timestamp)}
                        </span>
                      </div>
                      {n.description && (
                        <p className="mt-0.5 text-xs text-ink-soft line-clamp-2 leading-relaxed">
                          {n.description}
                        </p>
                      )}
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeNotification(n.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-ink-soft hover:text-rose-500 rounded transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-ink-soft">
                  <Bell className="mx-auto h-8 w-8 text-mist-300 mb-2" />
                  <p className="text-xs font-medium">No notifications</p>
                  <p className="text-[11px] text-ink-soft/70 mt-0.5">Notifications for uploads, updates, and deletes appear here</p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full p-1 pl-2 outline-none hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-teal-200 cursor-pointer">
            <Avatar className="h-9 w-9 border border-slate-200 shadow-xs">
              <AvatarFallback className="bg-teal-50 text-teal-700 text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col text-left pr-1.5">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user?.role === 'doctor' && !displayName.toLowerCase().startsWith('dr') ? `Dr. ${displayName}` : displayName}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">
                {user?.role === 'doctor' ? ((user as any)?.specialization || 'Psychotherapist') : 'Patient'}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-100">
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="text-rose-500 focus:bg-rose-100 focus:text-rose-500 cursor-pointer"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
