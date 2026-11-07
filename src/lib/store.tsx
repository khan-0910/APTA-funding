import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  Application,
  Beneficiary,
  LoginLog,
  Partner,
  ProgressReport,
  Transaction,
  UserAccount,
} from '@/types'
import {
  SUPABASE_CONFIGURED,
  fetchAllCloud,
  freshData,
  latency,
  pushRows,
  emptyVersions,
  fromDb,
  tableOf,
  type PushResult,
  type Versions,
  readLocal,
  supabase,
  wipeAllCloud,
  writeLocal,
  type DataKey,
  type DataState,
} from './persistence'

/** localStorage mirror keys, 1:1 with DataKey. */
const KEYS: Record<DataKey, string> = {
  accounts: 'apta-accounts',
  loginLogs: 'apta-login-logs',
  applications: 'apta-applications',
  beneficiaries: 'apta-beneficiaries',
  transactions: 'apta-transactions',
  partners: 'apta-partners',
  progressReports: 'apta-progress-reports',
}

export interface StoreShape extends DataState {
  ready: boolean
  syncState: 'local' | 'cloud'
  setAccounts: (rows: UserAccount[]) => void
  setLoginLogs: (rows: LoginLog[]) => void
  setApplications: (rows: Application[]) => void
  setBeneficiaries: (rows: Beneficiary[]) => void
  setTransactions: (rows: Transaction[]) => void
  setPartners: (rows: Partner[]) => void
  setProgressReports: (rows: ProgressReport[]) => void
  clearAllData: () => Promise<void>
  /** Push any unsynced changes now (e.g. before signing out drops the session). */
  flushPending: () => Promise<void>
  /** Messages for the user, e.g. an edit that lost to someone else's newer save. */
  notices: string[]
  dismissNotice: (index: number) => void
  saveApplication: (row: Application) => Promise<void>
  upsertBeneficiary: (row: Beneficiary) => Promise<void>
  logAuthEvent: (entry: Omit<LoginLog, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>) => Promise<void>
}

const StoreContext = createContext<StoreShape | null>(null)

const DATA_KEYS = Object.keys(KEYS) as DataKey[]

function emptySynced(): Record<DataKey, Map<string, unknown>> {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, new Map()])) as Record<DataKey, Map<string, unknown>>
}

/** Cloud copy wins for rows both sides know; rows only this device has are kept. */
function mergeCloud(local: DataState, cloud: DataState): DataState {
  const merged = { ...cloud }
  for (const key of DATA_KEYS) {
    const ids = new Set(cloud[key].map((r) => r.id))
    const localOnly = (local[key] as Array<{ id: string }>).filter((r) => !ids.has(r.id))
    if (localOnly.length > 0) (merged as Record<DataKey, unknown>)[key] = [...cloud[key], ...localOnly]
  }
  return merged
}

/** Live-updated collections (login logs are high-volume and staff-only). */
const LIVE_KEYS: DataKey[] = ['accounts', 'applications', 'beneficiaries', 'transactions', 'partners', 'progressReports']

