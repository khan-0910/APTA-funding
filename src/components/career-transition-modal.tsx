import { useState } from 'react'
import { Briefcase, GraduationCap, Landmark, Rocket, Search } from 'lucide-react'
import type { Beneficiary, CareerStatus, CareerTransitionSurvey } from '@/types'
import { useStore } from '@/lib/store'
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
  const [offerFileName, setOfferFileName] = useState('')
  const [preferredRoles, setPreferredRoles] = useState('')
  const [preferredLocations, setPreferredLocations] = useState('')
  const [expectedSalary, setExpectedSalary] = useState('')
  const [resumeFileName, setResumeFileName] = useState('')
  const [connectWithMentors, setConnectWithMentors] = useState(true)
  const [higherStudiesProgram, setHigherStudiesProgram] = useState('')
  const [notes, setNotes] = useState('')

  if (!beneficiary) return null

  const reset = () => {
    setStatus('')
    setCompanyName('')
    setJobTitle('')
    setWorkLocation('')
    setMonthlySalary('')
    setOfferFileName('')
    setPreferredRoles('')
    setPreferredLocations('')
    setExpectedSalary('')
    setResumeFileName('')
    setConnectWithMentors(true)
    setHigherStudiesProgram('')
    setNotes('')
  }

  const save = async () => {
    if (!status) return
    const survey: CareerTransitionSurvey = {
      status,
      submittedAt: new Date().toISOString(),
    }
    if (status === 'already_employed') {
      survey.companyName = companyName
      survey.jobTitle = jobTitle
      survey.workLocation = workLocation
      survey.monthlySalary = Number(monthlySalary) || 0
      survey.offerLetterFileName = offerFileName || undefined
    }
    if (status === 'seeking_job') {
      survey.preferredRoles = preferredRoles
      survey.preferredLocations = preferredLocations
      survey.expectedSalary = Number(expectedSalary) || 0
      survey.resumeFileName = resumeFileName || undefined
      survey.connectWithMentors = connectWithMentors
    }
    if (status === 'higher_studies') survey.higherStudiesProgram = higherStudiesProgram
    survey.notes = notes

    const updated: Beneficiary = { ...beneficiary, careerSurvey: survey }
    await store.upsertBeneficiary(updated)

    const existing = store.applications.find(
      (a) => a.studentName === beneficiary.name || a.studentId === beneficiary.id,
    )
    if (existing) {
      await store.saveApplication({ ...existing, careerSurvey: survey })
    }

    reset()
    onSaved?.()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Career & Salary Survey" titleTa="தொழில் வாய்ப்பு கணக்கெடுப்பு" wide>
      <p className="-mt-1 mb-4 text-sm text-surface-500 dark:text-surface-400">
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
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/30 dark:bg-primary-900/30'
                  : 'border-surface-200 hover:border-primary-300 dark:border-surface-700 dark:hover:border-primary-700'
              }`}
            >
              <o.icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary-600 dark:text-primary-400" />
              <span>
                <span className="block text-sm font-semibold text-surface-800 dark:text-surface-100">{o.en}</span>
                <span className="ta block text-xs text-surface-500 dark:text-surface-400">{o.ta}</span>
              </span>
            </button>
          ))}
        </div>
      </Field>

      {status === 'already_employed' && (
        <div className="mt-4 grid gap-4 rounded-xl border border-surface-200 p-4 dark:border-surface-700 sm:grid-cols-2">
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
              onChange={(e) => setOfferFileName(e.target.files?.[0]?.name ?? '')}
            />
            {offerFileName && <p className="mt-1 text-xs text-emerald-600">Attached: {offerFileName}</p>}
          </Field>
        </div>
      )}

      {status === 'seeking_job' && (
        <div className="mt-4 grid gap-4 rounded-xl border border-surface-200 p-4 dark:border-surface-700 sm:grid-cols-2">
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
              onChange={(e) => setResumeFileName(e.target.files?.[0]?.name ?? '')}
            />
            {resumeFileName && <p className="mt-1 text-xs text-emerald-600">Attached: {resumeFileName}</p>}
          </Field>
          <label className="col-span-full flex items-start gap-2.5 rounded-lg bg-primary-50 p-3 dark:bg-primary-900/25">
            <input
              type="checkbox"
              checked={connectWithMentors}
              onChange={(e) => setConnectWithMentors(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary-600"
            />
            <span className="text-sm text-surface-700 dark:text-surface-200">
              Connect with APTA Corporate Mentors & Partner Network{' '}
              <span className="ta">— APTA நிறுவன வழிகாட்டிகளுடன் இணைக்கவும்</span>
            </span>
          </label>
        </div>
      )}

      {status === 'higher_studies' && (
        <div className="mt-4 grid gap-4 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
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

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>
          Cancel / <span className="ta">ரத்து</span>
        </button>
        <button className="btn-primary" disabled={!status} onClick={() => void save()}>
          Save Survey / <span className="ta">சேமி</span>
        </button>
      </div>
    </Modal>
  )
}
