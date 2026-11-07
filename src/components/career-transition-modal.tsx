import { useState, type ChangeEvent } from 'react'
import { Briefcase, GraduationCap, Landmark, Rocket, Search } from 'lucide-react'
import type { Beneficiary, CareerStatus, CareerTransitionSurvey } from '@/types'
import { useStore } from '@/lib/store'
import { T } from '@/lib/lang'
import { checkUpload, storeFile } from '@/lib/persistence'
import { Modal, Field, Bi } from './ui'

const OPTIONS: Array<{
  value: CareerStatus
  en: string
  ta: string
  icon: typeof Briefcase
  desc: string
}> = [
  {
    value: 'already_employed',
    en: 'Already Got a Job',
    ta: 'ஏற்கனவே வேலை கிடைத்துவிட்டது',
    icon: Briefcase,
    desc: 'Share your offer details',
  },
  {
    value: 'seeking_job',
    en: 'Need Help Finding a Job',
    ta: 'வேலை தேட உதவி தேவை',
    icon: Search,
    desc: 'Career placement assistance',
  },
  {
    value: 'higher_studies',
    en: 'Pursuing Higher Studies (PG)',
    ta: 'மேற்படிப்பு தொடர திட்டம்',
    icon: GraduationCap,
    desc: 'M.E., MBA, M.Com…',
  },
  {
  value: 'preparing_govt_exams',
    en: 'Govt / Competitive Exam Prep',
    ta: 'அரசுப் பணித் தேர்வு தயாரிப்பு',
    icon: Landmark,
    desc: 'TNPSC, SSC, Banking…',
  },
  {
    value: 'entrepreneurship',
    en: 'Starting a Business',
    ta: 'சொந்த தொழில் தொடங்கும் திட்டம்',
    icon: Rocket,
    desc: 'Self-employment venture',
  },
]

