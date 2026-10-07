import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartHandshake, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Field } from '@/components/ui'
import type { UserRole } from '@/types'

export function RegisterPage() {
  const { register, adminExists, user } = useAuth()
  // Privileged roles appear only when an admin exists AND the visitor is signed in
  // (the org admin creating colleagues). register() enforces the same rule server-side
  // of the UI as a backstop.
  const canManage = adminExists && !!user
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters / கடவுச்சொல் குறைந்தது 6 எழுத்துகள்.')
      return
    }
    if ((role === 'admin' || role === 'staff') && !canManage) {
      setError('Staff and Admin accounts can only be created by a signed-in Admin / ஊழியர் மற்றும் நிர்வாகி கணக்குகளை நிர்வாகி மட்டுமே உருவாக்க முடியும்.')
      return
    }
    setBusy(true)
    const res = await register(name, email, password, role)
    setBusy(false)
    if (res.ok) navigate('/applications')
    else setError(res.error ?? 'Registration failed.')
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="glass-card p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
              Register <span className="ta text-primary-600 dark:text-primary-400">/ பதிவு செய்யுங்கள்</span>
            </h1>
            <p className="text-xs text-surface-500 dark:text-surface-400">Create your APTA Empowers account</p>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Full Name" labelTa="முழுப் பெயர்" required>
            <input className="input-base" required value={name} onChange={(e) => setName(e.target.value)} placeholder="T. Raheetha Banu" />
          </Field>
          <Field label="Email" labelTa="மின்னஞ்சல்" required>
            <input className="input-base" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Password" labelTa="கடவுச்சொல்" required hint="Minimum 6 characters">
            <input className="input-base" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="I am registering as" labelTa="பதிவு செய்யும் வகை" required>
            <select className="input-base" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="student">Student / மாணவர்</option>
              {canManage && <option value="staff">Staff / ஊழியர்</option>}
              {canManage && <option value="admin">Admin / நிர்வாகி</option>}
            </select>
          </Field>
          {!canManage && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Staff and Admin accounts are created by an organisation Admin after signing in.
                <span className="ta block">ஊழியர் மற்றும் நிர்வாகி கணக்குகளை நிர்வாகி உள்நுழைந்த பிறகு உருவாக்குவார்.</span>
              </span>
            </p>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating account…' : 'Create Account / கணக்கை உருவாக்கு'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-surface-500 dark:text-surface-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
            Sign In / <span className="ta">உள்நுழையுங்கள்</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
