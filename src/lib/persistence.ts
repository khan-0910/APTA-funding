import { createClient, type SupabaseClient } from '@supabase/supabase-js'
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
  }
}

function fromDbAccount(r: any): UserAccount {
  return {
    id: r.id,
    name: r.name ?? 'Unknown',
    email: r.email ?? '',
    passwordHash: r.password_hash ?? '',
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

/** Fetch every table. Returns null when Supabase is unreachable/misconfigured. */
export async function fetchAllCloud(): Promise<DataState | null> {
  if (!supabase) return null
  try {
    const [accounts, logs, apps, bens, txns, parts, reports] = await Promise.all([
      supabase.from('user_accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('login_logs').select('*').order('timestamp', { ascending: false }).limit(500),
      supabase.from('applications').select('*').order('created_at', { ascending: false }),
      supabase.from('beneficiaries').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('partners').select('*').order('created_at', { ascending: true }),
      supabase.from('progress_reports').select('*').order('submitted_at', { ascending: false }),
    ])
    const errors = [accounts.error, logs.error, apps.error, bens.error, txns.error, parts.error, reports.error]
    if (errors.some(Boolean)) {
      console.warn(
        '[apta] Supabase fetch error(s):',
        errors.filter(Boolean).map((e) => (e as { message: string }).message).join('; '),
      )
      return null
    }
    return {
      accounts: (accounts.data ?? []).map(fromDbAccount),
      loginLogs: (logs.data ?? []).map(fromDbLoginLog),
      applications: (apps.data ?? []).map(fromDbApplication),
      beneficiaries: (bens.data ?? []).map(fromDbBeneficiary),
      transactions: (txns.data ?? []).map(fromDbTransaction),
      partners: (parts.data ?? []).map(fromDbPartner),
      progressReports: (reports.data ?? []).map(fromDbProgressReport),
    }
  } catch (err) {
    console.warn('[apta] Supabase unreachable, staying on local data:', err)
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Cloud write                                                         */
/* ------------------------------------------------------------------ */

/** Push the given (dirty) collections up to Supabase. Failures are logged, never thrown. */
export async function pushCollections(keys: DataKey[], data: DataState): Promise<void> {
  if (!supabase) return
  const jobs: Array<PromiseLike<unknown>> = []
  if (keys.includes('accounts')) {
    jobs.push(supabase.from('user_accounts').upsert(data.accounts.map(toDbAccount), { onConflict: 'id' }))
  }
  if (keys.includes('loginLogs')) {
    jobs.push(supabase.from('login_logs').upsert(data.loginLogs.map(toDbLoginLog), { onConflict: 'id' }))
  }
  if (keys.includes('applications')) {
    jobs.push(supabase.from('applications').upsert(data.applications.map(toDbApplication), { onConflict: 'id' }))
  }
  if (keys.includes('beneficiaries')) {
    jobs.push(supabase.from('beneficiaries').upsert(data.beneficiaries.map(toDbBeneficiary), { onConflict: 'id' }))
  }
  if (keys.includes('transactions')) {
    jobs.push(supabase.from('transactions').upsert(data.transactions.map(toDbTransaction), { onConflict: 'id' }))
  }
  if (keys.includes('partners')) {
    jobs.push(supabase.from('partners').upsert(data.partners.map(toDbPartner), { onConflict: 'id' }))
  }
  if (keys.includes('progressReports')) {
    jobs.push(supabase.from('progress_reports').upsert(data.progressReports.map(toDbProgressReport), { onConflict: 'id' }))
  }
  const results = await Promise.allSettled(jobs)
  for (const r of results) {
    if (r.status === 'rejected') console.warn('[apta] cloud push failed:', r.reason)
    else {
      const res = r.value as { error?: { message: string } | null }
      if (res?.error) console.warn('[apta] cloud push rejected:', res.error.message)
    }
  }
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
