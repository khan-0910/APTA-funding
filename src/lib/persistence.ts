import { createClient, type SupabaseClient, type Session, type AuthError } from '@supabase/supabase-js'
import type {
  Application,
  Beneficiary,
  LoginLog,
  Partner,
  ProgressReport,
  Transaction,
  UserAccount,
} from '@/types'

/**
 * Dual-layer persistence.
 * - Supabase configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY): PostgreSQL is the
 *   source of truth. Data is hydrated on load and every mutation is pushed to the cloud.
 * - Not configured: the app runs entirely on this device's localStorage with zero seed data.
 */
export const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    )
  : null

/** Simulated latency so interactions feel consistent in local-only mode. */
export function latency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 220 + Math.floor(Math.random() * 80)))
}

/** All persisted collections, mirroring the Supabase tables 1:1. */
export interface DataState {
  accounts: UserAccount[]
  loginLogs: LoginLog[]
  applications: Application[]
  beneficiaries: Beneficiary[]
  transactions: Transaction[]
  partners: Partner[]
  progressReports: ProgressReport[]
}

export type DataKey = keyof DataState

export function freshData(): DataState {
  return {
    accounts: [],
    loginLogs: [],
    applications: [],
    beneficiaries: [],
    transactions: [],
    partners: [],
    progressReports: [],
  }
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable — degrade gracefully */
  }
}

/* ------------------------------------------------------------------ */
/* Auth helpers (Supabase Auth migration)                              */
/* ------------------------------------------------------------------ */

/** Decode the `sub` (auth.users uuid) from a Supabase access token. */
export function decodeJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload?.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

/**
 * Current auth.users session, if any. Supabase-js v2 caches it in localStorage
 * under `sb-<project-ref>-auth-token`; reading it directly keeps this module the
 * single place that knows about storage details. Returns null when signed out
 * (i.e. pre-migration behaviour: everything flows through the anon key).
 */
export function getSupabaseSession(): Session | null {
  if (!supabase) return null
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const ref = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1]
  if (!ref) return null
  try {
    const raw = window.localStorage.getItem(`sb-${ref}-auth-token`)
    if (!raw) return null
    // supabase-js v2 stores the Session object itself; v1 wrapped it in `currentSession`.
    const parsed = JSON.parse(raw) as Partial<Session> & { currentSession?: Session }
    if (parsed.currentSession) return parsed.currentSession
    return parsed.access_token ? (parsed as Session) : null
  } catch {
    return null
  }
}

/** True when the error is an RLS/permission failure caused by a missing session. */
export function isSessionMissingError(err: { message?: string } | null | undefined): boolean {
  if (!err?.message) return false
  const m = err.message.toLowerCase()
  return (
    m.includes('row-level security') ||
    m.includes('permission denied') ||
    m.includes('jwt') ||
    m.includes('401')
  )
}

/**
 * Read the signed-in user's profile row, matching either the auth.users uuid
 * (post-migration rows) or the legacy custom text id (pre-migration rows).
 */
export async function fetchAuthUserRow(
  legacyId: string,
): Promise<{ row: UserAccount | null; error: { message: string } | null }> {
  if (!supabase) return { row: null, error: { message: 'supabase-not-configured' } }
  const authUid = decodeJwtSub(getSupabaseSession()?.access_token ?? '')
  if (authUid) {
    const byUid = await supabase.from('user_accounts').select('*').eq('auth_uid', authUid).maybeSingle()
    if (!byUid.error && byUid.data) return { row: fromDbAccount(byUid.data), error: null }
  }
  const byId = await supabase.from('user_accounts').select('*').eq('id', legacyId).maybeSingle()
  if (byId.error) return { row: null, error: byId.error }
  return { row: byId.data ? fromDbAccount(byId.data) : null, error: null }
}

/** Aggregate, PII-free numbers for the public landing page. */
export interface PublicStats {
  studentsFunded: number
  amountDisbursed: number
  inflowTotal: number
  graduated: number
  employed: number
  partners: number
}

