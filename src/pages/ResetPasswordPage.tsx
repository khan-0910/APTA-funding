import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Field } from '@/components/ui'

/**
 * Lands here from the password-reset email link (?type=recovery&... appended by
 * Supabase). Supabase Auth's detectSessionInUrl exchanges the token in the URL
 * fragment for a session on boot, after which updateUser({ password }) works.
 */
export function ResetPasswordPage() {
  const { updatePassword, isSupabaseAuthed, isAuthReady } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isAuthReady && !isSupabaseAuthed) {
      setError('This reset link is invalid or has expired. Request a new one from the sign-in page / இந்த இணைப்பு காலாவதியானது — புதிய இணைப்பைப் பெறுங்கள்.')
    }
  }, [isAuthReady, isSupabaseAuthed])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters / கடவுச்சொல் குறைந்தது 6 எழுத்துகள்.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match / கடவுச்சொற்கள் பொருந்தவில்லை.')
      return
    }
    setBusy(true)
    const res = await updatePassword(password)
    setBusy(false)
    if (res.ok) setDone(true)
    else setError(res.error ?? 'Could not update password.')
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="glass-card p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
              Set a new password <span className="ta text-primary-600 dark:text-primary-400">/ புதிய கடவுச்சொல்</span>
            </h1>
            <p className="text-xs text-surface-500 dark:text-surface-400">Choose a password of at least 6 characters</p>
          </div>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              Password updated / கடவுச்சொல் புதுப்பிக்கப்பட்டது.
            </p>
            <button className="btn-primary w-full" onClick={() => navigate('/login')}>
              Continue to Sign In / உள்நுழைவுக்கு
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <Field label="New password" labelTa="புதிய கடவுச்சொல்" required>
              <input className="input-base" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="Confirm password" labelTa="கடவுச்சொல்லை உறுதிசெய்" required>
              <input className="input-base" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Updating…' : 'Update Password / புதுப்பிக்க'}
            </button>
            <p className="text-center text-sm text-surface-500 dark:text-surface-400">
              <Link to="/login" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
                Back to Sign In / <span className="ta">உள்நுழைவு</span>
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
