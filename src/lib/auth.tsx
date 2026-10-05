import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { UserAccount, UserRole } from '@/types'
import { useStore } from './store'
import { hashPassword, verifyPassword } from './hash'
import { latency } from './persistence'

const SESSION_KEY = 'apta-session'

export interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthShape {
  user: UserAccount | null
  isAuthReady: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<AuthResult>
  signOut: () => Promise<void>
  can: (permission: 'review' | 'manage_partners' | 'accounting' | 'audit' | 'view_beneficiaries') => boolean
  setDevRole: (role: UserRole) => void
  devRoleOverride: UserRole | null
}

const AuthContext = createContext<AuthShape | null>(null)

interface RawSession {
  userId: string
  devRoleOverride: UserRole | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [isAuthReady, setAuthReady] = useState(false)
  const [devRoleOverride, setDevRoleOverride] = useState<UserRole | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY) as string | null
      if (raw) {
        const session = JSON.parse(raw) as RawSession
        setUserId(session.userId)
        setDevRoleOverride(session.devRoleOverride ?? null)
      }
    } catch {
      /* ignore corrupt session */
    }
    setAuthReady(true)
  }, [])

  const persistSession = useCallback((userIdArg: string | null, devRole: UserRole | null) => {
    if (userIdArg === null) {
      window.localStorage.removeItem(SESSION_KEY)
    } else {
      writeSession({ userId: userIdArg, devRoleOverride: devRole })
    }
  }, [])

  const user = useMemo(() => {
    if (!userId) return null
    return store.accounts.find((a) => a.id === userId) ?? null
  }, [userId, store.accounts])

  const effectiveRole: UserRole | null = user
    ? (devRoleOverride ?? user.role)
    : devRoleOverride

  const logEvent = useCallback(
    async (
      action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCOUNT_CREATED' | 'LOGOUT',
      account: UserAccount | null,
      email: string,
      status: 'success' | 'failure' | 'info',
      role: UserRole | 'unknown',
    ) => {
      await store.logAuthEvent({ action, userEmail: email, role, status, userId: account?.id ?? null })
    },
    [store],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      await latency()
      const normalized = email.trim().toLowerCase()
      const account = store.accounts.find((a) => a.email.toLowerCase() === normalized)
      if (!account || !verifyPassword(password, account.passwordHash) || account.status !== 'active') {
        await logEvent('LOGIN_FAILED', account ?? null, normalized, 'failure', account?.role ?? 'unknown')
        return { ok: false, error: !account ? 'No account found for this email.' : 'Incorrect password or disabled account.' }
      }
      const updated = store.accounts.map((a) =>
        a.id === account.id ? { ...a, loginCount: a.loginCount + 1, lastLoginAt: new Date().toISOString() } : a,
      )
      store.setAccounts(updated)
      setUserId(account.id)
      setDevRoleOverride(null)
      persistSession(account.id, null)
      await logEvent('LOGIN_SUCCESS', account, normalized, 'success', account.role)
      return { ok: true }
    },
    [store, logEvent, persistSession],
  )

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole): Promise<AuthResult> => {
      await latency()
      const normalized = email.trim().toLowerCase()
      if (store.accounts.some((a) => a.email.toLowerCase() === normalized)) {
        return { ok: false, error: 'An account with this email already exists.' }
      }
      const account: UserAccount = {
        id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        email: normalized,
        passwordHash: hashPassword(password),
        role,
        status: 'active',
        loginCount: 0,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      }
      store.setAccounts([...store.accounts, account])
      await logEvent('ACCOUNT_CREATED', account, normalized, 'info', role)
      setUserId(account.id)
      setDevRoleOverride(null)
      persistSession(account.id, null)
      await logEvent('LOGIN_SUCCESS', account, normalized, 'success', role)
      return { ok: true }
    },
    [store, logEvent, persistSession],
  )

  const signOut = useCallback(async () => {
    if (user) {
      await logEvent('LOGOUT', user, user.email, 'info', user.role)
    }
    setUserId(null)
    setDevRoleOverride(null)
    persistSession(null, null)
  }, [user, logEvent, persistSession])

  const can = useCallback(
    (permission: 'review' | 'manage_partners' | 'accounting' | 'audit' | 'view_beneficiaries'): boolean => {
      if (!effectiveRole) return false
      if (effectiveRole === 'admin') return true
      if (effectiveRole === 'staff') return permission !== 'audit'
      return false
    },
    [effectiveRole],
  )

  const setDevRole = useCallback(
    (role: UserRole) => {
      setDevRoleOverride(role)
      persistSession(userId, role)
    },
    [userId, persistSession],
  )

  const value = useMemo<AuthShape>(
    () => ({
      user,
      isAuthReady,
      signIn,
      register,
      signOut,
      can,
      setDevRole,
      devRoleOverride,
    }),
    [user, isAuthReady, signIn, register, signOut, can, setDevRole, devRoleOverride],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function writeSession(session: RawSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
}

export function useAuth(): AuthShape {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