/**
 * Landing-page stats via the `apta_public_stats()` RPC (auth-migration-part2.sql).
 * This keeps the public homepage working after anonymous table reads are locked down.
 * Returns null when Supabase isn't configured or the function isn't installed yet.
 */
export async function fetchPublicStats(): Promise<PublicStats | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('apta_public_stats')
    if (error || !data || typeof data !== 'object') return null
    const d = data as Record<string, unknown>
    const n = (k: string) => Number(d[k] ?? 0) || 0
    return {
      studentsFunded: n('studentsFunded'),
      amountDisbursed: n('amountDisbursed'),
      inflowTotal: n('inflowTotal'),
      graduated: n('graduated'),
      employed: n('employed'),
      partners: n('partners'),
    }
  } catch {
    return null
  }
}

/** Anonymous diagnostic: can the anon key read user_accounts right now? */
export async function probeAnonAccountsRead(): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('user_accounts').select('id').limit(1)
  return !error
}

/* ------------------------------------------------------------------ */
/* Row mappers (DB snake_case columns <-> domain camelCase types)      */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */

function toDbAccount(a: UserAccount) {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    password_hash: a.passwordHash,
    role: a.role,
    status: a.status,
    login_count: a.loginCount,
    created_at: a.createdAt,
    last_login_at: a.lastLoginAt,
    ...(a.authUid ? { auth_uid: a.authUid } : {}),
  }
}

function fromDbAccount(r: any): UserAccount {
  return {
    id: r.id,
    name: r.name ?? 'Unknown',
    email: r.email ?? '',
    passwordHash: r.password_hash ?? '',
    authUid: r.auth_uid ?? null,
    role: r.role ?? 'student',
    status: r.status ?? 'active',
    loginCount: Number(r.login_count ?? 0),
    createdAt: r.created_at ?? new Date().toISOString(),
    lastLoginAt: r.last_login_at ?? null,
  }
}

function toDbApplication(a: Application) {
  return {
    id: a.id,
    student_id: a.studentId,
    student_name: a.studentName,
    category: a.category,
    status: a.status,
    data: a,
    career_survey: a.careerSurvey ?? null,
    updated_at: new Date().toISOString(),
  }
}

function fromDbApplication(r: any): Application {
  const payload = (r.data ?? {}) as Partial<Application>
  return {
    ...payload,
    id: r.id,
    studentId: r.student_id ?? payload.studentId ?? '',
    studentName: r.student_name ?? payload.studentName ?? 'Unknown',
    category: r.category ?? payload.category ?? 'education',
    status: r.status ?? payload.status ?? 'submitted',
  } as Application
}

function toDbBeneficiary(b: Beneficiary) {
  return {
    id: b.id,
    student_id: b.studentId ?? null,
    name: b.name,
    category: b.category,
    education_level: b.educationLevel ?? null,
    funding_received: b.fundingReceived,
    program: b.program,
    status: b.status,
    enrolled_since: b.enrolledSince,
    expected_graduation: b.expectedGraduation,
    current_gpa: b.currentGpa,
    career_survey: b.careerSurvey ?? null,
  }
}

function fromDbBeneficiary(r: any): Beneficiary {
  return {
    id: r.id,
    studentId: r.student_id ?? undefined,
    name: r.name ?? 'Unknown',
    category: r.category ?? 'education',
    educationLevel: r.education_level ?? undefined,
    fundingReceived: Number(r.funding_received ?? 0),
    program: r.program ?? '',
    status: r.status ?? 'active',
    enrolledSince: r.enrolled_since ?? new Date().toISOString(),
    expectedGraduation: r.expected_graduation ?? '',
    currentGpa: Number(r.current_gpa ?? 0),
    careerSurvey: r.career_survey ?? undefined,
  }
}

function toDbTransaction(t: Transaction) {
  return {
    id: t.id,
    date: t.date,
    amount: t.amount,
    direction: t.direction,
    category: t.category,
    description: t.description,
    reconciled: t.reconciled,
    related_partner_id: t.relatedPartnerId ?? null,
  }
}

