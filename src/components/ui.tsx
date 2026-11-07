import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { T } from '@/lib/lang'
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
      {en} <span className={`${taClassName} opacity-75`}>/ {ta}</span>
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-surface-200 pb-5">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-surface-900 sm:text-2xl">{title}</h1>
        <p className="ta mt-0.5 text-sm text-surface-500">{titleTa}</p>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-surface-600">
            {subtitle}
            {subtitleTa && <span className="ta block text-surface-500">{subtitleTa}</span>}
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
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
        <span className="label-ta ta">{labelTa}</span>
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs text-surface-500"><T>{hint}</T></span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
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
    <section className="card mb-5 p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {number !== undefined && (
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-50 text-xs font-semibold text-primary-700 tabular">
              {number}
            </span>
          )}
          <div>
            <h2 className="section-title">{title}</h2>
            <p className="ta text-xs text-surface-500">{titleTa}</p>
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  draft: 'bg-surface-100 text-surface-600',
  submitted: 'bg-primary-50 text-primary-700',
  under_review: 'bg-amber-50 text-amber-800',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

const STATUS_LABELS: Record<ApplicationStatus, { en: string; ta: string }> = {
  draft: { en: 'Draft', ta: 'வரைவு' },
  submitted: { en: 'Submitted', ta: 'சமர்ப்பிக்கப்பட்டது' },
  under_review: { en: 'Under review', ta: 'ஆய்வில்' },
  approved: { en: 'Approved', ta: 'அனுமதிக்கப்பட்டது' },
  rejected: { en: 'Rejected', ta: 'மறுக்கப்பட்டது' },
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`badge ${STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {STATUS_LABELS[status].en} <span className="ta">/ {STATUS_LABELS[status].ta}</span>
    </span>
  )
}

const CAREER_STYLES: Record<CareerStatus, string> = {
  already_employed: 'bg-emerald-50 text-emerald-700',
  seeking_job: 'bg-amber-50 text-amber-800',
  higher_studies: 'bg-primary-50 text-primary-700',
  preparing_govt_exams: 'bg-sky-50 text-sky-700',
  entrepreneurship: 'bg-violet-50 text-violet-700',
}

const CAREER_LABELS: Record<CareerStatus, { en: string; ta: string }> = {
  already_employed: { en: 'Employed', ta: 'வேலையில்' },
  seeking_job: { en: 'Seeking placement help', ta: 'வேலை தேடுகிறார்' },
  higher_studies: { en: 'Higher studies (PG)', ta: 'மேற்படிப்பு' },
  preparing_govt_exams: { en: 'Govt exam prep', ta: 'அரசுத் தேர்வு தயாரிப்பு' },
  entrepreneurship: { en: 'Entrepreneur', ta: 'தொழில் தொடங்கியுள்ளார்' },
}

export function careerLabel(status: CareerStatus): { en: string; ta: string } {
  return CAREER_LABELS[status]
}

export function CareerBadge({ beneficiary }: { beneficiary: Beneficiary }) {
  const cs = beneficiary.careerSurvey
  if (!cs) {
    return <span className="badge bg-surface-100 text-surface-500">—</span>
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
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center">
      {icon}
      <p className="text-sm font-medium text-surface-600">{title}</p>
      <p className="ta -mt-1.5 text-xs text-surface-500">{titleTa}</p>
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
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Escape closes, focus moves into the dialog, and the page behind stops scrolling.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-surface-950/40 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`anim-pop max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-surface-200 bg-white px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-surface-900">{title}</h3>
            {titleTa && <p className="ta text-xs text-surface-500">{titleTa}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 rounded-md p-1.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800"
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
    primary: 'bg-primary-50 text-primary-600',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] font-medium text-surface-600">{label}</p>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${tones[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="ta -mt-1 truncate text-xs text-surface-500">{labelTa}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-surface-900 tabular">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-surface-500">{sub}</p>}
    </div>
  )
}
