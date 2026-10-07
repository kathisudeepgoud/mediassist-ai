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
  Users,
  Calendar,
  MessageSquare,
  FileText,
} from 'lucide-react'
import { PulseMark } from '@/components/shared/PulseMark'
import { cn } from '@/utils/cn'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/services/api'

const patientNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/trends', label: 'Health Trends', icon: TrendingUp },
  { to: '/risk', label: 'Disease Risk', icon: ShieldAlert },
  { to: '/diet', label: 'Diet Planner', icon: Salad },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/prescriptions', label: 'Prescriptions', icon: FileText },
  { to: '/assistant', label: 'Health Assistant', icon: MessageCircleHeart },
]

const doctorNavItems = [
  { to: '/doctor-dashboard?tab=overview', label: 'Dashboard', icon: LayoutDashboard, tabKey: 'overview' },
  { to: '/doctor-dashboard?tab=appointments', label: 'Appointments', icon: Calendar, tabKey: 'appointments' },
  { to: '/doctor-dashboard?tab=patients', label: 'Patients', icon: Users, tabKey: 'patients' },
  { to: '/messages', label: 'Messages', icon: MessageSquare, exactRoute: true },
  { to: '/doctor-dashboard?tab=reports', label: 'Report', icon: FileText, tabKey: 'reports' },
  { to: '/settings', label: 'Settings', icon: Settings, exactRoute: true },
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
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Active check for doctor tabs
  const currentTab = new URLSearchParams(location.search).get('tab') || 'overview'

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-mist-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <PulseMark className="h-8 w-8 text-teal-600" />
          <div>
            <p className="font-display text-base font-bold leading-none text-ink">Mind Care.</p>
            <p className="mt-1 text-[11px] text-ink-soft">{isDoctor ? 'Doctor Portal' : 'MedAssist AI'}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-mist-100 lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        {navItems.map((item: any) => {
          const { to, label, icon: Icon, tabKey, exactRoute } = item
          let isSelected = false

          if (isDoctor) {
            if (exactRoute) {
              isSelected = location.pathname === to
            } else if (location.pathname.startsWith('/doctor-dashboard')) {
              isSelected = (currentTab === tabKey) || (tabKey === 'overview' && !currentTab)
            }
          } else {
            if (to === '/reports') {
              isSelected = location.pathname.startsWith('/reports') || location.pathname.startsWith('/upload')
            } else {
              isSelected = location.pathname === to
            }
          }

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={
                cn(
                  'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-teal-50 text-teal-700 font-semibold shadow-xs'
                    : 'text-[#64748B] hover:bg-mist-50 hover:text-ink'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4', isSelected ? 'text-teal-700' : 'text-[#64748B]')} />
                <span>{label}</span>
              </div>
              {tabKey === 'reports' && unreadAlerts > 0 && (
                <span className="flex h-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white shadow-xs">
                  {unreadAlerts}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>



      {/* User info at bottom */}
      <div className="flex items-center justify-between border-t border-mist-200 px-4 py-3 mt-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 border border-slate-200">
            <AvatarFallback className="text-xs bg-teal-50 text-teal-700 font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{displayName}</p>
            <p className="truncate text-[10px] font-mono text-slate-500">{isDoctor ? `Dr. ${idCode}` : `ID: ${idCode}`}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
