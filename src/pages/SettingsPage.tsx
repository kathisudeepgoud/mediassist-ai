import { useState } from 'react'
import { Sun, Moon, Monitor, Lock } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/utils/cn'

const appearanceOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()
  const [dataSharing, setDataSharing] = useState(true)

  return (
    <div>
      <PageHeader crumbs={['MediAssist AI', 'Settings']} title="Settings" description="Manage your appearance, privacy, and account preferences." />

      <div className="space-y-6">
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how MediAssist AI looks on your device</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {appearanceOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value)
                  showToast('Theme updated', `Switched to ${label} mode.`)
                }}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-5 transition-colors',
                  theme === value ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/40 dark:border-teal-500' : 'border-mist-200 hover:bg-mist-50 dark:hover:bg-slate-800'
                )}
              >
                <Icon className={cn('h-6 w-6', theme === value ? 'text-teal-600 dark:text-teal-400' : 'text-ink-soft')} />
                <span className={cn('text-sm font-semibold', theme === value ? 'text-teal-700 dark:text-teal-300' : 'text-ink')}>{label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="animate-rise">
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>Control how your health data is used</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-mist-200 p-4">
              <div>
                <Label htmlFor="data-sharing">Data Sharing</Label>
                <p className="mt-0.5 text-xs text-ink-soft">Share anonymized data to help improve health insights</p>
              </div>
              <Switch
                id="data-sharing"
                checked={dataSharing}
                onCheckedChange={(v) => {
                  setDataSharing(v)
                  showToast(v ? 'Data sharing enabled' : 'Data sharing disabled')
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-rise">
          <CardHeader>
            <CardTitle>Account Security</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Lock className="h-4 w-4" /> Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Update your account password.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input id="current-password" type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <Input id="new-password" type="password" placeholder="••••••••" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => showToast('Password updated', 'Your password has been changed.')}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
