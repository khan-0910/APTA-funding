import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, KeyRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Field } from '@/components/ui'

export function LoginPage() {
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await signIn(email, password)
    setBusy(false)
    if (res.ok) navigate('/applications')
    else setError(res.error ?? 'Sign in failed.')
  }

  const sendReset = async () => {
    setError('')
    if (!email.trim()) {
      setError('Enter your email above first, then tap “Forgot password?” / முதலில் மின்னஞ்சலை உள்ளிடுங்கள்.')
      return
    }
    setResetBusy(true)
    const res = await resetPassword(email)
    setResetBusy(false)
    if (res.ok) setResetSent(true)
    else setError(res.error ?? 'Could not send reset email.')
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
          {resetSent && (
            <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              Reset link sent — check your email / மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டது — மின்னஞ்சலை சரிபார்க்கவும்.
            </p>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In / உள்நுழை'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void sendReset()}
          disabled={resetBusy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm text-surface-500 hover:text-primary-600 disabled:opacity-50 dark:text-surface-400 dark:hover:text-primary-400"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {resetBusy ? 'Sending…' : 'Forgot password? / கடவுச்சொல் மறந்ததா?'}
        </button>

        <p className="mt-4 text-center text-sm text-surface-500 dark:text-surface-400">
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
            Register / <span className="ta">பதிவு செய்யுங்கள்</span>
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-surface-400 dark:text-surface-500">
          Students register here; Staff and Admin accounts are created by the organisation's Admin.
          <span className="ta block">மாணவர்கள் இங்கே பதிவு செய்யலாம்; ஊழியர் மற்றும் நிர்வாகி கணக்குகளை நிர்வாகி உருவாக்குவார்.</span>
        </p>
      </div>
    </div>
  )
}