function fromDbTransaction(r: any): Transaction {
  return {
    id: r.id,
    date: r.date,
    amount: Number(r.amount ?? 0),
    direction: r.direction ?? 'inflow',
    category: r.category ?? 'donation',
    description: r.description ?? '',
    reconciled: Boolean(r.reconciled),
    relatedPartnerId: r.related_partner_id ?? undefined,
  }
}

function toDbPartner(p: Partner) {
  return {
    id: p.id,
    org_name: p.orgName,
    contact_name: p.contactName,
    contact_email: p.contactEmail,
    relationship_status: p.relationshipStatus,
    total_contributed: p.totalContributed,
    last_contacted_at: p.lastContactedAt,
  }
}

function fromDbPartner(r: any): Partner {
  return {
    id: r.id,
    orgName: r.org_name ?? 'Unknown',
    contactName: r.contact_name ?? '—',
    contactEmail: r.contact_email ?? '',
    relationshipStatus: r.relationship_status ?? 'individual_donor',
    totalContributed: Number(r.total_contributed ?? 0),
    lastContactedAt: r.last_contacted_at ?? new Date().toISOString(),
  }
}

function toDbProgressReport(r: ProgressReport) {
  return {
    id: r.id,
    student_id: r.studentId,
    student_name: r.studentName,
    semester: r.semester,
    status: r.status,
    gpa: r.gpa,
    narrative: r.narrative,
    submitted_at: r.submittedAt,
    review_notes: r.reviewNotes ?? null,
  }
}

function fromDbProgressReport(r: any): ProgressReport {
  return {
    id: r.id,
    studentId: r.student_id ?? '',
    studentName: r.student_name ?? '',
    semester: r.semester ?? '',
    status: r.status ?? 'pending',
    gpa: Number(r.gpa ?? 0),
    narrative: r.narrative ?? '',
    submittedAt: r.submitted_at ?? new Date().toISOString(),
    reviewNotes: r.review_notes ?? undefined,
  }
}

function toDbLoginLog(l: LoginLog) {
  return {
    id: l.id,
    user_id: l.userId,
    user_email: l.userEmail,
    role: l.role,
    action: l.action,
    ip_address: l.ipAddress,
    user_agent: l.userAgent,
    status: l.status,
    timestamp: l.timestamp,
  }
}

