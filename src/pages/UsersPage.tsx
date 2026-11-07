import { useMemo, useState } from 'react'
import { Search, ShieldCheck, UserCog } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/persistence'
import { formatDate, formatDateTime } from '@/lib/format'
import { EmptyState, Modal, PageHeader } from '@/components/ui'
import type { UserAccount, UserRole } from '@/types'

type Change = { account: UserAccount; role: UserRole; status: UserAccount['status'] }

const ROLE_LABEL: Record<UserRole, string> = { student: 'Student', staff: 'Staff', admin: 'Admin' }
const ROLE_STYLE: Record<UserRole, string> = {
  student: 'bg-surface-100 text-surface-600',
  staff: 'bg-primary-50 text-primary-700',
  admin: 'bg-amber-50 text-amber-800',
}

/** Admin-only: give or remove staff/admin access, and disable accounts. */
export function UsersPage() {
  const { can, user } = useAuth()
  const store = useStore()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [pending, setPending] = useState<Change | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const accounts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...store.accounts]
      .filter((a) => roleFilter === 'all' || a.role === roleFilter)
      .filter((a) => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
      .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : a.role === 'staff' ? -1 : 1))
  }, [store.accounts, query, roleFilter])

  const activeAdmins = store.accounts.filter((a) => a.role === 'admin' && a.status === 'active').length

  if (!can('audit')) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="card p-8 text-center text-sm text-surface-500">Admin access only</p>
      </div>
    )
  }

  /** Why a change to this account isn't allowed, or '' if it is. */
  const lockReason = (a: UserAccount) =>
    a.id === user?.id
      ? "You can't change your own access."
      : a.role === 'admin' && a.status === 'active' && activeAdmins <= 1
        ? 'The last active admin must stay an admin.'
        : ''

  const apply = async () => {
    if (!pending) return
    const { account, role, status } = pending
    setSaving(true)
    setError('')
    if (supabase) {
      // Direct update: profiles linked to Supabase Auth aren't part of the bulk sync.
      // The database re-checks that the caller is an active admin (RLS + triggers).
      const { data, error: err } = await supabase.from('user_accounts').update({ role, status }).eq('id', account.id).select('id')
      if (err || !data?.length) {
        setSaving(false)
        setError(err?.message ?? 'The change was not saved — you may no longer have admin access.')
        return
      }
    }
    store.setAccounts(store.accounts.map((a) => (a.id === account.id ? { ...a, role, status } : a)))
    setSaving(false)
    setPending(null)
  }

  const describe = (c: Change) => {
    const parts: string[] = []
    if (c.role !== c.account.role) parts.push(`change their role from ${ROLE_LABEL[c.account.role]} to ${ROLE_LABEL[c.role]}`)
    if (c.status !== c.account.status) parts.push(c.status === 'disabled' ? 'disable the account (they will be signed out and blocked)' : 're-enable the account')
    return parts.join(' and ')
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Users & access"
        titleTa="பயனர்கள் & அணுகல்"
        subtitle="Everyone signs up as a student. Give staff or admin access here, or disable an account."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-surface-300 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-surface-400" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-surface-400"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select className="input-base !w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')} aria-label="Filter by role">
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="staff">Staff</option>
          <option value="student">Students</option>
        </select>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="No matching accounts" titleTa="கணக்குகள் இல்லை" icon={<UserCog className="h-8 w-8 text-surface-300" />} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-surface-200 text-left text-xs font-medium text-surface-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {accounts.map((a) => {
                const locked = lockReason(a)
                return (
                  <tr key={a.id} className={a.status === 'disabled' ? 'bg-surface-50 text-surface-400' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-900">
                        {a.name} {a.id === user?.id && <span className="text-xs font-normal text-surface-500">(you)</span>}
                      </p>
                      <p className="text-xs text-surface-500">{a.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {locked ? (
                        <span className={`badge ${ROLE_STYLE[a.role]}`} title={locked}>
                          {a.role === 'admin' && <ShieldCheck className="h-3 w-3" />} {ROLE_LABEL[a.role]}
                        </span>
                      ) : (
                        <select
                          className="input-base !w-auto !py-1"
                          value={a.role}
                          onChange={(e) => setPending({ account: a, role: e.target.value as UserRole, status: a.status })}
                          aria-label={`Role for ${a.name}`}
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {locked ? (
                        <span className="text-xs text-surface-500" title={locked}>{a.status === 'active' ? 'Active' : 'Disabled'}</span>
                      ) : (
                        <button
                          type="button"
                          className={`btn-ghost !px-2.5 !py-1 !text-xs ${a.status === 'active' ? '' : '!border-emerald-300 !text-emerald-700'}`}
                          onClick={() => setPending({ account: a, role: a.role, status: a.status === 'active' ? 'disabled' : 'active' })}
                        >
                          {a.status === 'active' ? 'Disable' : 'Re-enable'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-600 tabular">{formatDate(a.createdAt)}</td>
                    <td className="px-4 py-3 text-surface-600 tabular">{formatDateTime(a.lastLoginAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-surface-500">
        Changes take effect immediately; the person may need to reload the page to see new menus. The database itself
        enforces these rules, so only an active admin can make them.
      </p>

      <Modal open={pending !== null} onClose={() => !saving && setPending(null)} title="Confirm access change">
        {pending && (
          <div className="space-y-4 text-sm text-surface-700">
            <p>
              You're about to <strong>{describe(pending)}</strong> for <strong>{pending.account.name}</strong> ({pending.account.email}).
            </p>
            {pending.role === 'admin' && pending.account.role !== 'admin' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                Admins can see all personal data, download backups, delete everything and manage other admins. Only give this to people you fully trust.
              </p>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" disabled={saving} onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className={pending.status === 'disabled' ? 'btn-danger' : 'btn-primary'} disabled={saving} onClick={() => void apply()}>
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
