import { supabase } from './persistence'

/**
 * Input checks that stop obviously wrong or made-up data at the form. The database
 * repeats the important ones (email domains, one open application, numeric ranges)
 * in supabase/auth-migration-part6-quality.sql, so they can't be bypassed via the API.
 */

/** Letters (Latin or Tamil), spaces, dots, apostrophes and hyphens; 2–80 characters. */
export function isValidName(name: string): boolean {
  const n = name.trim()
  return n.length >= 2 && n.length <= 80 && /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(n)
}

/** Indian mobile: 10 digits starting with 6–9 (spaces / +91 prefix ignored). */
export function isValidIndianMobile(raw: string): boolean {
  const d = raw.replace(/\D/g, '')
  const local = d.length === 12 && d.startsWith('91') ? d.slice(2) : d
  return /^[6-9]\d{9}$/.test(local)
}

export function isValidPinCode(pin: string): boolean {
  return /^[1-9]\d{5}$/.test(pin.trim())
}

// Verhoeff checksum tables (UIDAI uses Verhoeff for the last Aadhaar digit).
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

function verhoeffValid(digits: string): boolean {
  let c = 0
  digits.split('').reverse().forEach((ch, i) => {
    c = D[c][P[i % 8][Number(ch)]]
  })
  return c === 0
}

/** Check digit that makes `digits` + it Verhoeff-valid (used by the self-test). */
export function verhoeffDigit(digits: string): number {
  let c = 0
  digits.split('').reverse().forEach((ch, i) => {
    c = D[c][P[(i + 1) % 8][Number(ch)]]
  })
  return INV[c]
}

/** 12 digits, not starting with 0 or 1, with a valid Verhoeff check digit. */
export function isValidAadhaar(raw: string): boolean {
  const d = raw.replace(/\s/g, '')
  return /^[2-9]\d{11}$/.test(d) && verhoeffValid(d)
}

/** At least 8 characters with a letter and a number. */
export function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)
}

export const EMAIL_RULE_MESSAGE =
  'Please use a personal email from a recognised provider (Gmail, Outlook, Yahoo, iCloud, Rediff…) or your college / government address.'

// Mirrors the seed of public.allowed_email_domains; the database list is authoritative.
const DEFAULT_DOMAINS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.in', 'hotmail.com', 'live.com', 'live.in', 'msn.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'ymail.com', 'rocketmail.com', 'icloud.com', 'me.com', 'mac.com',
  'rediffmail.com', 'zoho.com', 'zohomail.com', 'zohomail.in', 'proton.me', 'protonmail.com', 'aol.com', 'gmx.com',
]
const DEFAULT_SUFFIXES = ['edu', 'edu.in', 'ac.in', 'gov.in', 'nic.in']

function locallyAllowed(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return DEFAULT_DOMAINS.includes(domain) || DEFAULT_SUFFIXES.some((s) => domain.endsWith(`.${s}`))
}

export function isEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

/** Asks the database's allowlist (editable in Supabase); falls back to the built-in list. */
export async function isAllowedEmail(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase()
  if (!isEmailFormat(e)) return false
  if (supabase) {
    const { data, error } = await supabase.rpc('apta_email_allowed', { email: e })
    if (!error && typeof data === 'boolean') return data
  }
  return locallyAllowed(e)
}
