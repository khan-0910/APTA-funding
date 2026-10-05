import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, FileStack, GraduationCap, Plus, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDate, formatINR } from '@/lib/format'
import { computeAcademicProjection } from '@/lib/academic'
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui'
import { CareerTransitionModal } from '@/components/career-transition-modal'
import type { Application, Beneficiary, UserRole } from '@/types'

export function MyApplicationsPage() {
  const { user, devRoleOverride } = useAuth()
  const { applications, beneficiaries } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [careerModalFor, setCareerModalFor] = useState<Beneficiary | null>(null)
  const [surveyModalOpen, setSurveyModalOpen] = useState(false)

  const effectiveRole: UserRole = devRoleOverride ?? user?.role ?? 'student'
  const isStaffView = effectiveRole !== 'student'
  const mine = useMemo(
    () => (isStaffView || !user ? applications : applications.filter((a) => a.studentId === user.id)),
    [applications, user, isStaffView],
  )

  const visible = mine.filter(
    (a) =>
      a.studentName.toLowerCase().includes(query.toLowerCase()) ||
      a.program.toLowerCase().includes(query.toLowerCase()),
  )

  const myBeneficiary = useMemo(
    () => (user ? beneficiaries.find((b) => b.name === user.name || b.id === user.id) ?? null : null),
    [beneficiaries, user],
  )

  const isFinalYear = useMemo(() => {
    // Trigger the career-transition workflow in the final stretch (4th year, or 3rd year of a 4-year degree).
    return mine.some((a) => {
      if (a.status !== 'approved') return false
      const fp = a.familyProfile
      if (!fp) return false
      const proj = computeAcademicProjection({
        educationType: fp.educationType ?? 'college',
        yearText: fp.educationType === 'school' ? (fp.schoolYear ?? '') : (fp.collegeYear ?? ''),
      })
      return (proj?.yearsRemaining ?? 99) <= 1
    })
  }, [mine])

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={isStaffView ? 'Application Review Queue' : 'My Applications'}
        titleTa={isStaffView ? 'விண்ணப்ப ஆய்வு பட்டியல்' : 'என் விண்ணப்பங்கள்'}
        subtitle={
          isStaffView
            ? 'All submitted applications — open one to verify, approve and sanction.'
            : 'Track your funding requests from submission to sanction.'
        }
        subtitleTa={
          isStaffView
            ? 'சமர்ப்பிக்கப்பட்ட அனைத்து விண்ணப்பங்கள் — சரிபார்க்க திறக்கவும்.'
            : 'சமர்ப்பிப்பிலிருந்து ஒப்புதல் வரை உங்கள் விண்ணப்பங்களைக் கண்காணியுங்கள்.'
        }
        actions={
          <Link to="/applications/new" className="btn-accent">
            <Plus className="h-4.5 w-4.5" /> New Application / <span className="ta">புதிய விண்ணப்பம்</span>
          </Link>
        }
      />

      {/* Graduation milestone banner */}
      {isFinalYear && myBeneficiary && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-300/70 bg-gradient-to-r from-emerald-50 to-amber-50 p-5 dark:border-emerald-500/30 dark:from-emerald-900/30 dark:to-amber-900/20 no-print">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-surface-900 dark:text-surface-50">
                  Congratulations, you are in your final year! / <span className="ta">வாழ்த்துகள், இது உங்கள் இறுதி ஆண்டு!</span>
                </p>
                <p className="mt-0.5 text-sm text-surface-600 dark:text-surface-300">
                  Complete the Career & Salary Survey to unlock placement support with APTA's 50+ corporate partners.{' '}
                  <span className="ta">தொழில் கணக்கெடுப்பை பூர்த்தி செய்யுங்கள்.</span>
                </p>
              </div>
            </div>
            <button
              className="btn-accent"
              onClick={() => {
                setCareerModalFor(myBeneficiary)
                setSurveyModalOpen(true)
              }}
            >
              Complete Career Survey / <span className="ta">கணக்கெடுப்பை நிறைவு செய்</span>
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-surface-200 bg-white/60 px-3.5 py-2.5 dark:border-surface-700 dark:bg-surface-900/60">
        <Search className="h-4.5 w-4.5 text-surface-400" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-surface-400"
          placeholder="Search by name or program / பெயர் அல்லது படிப்பைத் தேடுங்கள்"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<FileStack className="h-8 w-8 text-surface-300" />}
          title="No applications yet"
          titleTa="விண்ணப்பங்கள் இல்லை"
        />
      ) : (
        <div className="grid gap-4">
          {visible.map((a) => (
            <ApplicationCard key={a.id} app={a} onOpen={() => navigate(`/applications/${a.id}`)} />
          ))}
        </div>
      )}

      <CareerTransitionModal
        open={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        beneficiary={careerModalFor}
      />
    </div>
  )
}

function ApplicationCard({ app, onOpen }: { app: Application; onOpen: () => void }) {
  return (
    <div className="glass-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-surface-900 dark:text-surface-50">{app.studentName}</p>
          <p className="text-sm text-surface-500 dark:text-surface-400">{app.program}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-surface-600 dark:text-surface-300">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-surface-400" />
          {app.submittedAt ? formatDate(app.submittedAt) : 'Draft / வரைவு'}
        </span>
        <span className="font-bold text-primary-700 dark:text-primary-300">{formatINR(app.fundingRequested)}</span>
        <span className="badge bg-surface-100 capitalize text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          {app.category.replace('_', ' ')}
        </span>
      </div>
      <div className="mt-4 flex justify-end">
        <button className="btn-ghost !py-1.5 !text-xs" onClick={onOpen}>
          View Details / <span className="ta">விவரங்கள்</span>
        </button>
      </div>
    </div>
  )
}
