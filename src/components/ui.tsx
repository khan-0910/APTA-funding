import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { ApplicationStatus, Beneficiary, CareerStatus } from '@/types'

export function Bi({
  en,
  ta,
  className = '',
  taClassName = 'ta',
}: {
  en: string
  ta: string
  className?: string
  taClassName?: string
}) {
  return (
    <span className={className}>
      {en} <span className={`${taClassName} opacity-70`}>/ {ta}</span>
    </span>
  )
}

export function PageHeader({
  title,
  titleTa,
  subtitle,
  subtitleTa,
  actions,
}: {
  title: string
  titleTa: string
  subtitle?: string
  subtitleTa?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
          {title} <span className="ta text-lg font-semibold text-primary-600 dark:text-primary-400">/ {titleTa}</span>
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {subtitle}
            {subtitleTa && <span className={`ta`}> / {subtitleTa}</span>}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Field({
  label,
  labelTa,
  required,
  error,
  children,
  hint,
}: {
  label: string
  labelTa: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="label-bilingual">
        {label}
        {required && <span className="text-red-500"> *</span>}
        <span className={`label-ta`}>{labelTa}</span>
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs text-surface-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-500">{error}</span>}
    </label>
  )
}

export function SectionCard({
  number,
  title,
  titleTa,
  children,
  actions,
}: {
  number?: number
  title: string
  titleTa: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title flex items-center gap-2">
          {number !== undefined && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600/10 text-sm font-bold text-primary-700 dark:bg-primary-400/10 dark:text-primary-300">
              {number}
            </span>
          )}
          {title} <span className={`ta text-sm font-semibold text-primary-600 dark:text-primary-400`}>/ {titleTa}</span>
        </h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  draft: 'bg-surface-200 text-surface-700 dark:bg-surface-700/60 dark:text-surface-200',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
}

const STATUS_LABELS: Record<ApplicationStatus, { en: string; ta: string }> = {
  draft: { en: 'Draft', ta: 'வரைவு' },
  submitted: { en: 'Submitted', ta: 'சமர்ப்பிக்கப்பட்டது' },
  under_review: { en: 'Under Review', ta: 'ஆய்வில்' },
  approved: { en: 'Approved', ta: 'அனுமதிக்கப்பட்டது' },
  rejected: { en: 'Rejected', ta: 'மறுக்கப்பட்டது' },
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status].en} / <span className="ta">{STATUS_LABELS[status].ta}</span>
    </span>
  )
}

const CAREER_STYLES: Record<CareerStatus, string> = {
  already_employed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  seeking_job: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  higher_studies: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  preparing_govt_exams: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  entrepreneurship: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
}

const CAREER_LABELS: Record<CareerStatus, { en: string; ta: string }> = {
  already_employed: { en: 'Employed', ta: 'வேலையில்' },
  seeking_job: { en: 'Seeking Placement Help', ta: 'வேலை தேடுகிறார்' },
  higher_studies: { en: 'Higher Studies (PG)', ta: 'மேற்படிப்பு' },
  preparing_govt_exams: { en: 'Govt Exam Prep', ta: 'அரசுத் தேர்வு தயாரிப்பு' },
  entrepreneurship: { en: 'Entrepreneur', ta: 'தொழில் தொடங்கியுள்ளார்' },
}

export function careerLabel(status: CareerStatus): { en: string; ta: string } {
  return CAREER_LABELS[status]
}

export function CareerBadge({ beneficiary }: { beneficiary: Beneficiary }) {
  const cs = beneficiary.careerSurvey
  if (!cs) {
    return <span className="badge bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400">—</span>
  }
  return (
    <span className={`badge ${CAREER_STYLES[cs.status]}`}>
      {CAREER_LABELS[cs.status].en}
      {cs.status === 'already_employed' && cs.monthlySalary !== undefined && (
        <>
          {' '}
          · ₹{Math.round(cs.monthlySalary).toLocaleString('en-IN')}/mo
          {cs.companyName ? ` · ${cs.companyName}` : ''}
        </>
      )}
      {cs.status === 'seeking_job' && cs.preferredRoles ? ` · ${cs.preferredRoles}` : ''}
      {cs.status === 'higher_studies' && cs.higherStudiesProgram ? ` · ${cs.higherStudiesProgram}` : ''}
    </span>
  )
}

export function EmptyState({ title, titleTa, icon }: { title: string; titleTa: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-300 py-12 text-center dark:border-surface-700">
      {icon}
      <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
        {title} <span className="ta">/ {titleTa}</span>
      </p>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  titleTa,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  titleTa?: string
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-surface-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`glass-card max-h-[92vh] w-full overflow-y-auto rounded-b-none rounded-t-2xl sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-surface-200/70 bg-white/85 px-5 py-4 backdrop-blur dark:border-surface-800 dark:bg-surface-900/90">
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">
            {title}
            {titleTa && (
              <span className={`ta ml-2 text-sm font-semibold text-primary-600 dark:text-primary-400`}>/ {titleTa}</span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-surface-500 transition hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function KpiCard({
  icon,
  label,
  labelTa,
  value,
  sub,
  tone = 'primary',
}: {
  icon: ReactNode
  label: string
  labelTa: string
  value: string
  sub?: string
  tone?: 'primary' | 'amber' | 'emerald' | 'sky'
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary-600/10 text-primary-700 dark:bg-primary-400/10 dark:text-primary-300',
    amber: 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    sky: 'bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300',
  }
  return (
    <div className="glass-card flex items-center gap-4 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-surface-500 dark:text-surface-400">
          {label} <span className="ta">/ {labelTa}</span>
        </p>
        <p className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-50">{value}</p>
        {sub && <p className="truncate text-xs text-surface-400">{sub}</p>}
      </div>
    </div>
  )
}
