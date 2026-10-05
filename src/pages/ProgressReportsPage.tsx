import { useMemo, useState, type FormEvent } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { EmptyState, Field, PageHeader } from '@/components/ui'
import type { ProgressReport } from '@/types'

const CURRENT_SEMESTER = 'Fall 2026'

const STATUS_STYLE: Record<string, string> = {
  reviewed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  action_required: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
}

export function ProgressReportsPage() {
  const { user } = useAuth()
  const { progressReports, setProgressReports } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [semester, setSemester] = useState(CURRENT_SEMESTER)
  const [gpa, setGpa] = useState('')
  const [narrative, setNarrative] = useState('')

  const mine = useMemo(
    () => progressReports.filter((r) => (user ? r.studentId === user.id || r.studentName === user.name : true)),
    [progressReports, user],
  )

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Progress Reports"
        titleTa="முன்னேற்ற அறிக்கைகள்"
        subtitle="Submit semester GPA reports with your academic narrative."
        subtitleTa="பருவத்திற்கான ஜிபிஏ அறிக்கைகளை சமர்ப்பிக்கவும்."
      />
      <div className="mb-4 flex justify-end">
        <button className="btn-accent" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4.5 w-4.5" /> {showForm ? 'Close / மூடு' : 'New Report / புதிய அறிக்கை'}
        </button>
      </div>

      {showForm && (
        <form
          className="glass-card mb-6 space-y-4 p-5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!user || !gpa || !narrative.trim()) return
            const report: ProgressReport = {
              id: `report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
              studentId: user.id,
              studentName: user.name,
              semester: semester.trim() || CURRENT_SEMESTER,
              status: 'pending',
              gpa: Math.max(0, Math.min(10, Number(gpa) || 0)),
              narrative: narrative.trim(),
              submittedAt: new Date().toISOString(),
            }
            setProgressReports([report, ...progressReports])
            setGpa('')
            setNarrative('')
            setShowForm(false)
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Semester" labelTa="பருவம்" required>
              <input className="input-base" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Fall 2026" />
            </Field>
            <Field label="GPA (out of 10)" labelTa="ஜிபிஏ (10 இல்)" required>
              <input className="input-base" type="number" min={0} max={10} step={0.1} value={gpa} onChange={(e) => setGpa(e.target.value)} />
            </Field>
          </div>
          <Field label="Academic Progress Narrative" labelTa="கல்வி முன்னேற்ற விளக்கம்" required>
            <textarea
              className="input-base min-h-24"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="How did this semester go? Courses, grades, challenges…"
            />
          </Field>
          <div className="flex justify-end">
            <button className="btn-primary" type="submit" disabled={!gpa || !narrative.trim()}>
              Submit Report / <span className="ta">சமர்ப்பி</span>
            </button>
          </div>
        </form>
      )}

      {mine.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8 text-surface-300" />} title="No reports yet" titleTa="அறிக்கைகள் இல்லை" />
      ) : (
        <div className="grid gap-4">
          {mine.map((r) => (
            <div key={r.id} className="glass-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-surface-900 dark:text-surface-50">{r.semester}</p>
                  <p className="text-xs text-surface-400">Submitted {formatDate(r.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-primary-600/10 font-bold text-primary-700 dark:text-primary-300">GPA {r.gpa.toFixed(1)}</span>
                  <span className={`badge ${STATUS_STYLE[r.status]}`}>{r.status.replace('_', ' ')}</span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-300">{r.narrative}</p>
              {r.reviewNotes && (
                <p className="mt-3 rounded-lg bg-surface-50 px-3 py-2 text-xs text-surface-500 dark:bg-surface-800/60 dark:text-surface-400">
                  Staff review: {r.reviewNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
