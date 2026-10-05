import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { EmptyState, Field, Modal, PageHeader } from '@/components/ui'
import type { ProgressReport } from '@/types'

export function StaffProgressReportsPage() {
  const store = useStore()
  const { can } = useAuth()
  const [review, setReview] = useState<ProgressReport | null>(null)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'reviewed' | 'action_required'>('reviewed')

  if (!can('review')) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="glass-card p-8 text-center text-sm text-surface-500">
          Staff access only / <span className="ta">ஊழியர் அணுகல் மட்டும்</span>
        </p>
      </div>
    )
  }

  const saveReview = async () => {
    if (!review) return
    const updated = store.progressReports.map((r) =>
      r.id === review.id ? { ...r, status, reviewNotes: notes || r.reviewNotes } : r,
    )
    store.setProgressReports(updated)
    setReview(null)
    setNotes('')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Student Report Review"
        titleTa="மாணவர் அறிக்கை ஆய்வு"
        subtitle="Review semester reports and record staff feedback."
        subtitleTa="பருவ அறிக்கைகளை ஆய்வு செய்து கருத்து பதிவிடுங்கள்."
      />
      {store.progressReports.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-8 w-8 text-surface-300" />} title="No reports" titleTa="அறிக்கைகள் இல்லை" />
      ) : (
        <div className="grid gap-4">
          {store.progressReports.map((r) => (
            <div key={r.id} className="glass-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-surface-900 dark:text-surface-50">
                    {r.studentName} — {r.semester}
                  </p>
                  <p className="text-xs text-surface-400">Submitted {formatDate(r.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-primary-600/10 font-bold text-primary-700 dark:text-primary-300">GPA {r.gpa.toFixed(1)}</span>
                  <span
                    className={`badge ${
                      r.status === 'reviewed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : r.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                    }`}
                  >
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">{r.narrative}</p>
              <div className="mt-3 flex justify-end">
                <button
                  className="btn-ghost !px-3 !py-1.5 !text-xs"
                  onClick={() => {
                    setReview(r)
                    setNotes(r.reviewNotes ?? '')
                    setStatus(r.status === 'pending' ? 'reviewed' : r.status === 'reviewed' ? 'reviewed' : 'action_required')
                  }}
                >
                  Review / <span className="ta">ஆய்வு</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={review !== null} onClose={() => setReview(null)} title={`Review — ${review?.studentName ?? ''} ${review?.semester ?? ''}`} titleTa="அறிக்கை ஆய்வு">
        <div className="space-y-4">
          <Field label="Review Notes" labelTa="ஆய்வு குறிப்புகள்">
            <textarea className="input-base min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Field label="Status" labelTa="நிலை">
            <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value as 'reviewed' | 'action_required')}>
              <option value="reviewed">Reviewed / ஆய்வு முடிந்தது</option>
              <option value="action_required">Action Required / நடவடிக்கை தேவை</option>
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setReview(null)}>Cancel / <span className="ta">ரத்து</span></button>
            <button className="btn-primary" onClick={() => void saveReview()}>Save / <span className="ta">சேமி</span></button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