/** Human name for a row in conflict messages. */
function describeRow(key: DataKey, row: { id: string }): string {
  const r = row as unknown as Record<string, unknown>
  const name = (r.studentName ?? r.name ?? r.orgName ?? r.description ?? row.id) as string
  const what: Record<DataKey, string> = {
    accounts: 'Account',
    loginLogs: 'Log entry',
    applications: 'The application for',
    beneficiaries: 'The beneficiary record for',
    transactions: 'The ledger entry',
    partners: 'The partner',
    progressReports: 'The progress report from',
  }
  return `${what[key]} "${name}"`
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataState>(() => {
    const initial = freshData()
    if (!SUPABASE_CONFIGURED) {
      // Local-only mode: mirror whatever exists on this device (empty on first run).
      initial.accounts = readLocal<UserAccount[]>(KEYS.accounts, [])
      initial.loginLogs = readLocal<LoginLog[]>(KEYS.loginLogs, [])
      initial.applications = readLocal<Application[]>(KEYS.applications, [])
      initial.beneficiaries = readLocal<Beneficiary[]>(KEYS.beneficiaries, [])
      initial.transactions = readLocal<Transaction[]>(KEYS.transactions, [])
      initial.partners = readLocal<Partner[]>(KEYS.partners, [])
      initial.progressReports = readLocal<ProgressReport[]>(KEYS.progressReports, [])
    }
    return initial
  })
  const [ready, setReady] = useState(() => !SUPABASE_CONFIGURED)
  const [notices, setNotices] = useState<string[]>([])
  const dataRef = useRef(data)
  dataRef.current = data

  // The copy of each row the cloud is known to hold. Rows are replaced immutably,
  // so "dirty" is simply "a different object than the one we last synced".
  const synced = useRef(emptySynced())
  // The cloud's updated_at for each row as last seen (detects other people's edits).
  const versions = useRef<Versions>(emptyVersions())
  const markSynced = (state: DataState, v: Versions) => {
    for (const key of DATA_KEYS) synced.current[key] = new Map(state[key].map((r) => [r.id, r]))
    versions.current = v
  }

  /** Put rows into a collection, replacing same-id rows and adding new ones at the top. */
  const replaceRows = useCallback((key: DataKey, rows: Array<{ id: string }>) => {
    setData((prev) => {
      const byId = new Map(rows.map((r) => [r.id, r]))
      const next = (prev[key] as Array<{ id: string }>).map((r) => {
        const fresh = byId.get(r.id)
        if (!fresh) return r
        byId.delete(r.id)
        return fresh
      })
      return { ...prev, [key]: [...byId.values(), ...next] } as DataState
    })
  }, [])

  const pushDirty = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return
    const current = dataRef.current
    await Promise.all(
      DATA_KEYS.map(async (key) => {
        const map = synced.current[key]
        const dirty = (current[key] as Array<{ id: string }>).filter((r) => map.get(r.id) !== r)
        if (dirty.length === 0) return
        const byId = new Map(dirty.map((r) => [r.id, r]))
        const apply = (res: PushResult) => {
          for (const id of res.saved) map.set(id, byId.get(id))
          if (res.conflicts.length === 0) return
          // Someone else saved first: show their version instead of overwriting it.
          for (const c of res.conflicts) map.set(c.row.id, c.row)
          replaceRows(key, res.conflicts.map((c) => c.row))
          setNotices((n) => [
            ...n,
            ...res.conflicts.map(
              (c) =>
                `${describeRow(key, c.row)} was changed by someone else while you were editing, so your change wasn't saved. The latest version is now shown — please redo your edit if it's still needed.`,
            ),
          ])
        }
        const res = await pushRows(key, dirty, versions.current[key])
        apply(res)
        // One row RLS rejects must not hold back the others: retry the rest one by one.
        const handled = new Set([...res.saved, ...res.conflicts.map((c) => c.row.id)])
        const rest = dirty.filter((r) => !handled.has(r.id))
        if (dirty.length > 1) for (const r of rest) apply(await pushRows(key, [r], versions.current[key]))
      }),
    )
  }, [replaceRows])

  // Cloud mode: hydrate from PostgreSQL once at startup.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return
    let cancelled = false
    void (async () => {
      const cloud = await fetchAllCloud()
      if (!cancelled) {
        if (cloud) {
          markSynced(cloud.state, cloud.versions)
          setData(cloud.state)
        }
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Re-hydrate when the Supabase Auth session changes: under RLS each user only sees
  // their own rows, so data must be fetched again after sign-in, and cleared after
  // sign-out so the next person on a shared computer sees nothing.
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return
      // Defer: supabase-js forbids awaiting other client calls inside this callback.
      window.setTimeout(() => {
        void (async () => {
          const cloud = await fetchAllCloud()
          if (cancelled || !cloud) return
          markSynced(cloud.state, cloud.versions)
          // Rows created on this device but not yet pushed stay dirty and go up next.
          setData(event === 'SIGNED_OUT' ? cloud.state : mergeCloud(dataRef.current, cloud.state))
          if (event === 'SIGNED_OUT') setNotices([])
        })()
      }, 0)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Live updates: other people's changes stream in over Supabase Realtime (RLS applies,
  // so each user only receives rows they're allowed to see).
  useEffect(() => {
    if (!supabase || !ready) return
    const client = supabase
    const channel = client.channel('apta-live')
    for (const key of LIVE_KEYS) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: tableOf(key) }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id
          if (!id) return
          synced.current[key].delete(id)
          versions.current[key].delete(id)
          setData((prev) => ({ ...prev, [key]: (prev[key] as Array<{ id: string }>).filter((r) => r.id !== id) }) as DataState)
          return
        }
        const raw = payload.new as { id: string; updated_at?: string }
        const local = (dataRef.current[key] as Array<{ id: string }>).find((r) => r.id === raw.id)
        // An unsaved local edit to the same row: leave it; the push will flag the conflict.
        if (local && synced.current[key].get(raw.id) !== local) return
        const row = fromDb(key, raw)
        synced.current[key].set(row.id, row)
        if (raw.updated_at) versions.current[key].set(row.id, raw.updated_at)
        replaceRows(key, [row])
      })
    }
    channel.subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [ready, replaceRows])

  // Local-only mode: this device's storage is the database.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      for (const key of DATA_KEYS) writeLocal(KEYS[key], data[key])
    }
  }, [data])

  // Cloud mode: push changed rows shortly after each mutation.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED || !ready) return
    const timer = window.setTimeout(() => void pushDirty(), 800)
    return () => window.clearTimeout(timer)
  }, [data, ready, pushDirty])

  const patch = (key: DataKey, rows: DataState[DataKey]) =>
    setData((prev) => ({ ...prev, [key]: rows }) as DataState)

  const value = useMemo<StoreShape>(
    () => ({
      ...data,
      ready,
      syncState: SUPABASE_CONFIGURED ? 'cloud' : 'local',
      setAccounts: (rows) => patch('accounts', rows),
      setLoginLogs: (rows) => patch('loginLogs', rows),
      setApplications: (rows) => patch('applications', rows),
      setBeneficiaries: (rows) => patch('beneficiaries', rows),
      setTransactions: (rows) => patch('transactions', rows),
      setPartners: (rows) => patch('partners', rows),
      setProgressReports: (rows) => patch('progressReports', rows),
      flushPending: pushDirty,
      notices,
      dismissNotice: (i) => setNotices((n) => n.filter((_, j) => j !== i)),
      clearAllData: async () => {
        markSynced(freshData(), emptyVersions())
        setData(freshData())
        for (const k of Object.values(KEYS)) window.localStorage.removeItem(k)
        // Sign out too: the session references an account that no longer exists.
        window.localStorage.removeItem('apta-session')
        await wipeAllCloud()
      },
      saveApplication: async (row) => {
        setData((prev) => {
          const idx = prev.applications.findIndex((a) => a.id === row.id)
          const next = idx >= 0 ? prev.applications.map((a) => (a.id === row.id ? row : a)) : [...prev.applications, row]
          return { ...prev, applications: next }
        })
        await latency()
      },
      upsertBeneficiary: async (row) => {
        setData((prev) => {
          const idx = prev.beneficiaries.findIndex((b) => b.id === row.id)
          const next = idx >= 0 ? prev.beneficiaries.map((b) => (b.id === row.id ? row : b)) : [...prev.beneficiaries, row]
          return { ...prev, beneficiaries: next }
        })
        await latency()
      },
      logAuthEvent: async (entry) => {
        const log: LoginLog = {
          id: uid('log'),
          timestamp: new Date().toISOString(),
          ipAddress: '', // browsers can't see their public IP; Supabase logs hold the real one
          userAgent: navigator.userAgent.slice(0, 80),
          ...entry,
        }
        setData((prev) => ({ ...prev, loginLogs: [log, ...prev.loginLogs].slice(0, 500) }))
        await latency()
      },
    }),
    [data, ready, pushDirty, notices],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/** Keep the Supabase client import used (tree-shake guard for local-only builds). */
export const hasCloud = (): boolean => supabase !== null
