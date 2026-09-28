import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  History,
  TrendingUp,
  ShieldAlert,
  Salad,
  MessageCircleHeart,
  Settings,
  User,
  LogOut,
  X,
  Stethoscope,
  Search,
  Bell,
} from 'lucide-react'
import { PulseMark } from '@/components/shared/PulseMark'
import { cn } from '@/utils/cn'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/services/api'

const patientNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Report Upload', icon: Upload },
  { to: '/reports', label: 'Report History', icon: History },
  { to: '/trends', label: 'Health Trends', icon: TrendingUp },
  { to: '/risk', label: 'Disease Risk', icon: ShieldAlert },
  { to: '/diet', label: 'Diet Planner', icon: Salad },
  { to: '/assistant', label: 'Health Assistant', icon: MessageCircleHeart },
]

const doctorNavItems = [
  { to: '/doctor-dashboard', label: 'Doctor Dashboard', icon: LayoutDashboard, hasBadge: true },
]

const bottomItems = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0)

  const displayName = user?.name || 'User'
  const isDoctor = user?.role === 'doctor'
  const navItems = isDoctor ? doctorNavItems : patientNavItems

  useEffect(() => {
    if (isDoctor) {
      api.getDoctorStats()
        .then((res) => {
          if (res && typeof res.newAlerts === 'number') {
            setUnreadAlerts(res.newAlerts)
          }
        })
        .catch(() => {})
    }
  }, [isDoctor, location.pathname, location.search])

  const idCode = isDoctor 
    ? (user?.doctorId || (user as any)?.doctor_id || 'D000001')
    : (user?.patientId || (user as any)?.patient_id || 'P000001')

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-mist-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <PulseMark className="h-8 w-8" />
          <div>
            <p className="font-display text-sm font-semibold leading-none text-ink">MediAssist AI</p>
            <p className="mt-1 text-[11px] text-ink-soft">{isDoctor ? 'Doctor Portal' : 'Your health, understood'}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-mist-100 lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon, hasBadge }: any) => {
          const isSelected = isDoctor
            ? location.pathname.startsWith('/doctor-dashboard')
            : location.pathname === to

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={
                cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isSelected ? 'bg-teal-50 text-teal-700' : 'text-ink-soft hover:bg-mist-100 hover:text-ink'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </div>
              {hasBadge && unreadAlerts > 0 && (
                <span className="flex h-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white shadow-xs">
                  {unreadAlerts}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-mist-200 px-3 py-3">
        {bottomItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-teal-50 text-teal-700' : 'text-ink-soft hover:bg-mist-100 hover:text-ink'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-rose-100 hover:text-rose-500"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      <div className="flex items-center gap-2.5 border-t border-mist-200 px-4 py-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink">{displayName}</p>
          <p className="truncate text-[11px] font-mono text-teal-600 font-medium">{isDoctor ? `Doctor ID: ${idCode}` : `Patient ID: ${idCode}`}</p>
        </div>
      </div>
    </aside>
  )
}