export function CareerTransitionModal({
  open,
  onClose,
  beneficiary,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  beneficiary: Beneficiary | null
  onSaved?: () => void
}) {
  const store = useStore()
  const [status, setStatus] = useState<CareerStatus | ''>('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [workLocation, setWorkLocation] = useState('')
  const [monthlySalary, setMonthlySalary] = useState('')
  const [offerFile, setOfferFile] = useState<File | null>(null)
  const [preferredRoles, setPreferredRoles] = useState('')
  const [preferredLocations, setPreferredLocations] = useState('')
  const [expectedSalary, setExpectedSalary] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [connectWithMentors, setConnectWithMentors] = useState(true)
  const [higherStudiesProgram, setHigherStudiesProgram] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!beneficiary) return null

  const reset = () => {
    setStatus('')
    setCompanyName('')
    setJobTitle('')
    setWorkLocation('')
    setMonthlySalary('')
    setOfferFile(null)
    setPreferredRoles('')
    setPreferredLocations('')
    setExpectedSalary('')
    setResumeFile(null)
    setConnectWithMentors(true)
    setHigherStudiesProgram('')
    setNotes('')
    setError('')
  }

  const pickFile = (set: (f: File | null) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    const problem = f ? checkUpload(f) : null
    setError(problem ?? '')
    set(problem ? null : f)
    if (problem) e.target.value = ''
  }

  const missing =
    (status === 'already_employed' &&
      (!companyName.trim() || !jobTitle.trim() || !workLocation.trim() || !(Number(monthlySalary) > 0))) ||
    (status === 'seeking_job' && (!preferredRoles.trim() || !preferredLocations.trim())) ||
    (status === 'higher_studies' && !higherStudiesProgram.trim())

  const save = async () => {
    if (!status) return
    if (missing) {
      setError('Please fill in the required fields / தேவையான புலங்களை நிரப்பவும்.')
      return
    }
    setSaving(true)
    setError('')
    let offer: { storagePath?: string } = {}
    let resume: { storagePath?: string } = {}
    try {
      if (status === 'already_employed' && offerFile) offer = await storeFile(offerFile, 'career')
      if (status === 'seeking_job' && resumeFile) resume = await storeFile(resumeFile, 'career')
    } catch (err) {
      setSaving(false)
      setError((err as Error).message)
      return
    }
    const survey: CareerTransitionSurvey = {
      status,
      submittedAt: new Date().toISOString(),
    }
    if (status === 'already_employed') {
      survey.companyName = companyName
      survey.jobTitle = jobTitle
      survey.workLocation = workLocation
      survey.monthlySalary = Number(monthlySalary) || 0
      survey.offerLetterFileName = offerFile?.name
      survey.offerLetterPath = offer.storagePath
    }
    if (status === 'seeking_job') {
      survey.preferredRoles = preferredRoles
      survey.preferredLocations = preferredLocations
      survey.expectedSalary = Number(expectedSalary) || 0
      survey.resumeFileName = resumeFile?.name
      survey.resumePath = resume.storagePath
      survey.connectWithMentors = connectWithMentors
    }
    if (status === 'higher_studies') survey.higherStudiesProgram = higherStudiesProgram
    survey.notes = notes

    const updated: Beneficiary = { ...beneficiary, careerSurvey: survey }
    await store.upsertBeneficiary(updated)

    // Mirror onto the student's latest approved application (linked by account, not name).
    const existing = beneficiary.studentId
      ? store.applications.filter((a) => a.studentId === beneficiary.studentId && a.status === 'approved').at(-1)
      : undefined
    if (existing) {
      await store.saveApplication({ ...existing, careerSurvey: survey })
    }

    setSaving(false)
    reset()
    onSaved?.()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Career & Salary Survey" titleTa="தொழில் வாய்ப்பு கணக்கெடுப்பு" wide>
      <p className="-mt-1 mb-4 text-sm text-surface-500">
        <Bi
          en={`For ${beneficiary.name} — tell us where you are after graduation so APTA can support your next step.`}
          ta="படிப்பு முடிந்த பிறகு உங்கள் அடுத்த கட்டத்திற்கு APTA உதவ இதை பூர்த்தி செய்யுங்கள்."
        />
      </p>

      <Field label="Employment Status" labelTa="வேலைவாய்ப்பு நிலை" required>
        <div className="grid gap-2 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setStatus(o.value)}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                status === o.value
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/30'
                  : 'border-surface-200 hover:border-primary-300'
              }`}
            >
              <o.icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary-600" />
              <span>
                <span className="block text-sm font-semibold text-surface-800">{o.en}</span>
                <span className="ta block text-xs text-surface-500">{o.ta}</span>
              </span>
            </button>
          ))}
        </div>
      </Field>

      {status === 'already_employed' && (
        <div className="mt-4 grid gap-4 rounded-xl border border-surface-200 p-4 sm:grid-cols-2">
          <Field label="Company Name" labelTa="நிறுவனத்தின் பெயர்" required>
            <input className="input-base" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Zoho, TCS, Infosys…" />
          </Field>
          <Field label="Designation / Role" labelTa="பதவி" required>
            <input className="input-base" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Software Engineer Trainee" />
          </Field>
          <Field label="Work Location" labelTa="பணிபுரியும் இடம்" required>
            <input className="input-base" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} placeholder="Chennai / Salem / Bengaluru" />
          </Field>
          <Field label="Monthly Starting Salary (₹)" labelTa="மாத சம்பளம் (₹)" required>
            <input className="input-base" type="number" min={0} value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} placeholder="32500" />
          </Field>
          <Field label="Offer Letter / Payslip" labelTa="வேலை வாய்ப்பு கடிதம் / சம்பளப் பட்டியல்" hint="PDF, PNG or JPG">
            <input
              className="input-base"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={pickFile(setOfferFile)}
            />
            {offerFile && <p className="mt-1 text-xs text-emerald-700">Attached: {offerFile.name}</p>}
          </Field>
        </div>
      )}

      {status === 'seeking_job' && (
        <div className="mt-4 grid gap-4 rounded-xl border border-surface-200 p-4 sm:grid-cols-2">
          <Field label="Target Job Roles & Domains" labelTa="விருப்பமான பணி & துறை" required>
            <input className="input-base" value={preferredRoles} onChange={(e) => setPreferredRoles(e.target.value)} placeholder="Staff Nurse, Ward Coordinator" />
          </Field>
          <Field label="Preferred Work Cities" labelTa="விருப்பமான நகரங்கள்" required>
            <input className="input-base" value={preferredLocations} onChange={(e) => setPreferredLocations(e.target.value)} placeholder="Salem, Coimbatore" />
          </Field>
          <Field label="Expected Starting Monthly Salary (₹)" labelTa="எதிர்பார்க்கும் மாத சம்பளம் (₹)" required>
            <input className="input-base" type="number" min={0} value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} placeholder="22000" />
          </Field>
          <Field label="Resume / CV" labelTa="சுயவிவரக் குறிப்பு" hint="PDF">
            <input
              className="input-base"
              type="file"
              accept=".pdf"
              onChange={pickFile(setResumeFile)}
            />
            {resumeFile && <p className="mt-1 text-xs text-emerald-700">Attached: {resumeFile.name}</p>}
          </Field>
          <label className="col-span-full flex items-start gap-2.5 rounded-lg bg-primary-50 p-3">
            <input
              type="checkbox"
              checked={connectWithMentors}
              onChange={(e) => setConnectWithMentors(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary-600"
            />
            <span className="text-sm text-surface-700">
              Connect with APTA Corporate Mentors & Partner Network{' '}
              <span className="ta">— APTA நிறுவன வழிகாட்டிகளுடன் இணைக்கவும்</span>
            </span>
          </label>
        </div>
      )}

      {status === 'higher_studies' && (
        <div className="mt-4 grid gap-4 rounded-xl border border-surface-200 p-4">
          <Field label="PG Program & University" labelTa="மேற்படிப்பு & பல்கலைக்கழகம்" required>
            <input className="input-base" value={higherStudiesProgram} onChange={(e) => setHigherStudiesProgram(e.target.value)} placeholder="M.E. Computer Science — Anna University" />
          </Field>
        </div>
      )}

      <div className="mt-4">
        <Field label="Notes" labelTa="குறிப்புகள்">
          <textarea className="input-base min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else APTA should know…" />
        </Field>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><T>{error}</T></p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          Cancel <span className="ta">/ ரத்து</span>
        </button>
        <button className="btn-primary" disabled={!status || saving} onClick={() => void save()}>
          Save Survey <span className="ta">/ சேமி</span>
        </button>
      </div>
    </Modal>
  )
}
