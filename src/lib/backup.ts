import type { DataState } from './persistence'

/** Admin backups: one complete JSON file, plus CSVs that open cleanly in Excel / Google Sheets. */

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')

/** Drop fields that must never leave the database, even in an admin backup. */
function scrub(data: DataState): DataState {
  // Pick the tables explicitly: callers may pass the whole store object (with functions).
  return {
    accounts: data.accounts.map((a) => ({ ...a, passwordHash: '' })),
    loginLogs: data.loginLogs,
    applications: data.applications,
    beneficiaries: data.beneficiaries,
    transactions: data.transactions,
    partners: data.partners,
    progressReports: data.progressReports,
  }
}

export function downloadJsonBackup(data: DataState) {
  const payload = { exportedAt: new Date().toISOString(), app: 'APTA Empowers', data: scrub(data) }
  download(`apta-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), 'application/json')
}

function cell(v: unknown): string {
  let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  // Spreadsheets execute cells starting with = + - @ as formulas (CSV injection); neutralise them.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: object[]): string {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const lines = [cols.join(','), ...rows.map((r) => cols.map((c) => cell((r as Record<string, unknown>)[c])).join(','))]
  return '﻿' + lines.join('\r\n') // BOM so Excel reads Tamil text as UTF-8
}

export function downloadCsvBackup(data: DataState) {
  const clean = scrub(data)
  const s = stamp()
  const tables: Array<[string, object[]]> = [
    ['applications', clean.applications],
    ['beneficiaries', clean.beneficiaries],
    ['transactions', clean.transactions],
    ['partners', clean.partners],
    ['progress-reports', clean.progressReports],
    ['accounts', clean.accounts],
  ]
  // Browsers may ask once to allow multiple downloads.
  tables.forEach(([name, rows], i) => setTimeout(() => download(`apta-${name}-${s}.csv`, toCsv(rows), 'text/csv;charset=utf-8'), i * 300))
}
