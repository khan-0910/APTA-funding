import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  pushCollections,
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
  saveApplication: (row: Application) => Promise<void>
  upsertBeneficiary: (row: Beneficiary) => Promise<void>
  logAuthEvent: (entry: Omit<LoginLog, 'id' | 'timestamp' | 'ipAddress' | 'userAgent'>) => Promise<void>
}

const StoreContext = createContext<StoreShape | null>(null)

/**
 * Cloud copy wins for rows both sides know about; rows that exist only on this device
 * (e.g. the login-log entry written a moment ago, not yet pushed) are kept so the next
 * push still uploads them.
 */
function mergeCloud(local: DataState, cloud: DataState): { merged: DataState; hasLocalOnly: boolean } {
  let hasLocalOnly = false
  const merged = { ...cloud }
  for (const key of Object.keys(cloud) as DataKey[]) {
    const cloudRows = cloud[key] as Array<{ id: string }>
    const ids = new Set(cloudRows.map((r) => r.id))
    const localOnly = (local[key] as Array<{ id: string }>).filter((r) => !ids.has(r.id))
    if (localOnly.length > 0) {
      hasLocalOnly = true
      ;(merged as Record<DataKey, unknown>)[key] = [...cloudRows, ...localOnly]
    }
  }
  return { merged, hasLocalOnly }
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

  // Cloud mode: hydrate from PostgreSQL once at startup.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return
    let cancelled = false
    void (async () => {
      const cloud = await fetchAllCloud()
      if (!cancelled) {
        if (cloud) setData(cloud)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Cloud mode: re-hydrate when the Supabase Auth session changes. Once the anon
  // policies are dropped (auth-migration-part2.sql), a logged-out visitor can read
  // nothing, so the data must be fetched again under the new session after sign-in —
  // and cleared after sign-out so the next person on a shared computer sees nothing.
  const skipNextPush = useRef(false)
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
          setData((prev) => {
            if (event === 'SIGNED_OUT') {
              skipNextPush.current = true
              return cloud
            }
            const { merged, hasLocalOnly } = mergeCloud(prev, cloud)
            // Nothing new on this device → no need to echo the fresh copy back up.
            skipNextPush.current = !hasLocalOnly
            return merged
          })
        })()
      }, 0)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Mirror to localStorage so local-only mode (and offline resilience) keeps working.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      writeLocal(KEYS.accounts, data.accounts)
      writeLocal(KEYS.loginLogs, data.loginLogs)
      writeLocal(KEYS.applications, data.applications)
      writeLocal(KEYS.beneficiaries, data.beneficiaries)
      writeLocal(KEYS.transactions, data.transactions)
      writeLocal(KEYS.partners, data.partners)
      writeLocal(KEYS.progressReports, data.progressReports)
    }
  }, [data])

  // Cloud mode: push every mutation to PostgreSQL shortly after it happens.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED || !ready) return
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    const timer = window.setTimeout(() => {
      void pushCollections(
        ['accounts', 'loginLogs', 'applications', 'beneficiaries', 'transactions', 'partners', 'progressReports'],
        data,
      )
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [data, ready])

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
      clearAllData: async () => {
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
          ipAddress: '127.0.0.1 (client)',
          userAgent: navigator.userAgent.slice(0, 80),
          ...entry,
        }
        setData((prev) => ({ ...prev, loginLogs: [log, ...prev.loginLogs].slice(0, 500) }))
        await latency()
      },
    }),
    [data, ready],
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