function fromDbLoginLog(r: any): LoginLog {
  return {
    id: r.id,
    userId: r.user_id ?? null,
    userEmail: r.user_email ?? '',
    role: r.role ?? 'unknown',
    action: r.action ?? 'LOGIN_SUCCESS',
    ipAddress: r.ip_address ?? '',
    userAgent: r.user_agent ?? '',
    status: r.status ?? 'info',
    timestamp: r.timestamp ?? new Date().toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* Cloud read                                                          */
/* ------------------------------------------------------------------ */

/** Last `updated_at` seen from the cloud for each row, per collection (edit-conflict checks). */
export type Versions = Record<DataKey, Map<string, string>>

export function emptyVersions(): Versions {
  return Object.fromEntries(Object.keys(freshData()).map((k) => [k, new Map()])) as Versions
}

const TABLES: Record<DataKey, { table: string; toDb: (row: any) => unknown; fromDb: (row: any) => unknown }> = {
  accounts: { table: 'user_accounts', toDb: toDbAccount, fromDb: fromDbAccount },
  loginLogs: { table: 'login_logs', toDb: toDbLoginLog, fromDb: fromDbLoginLog },
  applications: { table: 'applications', toDb: toDbApplication, fromDb: fromDbApplication },
  beneficiaries: { table: 'beneficiaries', toDb: toDbBeneficiary, fromDb: fromDbBeneficiary },
  transactions: { table: 'transactions', toDb: toDbTransaction, fromDb: fromDbTransaction },
  partners: { table: 'partners', toDb: toDbPartner, fromDb: fromDbPartner },
  progressReports: { table: 'progress_reports', toDb: toDbProgressReport, fromDb: fromDbProgressReport },
}

export const tableOf = (key: DataKey): string => TABLES[key].table

/** Map a raw database row (e.g. from a Realtime event) to the app's shape. */
export function fromDb(key: DataKey, raw: unknown): { id: string } {
  return TABLES[key].fromDb(raw) as { id: string }
}

/** Collections where another person's concurrent edit is worth guarding against. */
const VERSIONED: DataKey[] = ['applications', 'beneficiaries', 'transactions', 'partners', 'progressReports']

const sameVersion = (a: string, b: string) => Date.parse(a) === Date.parse(b)

/**
 * Fetch every table. Returns null when Supabase is unreachable/misconfigured.
 * If the first fetch fails on permission grounds while an Auth session exists
 * (e.g. the browser refreshed a token mid-boot), it retries once with the
 * refreshed session before giving up.
 */
export async function fetchAllCloud(): Promise<{ state: DataState; versions: Versions } | null> {
  if (!supabase) return null
  try {
    const fetchOnce = async () =>
      Promise.all([
        supabase!.from('user_accounts').select('*').order('created_at', { ascending: true }),
        supabase!.from('login_logs').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase!.from('applications').select('*').order('created_at', { ascending: false }),
        supabase!.from('beneficiaries').select('*').order('created_at', { ascending: false }),
        supabase!.from('transactions').select('*').order('date', { ascending: false }),
        supabase!.from('partners').select('*').order('created_at', { ascending: true }),
        supabase!.from('progress_reports').select('*').order('submitted_at', { ascending: false }),
      ])

    let results = await fetchOnce()
    if (results.some((r) => r.error) && getSupabaseSession()) {
      await supabase.auth.getSession() // refresh the local session if needed
      results = await fetchOnce()
    }
    const errors = results.map((r) => r.error).filter(Boolean)
    if (errors.length > 0) {
      console.warn('[apta] Supabase fetch error(s):', errors.map((e) => e!.message).join('; '))
      return null
    }
    const keys: DataKey[] = ['accounts', 'loginLogs', 'applications', 'beneficiaries', 'transactions', 'partners', 'progressReports']
    const state = freshData()
    const versions = emptyVersions()
    keys.forEach((key, i) => {
      const rows = (results[i].data ?? []) as Array<{ id: string; updated_at?: string }>
      ;(state as Record<DataKey, unknown[]>)[key] = rows.map((r) => TABLES[key].fromDb(r))
      for (const r of rows) if (r.updated_at) versions[key].set(r.id, r.updated_at)
    })
    return { state, versions }
  } catch (err) {
    console.warn('[apta] Supabase unreachable, staying on local data:', err)
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Cloud write                                                         */
/* ------------------------------------------------------------------ */

export interface PushResult {
  /** Rows the cloud accepted (now in sync). */
  saved: string[]
  /** Rows someone else changed first: the latest cloud version, which was not overwritten. */
  conflicts: Array<{ row: { id: string }; version: string }>
}

/**
 * Upsert only the given (changed) rows of one collection.
 *
 * Before overwriting an existing row it compares the row's current `updated_at` in the
 * cloud with the version this browser last saw (`known`). If someone else saved it in
 * between, the row is not pushed and comes back as a conflict, so their edit is never
 * silently lost. `known` is updated with the new versions of rows that were saved.
 * Profiles linked to Supabase Auth are never bulk-pushed (see auth.tsx).
 */
export async function pushRows(key: DataKey, rows: Array<{ id: string }>, known: Map<string, string>): Promise<PushResult> {
  const result: PushResult = { saved: [], conflicts: [] }
  if (!supabase) return { saved: rows.map((r) => r.id), conflicts: [] }
  const { table, toDb, fromDb: map } = TABLES[key]
  let pushable = key === 'accounts' ? (rows as UserAccount[]).filter((a) => !a.authUid) : rows
  // Linked profiles are written elsewhere; count them as handled so they stop being "dirty".
  result.saved.push(...rows.filter((r) => !pushable.includes(r)).map((r) => r.id))

  try {
    const updates = VERSIONED.includes(key) ? pushable.filter((r) => known.has(r.id)) : []
    if (updates.length > 0) {
      const { data, error } = await supabase.from(table).select('*').in('id', updates.map((r) => r.id))
      if (error) {
        console.warn(`[apta] conflict check on ${table} failed:`, error.message)
        return result
      }
      const stale = new Set<string>()
      for (const cloud of (data ?? []) as Array<{ id: string; updated_at?: string }>) {
        const seen = known.get(cloud.id)
        if (cloud.updated_at && seen && !sameVersion(cloud.updated_at, seen)) {
          stale.add(cloud.id)
          known.set(cloud.id, cloud.updated_at)
          result.conflicts.push({ row: map(cloud) as { id: string }, version: cloud.updated_at })
        }
      }
      pushable = pushable.filter((r) => !stale.has(r.id))
    }
    if (pushable.length === 0) return result

    const { data, error } = await supabase
      .from(table)
      .upsert(pushable.map(toDb), { onConflict: 'id' })
      // '*' rather than 'id, updated_at': naming a column part5-live.sql hasn't added yet
      // would make every save fail. Without the column, conflict checks are simply skipped.
      .select('*')
    if (error) {
      console.warn(`[apta] cloud push to ${table} rejected:`, error.message)
      return result
    }
    for (const r of (data ?? []) as unknown as Array<{ id: string; updated_at?: string }>) {
      if (r.updated_at) known.set(r.id, r.updated_at)
    }
    result.saved.push(...pushable.map((r) => r.id))
  } catch (err) {
    console.warn(`[apta] cloud push to ${table} failed:`, err)
  }
  return result
}

/* ------------------------------------------------------------------ */
/* Document storage (Supabase Storage bucket "documents")              */
/* ------------------------------------------------------------------ */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_UPLOAD_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

/**
 * Upload a file to the private "documents" bucket under the signed-in user's folder
 * (the storage policy only allows writes to `<auth uid>/...`). Returns the object path.
 */
export async function uploadDocument(file: File, folder: string): Promise<string> {
  if (!supabase) throw new Error('Uploads need the cloud database.')
  const uid = decodeJwtSub(getSupabaseSession()?.access_token ?? '')
  if (!uid) throw new Error('Sign in again to upload documents.')
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80)
  const path = `${uid}/${folder}/${Date.now().toString(36)}-${safeName}`
  const { error } = await supabase.storage.from('documents').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
}

/** Returns an error message when a file can't be accepted, otherwise null. */
export function checkUpload(file: File): string | null {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return `${file.name}: only PDF, PNG or JPG files are accepted.`
  // localStorage holds ~5 MB in total, so local-only mode takes much smaller files.
  const limit = supabase ? MAX_UPLOAD_BYTES : 1024 * 1024
  if (file.size > limit) return `${file.name}: files must be under ${limit / 1024 / 1024} MB.`
  return null
}

/** Cloud: upload to Storage. Local-only mode: inline the file as a data: URL. */
export async function storeFile(file: File, folder: string): Promise<{ storagePath?: string; dataUrl?: string }> {
  if (supabase) return { storagePath: await uploadDocument(file, folder) }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
  return { dataUrl }
}

/** Short-lived download link for a stored document (RLS decides who may read it). */
export async function documentUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60)
  return error ? null : data.signedUrl
}

/** Delete every row in every cloud table (login logs first due to the FK). */
export async function wipeAllCloud(): Promise<void> {
  if (!supabase) return
  const tables = ['login_logs', 'applications', 'beneficiaries', 'transactions', 'partners', 'progress_reports', 'user_accounts']
  const results = await Promise.allSettled(tables.map((t) => supabase.from(t).delete().neq('id', '')))
  for (const r of results) {
    if (r.status === 'rejected') console.warn('[apta] cloud wipe failed:', r.reason)
  }
}

export type { AuthError }
