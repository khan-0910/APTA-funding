import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserAccount, UserRole } from '@/types'
import { useStore } from './store'
import { hashPassword, verifyPassword } from './hash'
import { latency, supabase, decodeJwtSub, fetchAuthUserRow, getSupabaseSession } from './persistence'

const SESSION_KEY = 'apta-session'

export interface AuthResult {
  ok: boolean
  error?: string
  /** false when the operation succeeded but did not start a session (e.g. admin created a colleague). */
  signedIn?: boolean
}

interface AuthShape {
  user: UserAccount | null
  isAuthReady: boolean
  /** True once at least one admin account exists — gates staff/admin self-registration. */
  adminExists: boolean
  /** True when this browser holds a real Supabase Auth session (vs legacy custom session). */
  isSupabaseAuthed: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<AuthResult>
  signOut: () => Promise<void>
  /** Sends the password-reset email (Supabase Auth). */
  resetPassword: (email: string) => Promise<AuthResult>
  /** Sets a new password for the currently-authed user (reset-link or signed-in flow). */
  updatePassword: (newPassword: string) => Promise<AuthResult>
  can: (permission: 'review' | 'manage_partners' | 'accounting' | 'audit' | 'view_beneficiaries') => boolean
  setDevRole: (role: UserRole) => void
  devRoleOverride: UserRole | null
}

const AuthContext = createContext<AuthShape | null>(null)

interface RawSession {
  userId: string
  devRoleOverride: UserRole | null
  authUid?: string | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [authUid, setAuthUid] = useState<string | null>(null)
  const [isAuthReady, setAuthReady] = useState(false)
  const [devRoleOverride, setDevRoleOverride] = useState<UserRole | null>(null)

