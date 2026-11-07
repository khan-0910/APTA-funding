import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBi, T } from '@/lib/lang'
import { HeartHandshake, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Field } from '@/components/ui'
import { CAPTCHA_ON, Captcha } from '@/components/Captcha'
import { EMAIL_RULE_MESSAGE, isAllowedEmail, isStrongPassword, isValidName } from '@/lib/validate'
import type { UserRole } from '@/types'

export function RegisterPage() {
  const bi = useBi()
  const { register, adminExists, user } = useAuth()
  // Privileged roles appear only when an admin exists AND the visitor is signed in
  // (the org admin creating colleagues). register() enforces the same rule server-side
  // of the UI as a backstop.
  // Only a signed-in admin may create staff/admin accounts (the DB enforces it too).
  const canManage = adminExists && user?.role === 'admin'
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [consent, setConsent] = useState(false)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!consent) {
      setError('Please accept the Privacy Policy and Terms / தனியுரிமைக் கொள்கையை ஏற்கவும்.')
      return
    }
    if (!isValidName(name)) {
      setError('Enter your full name using letters only / எழுத்துகளில் முழுப் பெயரை உள்ளிடவும்.')
      return
    }
    if (!isStrongPassword(password)) {
      setError('Password needs at least 8 characters, including a letter and a number / குறைந்தது 8 எழுத்துகள், ஒரு எழுத்தும் ஒரு எண்ணும் தேவை.')
      return
    }
    setBusy(true)
    const emailOk = await isAllowedEmail(email)
    setBusy(false)
    if (!emailOk) {
      setError(EMAIL_RULE_MESSAGE)
      return
    }
    if ((role === 'admin' || role === 'staff') && !canManage) {
      setError('Staff and Admin accounts can only be created by a signed-in Admin / ஊழியர் மற்றும் நிர்வாகி கணக்குகளை நிர்வாகி மட்டுமே உருவாக்க முடியும்.')
      return
    }
    setBusy(true)
    const res = await register(name, email, password, role, captcha ?? undefined)
    setAttempt((n) => n + 1) // CAPTCHA tokens are single-use
    setBusy(false)
    if (res.ok && res.signedIn === false) {
      // Either an admin created a colleague (and stays signed in), or the address must be confirmed first.
      setNotice(
        res.needsConfirmation
          ? 'Account created. A confirmation link has been emailed — it must be opened before signing in. / உறுதிப்படுத்தல் இணைப்பு மின்னஞ்சலில் அனுப்பப்பட்டது.'
          : 'Account created — they can sign in now. / கணக்கு உருவாக்கப்பட்டது.',
      )
      setName('')
      setEmail('')
      setPassword('')
      setRole('student')
      return
    }
    if (res.ok) navigate('/applications')
    else setError(res.error ?? 'Registration failed.')
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="card p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900">
              Register <span className="ta text-amber-600">/ பதிவு செய்யுங்கள்</span>
            </h1>
            <p className="text-xs text-surface-500">Create your APTA Empowers account</p>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Full Name" labelTa="முழுப் பெயர்" required>
            <input className="input-base" required value={name} onChange={(e) => setName(e.target.value)} placeholder="T. Raheetha Banu" />
          </Field>
          <Field label="Email" labelTa="மின்னஞ்சல்" required>
            <input className="input-base" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Password" labelTa="கடவுச்சொல்" required hint="At least 8 characters, with a letter and a number">
            <input className="input-base" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="I am registering as" labelTa="பதிவு செய்யும் வகை" required>
            <select className="input-base" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="student">{bi("Student / மாணவர்")}</option>
              {canManage && <option value="staff">{bi("Staff / ஊழியர்")}</option>}
              {canManage && <option value="admin">{bi("Admin / நிர்வாகி")}</option>}
            </select>
          </Field>
          {!canManage && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Staff and Admin accounts are created by an organisation Admin after signing in.
                <span className="ta block">ஊழியர் மற்றும் நிர்வாகி கணக்குகளை நிர்வாகி உள்நுழைந்த பிறகு உருவாக்குவார்.</span>
              </span>
            </p>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"><T>{error}</T></p>}
          {notice && (
            <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">
              <T>{notice}</T>
            </p>
 )}
          <label className="flex items-start gap-2.5 text-sm text-surface-600">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
            />
            <span>
              I agree to the <Link to="/privacy" className="font-medium text-primary-700 hover:underline">Privacy Policy</Link> and{' '}
              <Link to="/terms" className="font-medium text-primary-700 hover:underline">Terms of Use</Link>. If I am under 18, my parent or
              guardian is completing this with me and consents.
              <span className="ta block text-xs text-surface-500">தனியுரிமைக் கொள்கை மற்றும் விதிமுறைகளை ஏற்கிறேன்.</span>
            </span>
          </label>
          <Captcha key={attempt} onToken={setCaptcha} />
          <button className="btn-primary w-full" disabled={busy || !consent || (CAPTCHA_ON && !captcha)}>
            {busy ? 'Creating account…' : <T>{'Create Account / கணக்கை உருவாக்கு'}</T>}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-surface-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:underline">
            Sign In <span className="ta">/ உள்நுழையுங்கள்</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
