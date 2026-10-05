/** Indian-locale formatting helpers. */

export function formatINR(amount: number | undefined | null, opts: { compact?: boolean } = {}): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  if (opts.compact) {
    if (Math.abs(value) >= 1_00_00_000) return `₹${trim(value / 1_00_00_000)} Cr`
    if (Math.abs(value) >= 1_00_000) return `₹${trim(value / 1_00_000)} L`
    if (Math.abs(value) >= 1_000) return `₹${trim(value / 1_000)}K`
    return `₹${trim(value)}`
  }
  return `₹${formatIndianNumber(value)}`
}

export function formatIndianNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value))
}

function trim(n: number): string {
  const fixed = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^91/, '').slice(0, 10)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)} ${digits.slice(5)}`
}

export function formatAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function maskAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 12) return formatAadhaar(digits)
  return `XXXX XXXX ${digits.slice(8)}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short' })
}