  // Boot: restore the custom session, then upgrade it to a Supabase Auth session if one
  // exists in this browser (the auth token survives reloads via supabase-js storage).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      let storedUserId: string | null = null
      let storedDevRole: UserRole | null = null
      try {
        const raw = window.localStorage.getItem(SESSION_KEY) as string | null
        if (raw) {
          const session = JSON.parse(raw) as RawSession
          storedUserId = session.userId
          storedDevRole = session.devRoleOverride ?? null
          setUserId(session.userId)
          setDevRoleOverride(storedDevRole)
          setAuthUid(session.authUid ?? null)
        }
      } catch {
        /* ignore corrupt session */
      }
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession()
          const token = data.session?.access_token
          const uid = token ? decodeJwtSub(token) : null
          if (uid && !cancelled) {
            const { row } = await fetchAuthUserRow(storedUserId ?? '')
            if (row) {
              setUserId(row.id)
              setAuthUid(uid)
              writeSession({ userId: row.id, devRoleOverride: storedDevRole, authUid: uid })
              // Seed the profile into the store so the UI does not wait for full hydration.
              if (!store.accounts.some((a) => a.id === row.id)) {
                store.setAccounts([...store.accounts, row])
              }
            } else {
              console.warn('[apta] Auth session exists but no profile row found for', uid)
              setAuthUid(uid)
            }
          }
        } catch {
          /* keep whatever custom session we restored */
        }
      }
      if (!cancelled) setAuthReady(true)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistSession = useCallback((userIdArg: string | null, devRole: UserRole | null, uid: string | null) => {
    if (userIdArg === null) {
      window.localStorage.removeItem(SESSION_KEY)
    } else {
      writeSession({ userId: userIdArg, devRoleOverride: devRole, authUid: uid })
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

  const upsertLocalAccount = useCallback(
    (account: UserAccount) => {
      const exists = store.accounts.some((a) => a.id === account.id)
      store.setAccounts(
        exists
          ? store.accounts.map((a) => (a.id === account.id ? account : a))
          : [...store.accounts, account],
      )
    },
    [store],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const normalized = email.trim().toLowerCase()
      if (!supabase) await latency()

      // ---- Supabase Auth (primary) ----
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password })
        if (!error && data.session) {
          const uid = data.user?.id ?? decodeJwtSub(data.session.access_token) ?? null
          const { row } = await fetchAuthUserRow('')
          if (row && row.status !== 'disabled') {
            const updated: UserAccount = {
              ...row,
              loginCount: row.loginCount + 1,
              lastLoginAt: new Date().toISOString(),
            }
            upsertLocalAccount(updated)
            setUserId(updated.id)
            setAuthUid(uid)
            setDevRoleOverride(null)
            persistSession(updated.id, null, uid)
            if (supabase && row.authUid) {
              // Bookkeeping under the user's own session (bulk push skips authed rows).
              void supabase
                .from('user_accounts')
                .update({ login_count: updated.loginCount, last_login_at: updated.lastLoginAt })
                .eq('auth_uid', row.authUid)
            }
            await logEvent('LOGIN_SUCCESS', updated, normalized, 'success', updated.role)
            return { ok: true }
          }
          if (row && row.status === 'disabled') {
            await supabase.auth.signOut()
            await logEvent('LOGIN_FAILED', row, normalized, 'failure', row.role)
            return { ok: false, error: 'This account is disabled.' }
          }
          // Auth user without a profile row (trigger missing / DB drifted): keep them
          // signed in at the Auth layer but treat the app profile as absent.
          console.warn('[apta] No profile row for auth user', uid)
        }
        // Auth failed → fall through to legacy verification (pre-migration accounts).
      }

      // ---- Legacy custom-hash verification (pre-migration accounts) ----
      if (!supabase) await latency()
      const account = store.accounts.find((a) => a.email.toLowerCase() === normalized)
      if (!account || !verifyPassword(password, account.passwordHash) || account.status !== 'active') {
        await logEvent('LOGIN_FAILED', account ?? null, normalized, 'failure', account?.role ?? 'unknown')
        return {
          ok: false,
          error: !account
            ? 'No account found for this email.'
            : account.status !== 'active'
              ? 'This account is disabled.'
              : 'Incorrect password or disabled account.',
        }
      }
      const updated = store.accounts.map((a) =>
        a.id === account.id ? { ...a, loginCount: a.loginCount + 1, lastLoginAt: new Date().toISOString() } : a,
      )
      store.setAccounts(updated)
      setUserId(account.id)
      setAuthUid(null)
      setDevRoleOverride(null)
      persistSession(account.id, null, null)
      await logEvent('LOGIN_SUCCESS', account, normalized, 'success', account.role)
      return { ok: true }
    },
    [store, logEvent, persistSession, upsertLocalAccount],
  )

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole): Promise<AuthResult> => {
      const normalized = email.trim().toLowerCase()
      if (!supabase) await latency()

      // Privileged roles require an organisation admin (UI hides the options; this is
      // the backstop against crafted requests).
      if (role !== 'student') {
        const signedInAdmin = user?.role === 'admin' && user.status === 'active'
        if (store.accounts.some((a) => a.role === 'admin') && !signedInAdmin) {
          await logEvent('ACCOUNT_CREATED', null, normalized, 'failure', role)
          return { ok: false, error: 'Staff and Admin accounts can only be created by a signed-in Admin / ஊழியர் மற்றும் நிர்வாகி கணக்குகளை நிர்வாகி மட்டுமே உருவாக்க முடியும்.' }
        }
        if (!store.accounts.some((a) => a.role === 'admin')) {
          await logEvent('ACCOUNT_CREATED', null, normalized, 'failure', role)
          return { ok: false, error: 'No admin exists yet. Have your organisation seed the first admin account from the server / முதல் நிர்வாகி கணக்கை சேவையகத்தில் உருவாக்க வேண்டும்.' }
        }
      }

      if (store.accounts.some((a) => a.email.toLowerCase() === normalized)) {
        return { ok: false, error: 'An account with this email already exists.' }
      }

      // ---- Local-only mode: legacy registration ----
      if (!supabase) {
        const account: UserAccount = {
          id: `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          name: name.trim(),
          email: normalized,
          passwordHash: hashPassword(password),
          authUid: null,
          role,
          status: 'active',
          loginCount: 0,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
        }
        upsertLocalAccount(account)
        await logEvent('ACCOUNT_CREATED', account, normalized, 'info', role)
        setUserId(account.id)
        setAuthUid(null)
        setDevRoleOverride(null)
        persistSession(account.id, null, null)
        await logEvent('LOGIN_SUCCESS', account, normalized, 'success', role)
        return { ok: true }
      }

      // ---- Supabase Auth registration ----
      // Remember the acting admin's session: signUp would otherwise replace it with
      // the newly-created user's session.
      const prevSession: Session | null = getSupabaseSession()
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { data: { full_name: name.trim() } },
      })
      if (error) {
        const msg = error.message.toLowerCase()
        await logEvent('ACCOUNT_CREATED', null, normalized, 'failure', role)
        return {
          ok: false,
          error: msg.includes('already registered') || msg.includes('already exists')
            ? 'An account with this email already exists.'
            : `Sign-up failed: ${error.message}`,
        }
      }
      if (!data.session) {
        // Email confirmation is enabled server-side — no instant session.
        return { ok: false, error: 'Account created. Check your email to confirm, then sign in / கணக்கு உருவாக்கப்பட்டது — மின்னஞ்சலை சரிபார்த்து உள்நுழையுங்கள்.' }
      }

      const uid = data.user?.id ?? null
      const { row } = await fetchAuthUserRow('')
      let createdAccount: UserAccount | null = row
      if (!createdAccount) {
        // Trigger missing: synthesise a local profile (never pushed, authUid set).
        createdAccount = {
          id: `acc-auth-local-${Date.now().toString(36)}`,
          name: name.trim(),
          email: normalized,
          passwordHash: 'supabase-auth',
          authUid: uid,
          role: 'student',
          status: 'active',
          loginCount: 0,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
        }
        console.warn('[apta] Profile trigger did not fire; created local-only profile for', normalized)
      }

      // Promote role for staff/admin creation, under the restored admin session.
      if (role !== 'student' && prevSession) {
        await supabase.auth.setSession({
          access_token: prevSession.access_token,
          refresh_token: prevSession.refresh_token,
        })
        if (createdAccount.authUid) {
          const { error: promoteError } = await supabase
            .from('user_accounts')
            .update({ role })
            .eq('auth_uid', createdAccount.authUid)
          if (promoteError) {
            await logEvent('ACCOUNT_CREATED', createdAccount, normalized, 'failure', role)
            return { ok: false, error: `Created the login but could not set the role (${promoteError.message}).` }
          }
          createdAccount = { ...createdAccount, role }
        }
      }

      upsertLocalAccount(createdAccount)
      await logEvent('ACCOUNT_CREATED', createdAccount, normalized, 'info', role)

      if (role !== 'student') {
        // Admin created a colleague: keep the ADMIN signed in.
        await logEvent('LOGIN_SUCCESS', createdAccount, normalized, 'info', role)
        return { ok: true, signedIn: false }
      }

      // Student self-registration: they are now signed in as themselves.
      setUserId(createdAccount.id)
      setAuthUid(uid)
      setDevRoleOverride(null)
      persistSession(createdAccount.id, null, uid)
      await logEvent('LOGIN_SUCCESS', createdAccount, normalized, 'success', createdAccount.role)
      return { ok: true }
    },
    [store, logEvent, persistSession, upsertLocalAccount, user],
  )

  const signOut = useCallback(async () => {
    if (user) {
      await logEvent('LOGOUT', user, user.email, 'info', user.role)
    }
    if (authUid && supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        /* already signed out */
      }
    }
    setUserId(null)
    setAuthUid(null)
    setDevRoleOverride(null)
    persistSession(null, null, null)
  }, [user, authUid, logEvent, persistSession])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Password reset requires the cloud database.' }
    const redirectTo = `${window.location.origin}/APTA-funding/reset`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
    // Supabase returns success even for unknown emails (no account enumeration).
    if (error) return { ok: false, error: `Could not send reset email: ${error.message}` }
    return { ok: true }
  }, [])

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'Password update requires the cloud database.' }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: `Could not update password: ${error.message}` }
    return { ok: true }
  }, [])

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
      persistSession(userId, role, authUid)
    },
    [userId, authUid, persistSession],
  )

  const adminExists = useMemo(() => store.accounts.some((a) => a.role === 'admin'), [store.accounts])

  const value = useMemo<AuthShape>(
    () => ({
      user,
      isAuthReady,
      adminExists,
      isSupabaseAuthed: !!authUid,
      signIn,
      register,
      signOut,
      resetPassword,
      updatePassword,
      can,
      setDevRole,
      devRoleOverride,
    }),
    [user, isAuthReady, adminExists, authUid, signIn, register, signOut, resetPassword, updatePassword, can, setDevRole, devRoleOverride],
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
