import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Field } from '@/components/ui'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await signIn(email, password)
    setBusy(false)
    if (res.ok) navigate('/applications')
    else setError(res.error ?? 'Sign in failed.')
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="glass-card p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
              Sign In <span className="ta text-primary-600 dark:text-primary-400">/ உள்நுழைவு</span>
            </h1>
            <p className="text-xs text-surface-500 dark:text-surface-400">APTA Empowers staff & student portal</p>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Email" labelTa="மின்னஞ்சல்" required>
            <input className="input-base" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Password" labelTa="கடவுச்சொல்" required>
            <input className="input-base" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In / உள்நுழை'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-surface-500 dark:text-surface-400">
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
            Register / <span className="ta">பதிவு செய்யுங்கள்</span>
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-surface-400 dark:text-surface-500">
          Accounts are created by you — register as Student, Staff, or Admin to begin.
          <span className="ta block">கணக்குகளை நீங்களே உருவாக்கலாம் — மாணவர், ஊழியர் அல்லது நிர்வாகியாக பதிவு செய்யுங்கள்.</span>
        </p>
      </div>
    </div>
  )
}
