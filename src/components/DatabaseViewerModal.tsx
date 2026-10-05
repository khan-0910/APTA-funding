import { useMemo, useState } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDateTime, formatINR } from '@/lib/format'
import { Modal, Bi } from './ui'

type Tab = 'accounts' | 'logs' | 'applications' | 'beneficiaries'

export function DatabaseViewerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('accounts')
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const rows = useMemo(() => {
    switch (tab) {
      case 'accounts':
        return store.accounts.map((a) => ({
          id: a.id,
          primary: a.name,
          secondary: a.email,
          meta: `${a.role} · ${a.status} · logins: ${a.loginCount} · last: ${a.lastLoginAt ? formatDateTime(a.lastLoginAt) : 'never'}`,
        }))
      case 'logs':
        return store.loginLogs.slice(0, 120).map((l) => ({
          id: l.id,
          primary: `${l.action} — ${l.userEmail}`,
          secondary: `${l.role} · ${l.ipAddress} · ${l.userAgent}`,
          meta: `${l.status} · ${formatDateTime(l.timestamp)}`,
        }))
      case 'applications':
        return store.applications.map((a) => ({
          id: a.id,
          primary: `${a.studentName} — ${a.program}`,
          secondary: a.id,
          meta: `${a.status} · ${formatINR(a.fundingRequested)} · ${a.submittedAt ? formatDateTime(a.submittedAt) : 'not submitted'}`,
        }))
      case 'beneficiaries':
        return store.beneficiaries.map((b) => ({
          id: b.id,
          primary: b.name,
          secondary: b.program,
          meta: `${b.status} · ${formatINR(b.fundingReceived)} · GPA ${b.currentGpa || '—'}`,
        }))
    }
  }, [tab, store.accounts, store.loginLogs, store.applications, store.beneficiaries])

  if (!can('review')) return null

  return (
    <Modal open={open} onClose={onClose} title="Database Viewer" titleTa="தரவுத்தள காட்சி" wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['accounts', 'Accounts', 'கணக்குகள்'],
              ['logs', 'Login Logs', 'உள்நுழைவு பதிவுகள்'],
              ['applications', 'Applications', 'விண்ணப்பங்கள்'],
              ['beneficiaries', 'Beneficiaries', 'பயனாளிகள்'],
            ] as Array<[Tab, string, string]>
          ).map(([key, en, ta]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
              }`}
            >
              {en} <span className="ta">/ {ta}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400">
            {store.syncState === 'cloud' ? 'Supabase connected' : 'Local storage'}
          </span>
          {can('audit') &&
            (confirmClear ? (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setClearing(true)
                    void store.clearAllData().finally(() => {
                      // Reload so the auth context re-reads the (now cleared) session.
                      window.location.reload()
                    })
                  }}
                  className="btn-ghost !px-3 !py-1.5 !text-xs !text-red-600 dark:!text-red-300"
                  disabled={clearing}
                >
                  <Trash2 className={`h-3.5 w-3.5 ${clearing ? 'animate-pulse' : ''}`} />
                  <Bi en="Yes, delete everything" ta="அனைத்தையும் நீக்கு" />
                </button>
                <button onClick={() => setConfirmClear(false)} className="btn-ghost !px-3 !py-1.5 !text-xs">
                  <Bi en="Cancel" ta="ரத்து" />
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="btn-ghost !px-3 !py-1.5 !text-xs"
                title="Delete every account, application and record from local storage and Supabase"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <Bi en="Clear All Data" ta="அனைத்தையும் காலி" />
              </button>
            ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-200 dark:border-surface-800">
        <div className="max-h-[55vh] divide-y divide-surface-100 overflow-y-auto dark:divide-surface-800">
          {rows.map((r) => (
            <div key={r.id} className="px-4 py-2.5 text-sm">
              <p className="font-semibold text-surface-800 dark:text-surface-100">{r.primary}</p>
              <p className="truncate text-xs text-surface-500 dark:text-surface-400">{r.secondary}</p>
              <p className="text-xs text-surface-400 dark:text-surface-500">{r.meta}</p>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-surface-400">No rows / தரவு இல்லை</p>
          )}
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-surface-400">
        <ShieldCheck className="h-3.5 w-3.5" /> Read-only view for staff & admin / ஊழியர் மற்றும் நிர்வாகிக்கான பார்வை
      </p>
    </Modal>
  )
}
