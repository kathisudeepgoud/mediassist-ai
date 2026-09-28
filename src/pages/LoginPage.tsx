import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PulseMark } from '@/components/shared/PulseMark'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      showToast('Welcome back', 'Signed in successfully.')
      if (user?.role === 'doctor') {
        navigate('/doctor-dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left showcase panel */}
      <div className="relative hidden overflow-hidden bg-teal-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex items-center gap-2.5 text-white">
          <PulseMark className="h-9 w-9" />
          <span className="font-display text-lg font-semibold text-white">MediAssist AI</span>
        </div>

        <div className="relative max-w-md">
          <Sparkles className="mb-4 h-8 w-8 text-teal-200" />
          <h2 className="font-display text-3xl font-semibold leading-tight text-white">
            Understand your health data in plain language.
          </h2>
          <p className="mt-4 text-teal-100">
            Upload reports, track trends over time, and get personalized clinical nutrition
            guidance — all explained clearly, in one place.
          </p>
        </div>

        <div className="relative flex items-center gap-6 text-sm text-teal-100">
          <div>
            <p className="font-mono text-2xl font-semibold text-white">12k+</p>
            <p>Reports analyzed</p>
          </div>
          <div className="h-8 w-px bg-teal-500" />
          <div>
            <p className="font-mono text-2xl font-semibold text-white">4.8/5</p>
            <p>User satisfaction</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <PulseMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold text-ink">MediAssist AI</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Sign in to view your health dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-teal-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="px-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-100 px-3 py-2 text-xs text-rose-500">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-medium text-teal-600 hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
