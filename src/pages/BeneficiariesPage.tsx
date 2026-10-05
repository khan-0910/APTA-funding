import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BadgeIndianRupee,
  Briefcase,
  GraduationCap,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDate, formatINR, monthLabel } from '@/lib/format'
import { CareerBadge, EmptyState, Field, KpiCard, Modal, PageHeader } from '@/components/ui'
import { CareerTransitionModal } from '@/components/career-transition-modal'
import type { Beneficiary } from '@/types'

export function BeneficiariesPage() {
  const store = useStore()
  const { can } = useAuth()
  const [careerFor, setCareerFor] = useState<Beneficiary | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const kpis = useMemo(() => {
    const total = store.beneficiaries.reduce((s, b) => s + b.fundingReceived, 0)
    const active = store.beneficiaries.filter((b) => b.status === 'active').length
    const completed = store.beneficiaries.filter((b) => b.status === 'completed').length
    const graded = store.beneficiaries.filter((b) => b.currentGpa > 0)
    const avgGpa = graded.length ? graded.reduce((s, b) => s + b.currentGpa, 0) / graded.length : 0
    return { total, active, completed, avgGpa }
  }, [store.beneficiaries])

  const placement = useMemo(() => {
    const surveyed = store.beneficiaries.filter((b) => b.careerSurvey)
    const employed = surveyed.filter((b) => b.careerSurvey?.status === 'already_employed')
    const salaries = employed.map((b) => b.careerSurvey?.monthlySalary ?? 0).filter((s) => s > 0)
    const avgSalary = salaries.length ? salaries.reduce((s, v) => s + v, 0) / salaries.length : 0
    const seeking = surveyed.filter((b) => b.careerSurvey?.status === 'seeking_job')
    const other = surveyed.filter(
      (b) => b.careerSurvey && !['already_employed', 'seeking_job'].includes(b.careerSurvey.status),
    )
    return {
      surveyed,
      rate: surveyed.length ? Math.round((employed.length / surveyed.length) * 100) : 0,
      avgSalary,
      seeking,
      other,
    }
  }, [store.beneficiaries])

  const trajectory = useMemo(() => {
    const months: Array<{ month: string; outflow: number; cumulative: number }> = []
    let cumulative = 0
    const byMonth = new Map<string, number>()
    for (const t of store.transactions) {
      if (t.direction !== 'outflow') continue
      const key = t.date.slice(0, 7)
      byMonth.set(key, (byMonth.get(key) ?? 0) + t.amount)
    }
    const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
    for (const [key, amount] of sorted) {
      cumulative += amount
      months.push({
        month: monthLabel(new Date(`${key}-15T00:00:00`)),
        outflow: amount,
        cumulative,
      })
    }
    return months
  }, [store.transactions])

  const breakdown = useMemo(() => {
    const byCategory = { education: 0, health_social: 0, business: 0 }
    const byLevel = { schooling: 0, undergraduate: 0, postgraduate: 0 }
    for (const b of store.beneficiaries) {
      byCategory[b.category] += b.fundingReceived
      if (b.educationLevel) byLevel[b.educationLevel] += b.fundingReceived
    }
    return { byCategory, byLevel }
  }, [store.beneficiaries])

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Beneficiary Outcomes Dashboard"
        titleTa="பயனாளி முடிவுகள் டாஷ்போர்டு"
        subtitle="Funding impact and post-graduation career placement tracking."
        subtitleTa="நிதித் தாக்கம் மற்றும் பட்டதாரி வேலைவாய்ப்பு கண்காணிப்பு."
        actions={
          can('review') && (
            <button className="btn-accent" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4.5 w-4.5" /> Add Beneficiary / <span className="ta">சேர்</span>
            </button>
          )
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<BadgeIndianRupee className="h-5.5 w-5.5" />} label="Total Funding Distributed" labelTa="மொத்த நிதி" value={formatINR(kpis.total, { compact: true })} tone="primary" />
        <KpiCard icon={<Users className="h-5.5 w-5.5" />} label="Active Beneficiaries" labelTa="செயலில் உள்ளோர்" value={String(kpis.active)} tone="sky" />
        <KpiCard icon={<GraduationCap className="h-5.5 w-5.5" />} label="Completed Programs" labelTa="நிறைவு பெற்றோர்" value={String(kpis.completed)} tone="emerald" />
        <KpiCard icon={<TrendingUp className="h-5.5 w-5.5" />} label="Average GPA" labelTa="சராசரி ஜிபிஏ" value={kpis.avgGpa ? kpis.avgGpa.toFixed(2) : '—'} tone="amber" />
      </div>

      {/* Placement tracker */}
      <div className="glass-card mt-6 p-5">
        <h2 className="section-title mb-4">
          Post-Graduation & Career Placement Tracker / <span className="ta text-primary-600 dark:text-primary-400">பட்டதாரி வேலைவாய்ப்பு கண்காணிப்பு</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-emerald-500/10 p-4">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Placement Rate / <span className="ta">வேலை விகிதம்</span></p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300">{placement.rate}%</p>
            <p className="text-xs text-surface-400">{placement.surveyed.length} graduates surveyed / <span className="ta">கணக்கெடுக்கப்பட்டவர்</span></p>
          </div>
          <div className="rounded-xl bg-primary-500/10 p-4">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Average Starting Salary / <span className="ta">சராசரி தொடக்க சம்பளம்</span></p>
            <p className="text-2xl font-black text-primary-700 dark:text-primary-300">{formatINR(Math.round(placement.avgSalary))}</p>
            <p className="text-xs text-surface-400">per month from verified offers / <span className="ta">மாதம்</span></p>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-4">
            <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Higher Studies / Other / <span className="ta">மேற்படிப்பு / மற்றவை</span></p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-300">{placement.other.length}</p>
            <p className="text-xs text-surface-400">M.E, MBA, govt exams, business / <span className="ta">அரசுத் தேர்வு, தொழில்</span></p>
          </div>
        </div>

        {placement.seeking.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4.5 w-4.5" />
              {placement.seeking.length} student(s) seeking placement help / <span className="ta">வேலை தேடும் மாணவர்கள்</span>
            </p>
            <ul className="mt-2.5 space-y-2">
              {placement.seeking.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <b className="text-surface-800 dark:text-surface-100">{b.name}</b> — {b.careerSurvey?.preferredRoles} ·{' '}
                    <span className="ta">எதிர்பார்ப்பு</span> {formatINR(b.careerSurvey?.expectedSalary ?? 0)}
                    {b.careerSurvey?.resumeFileName ? ' · 📄 resume' : ' · ⚠️ no resume'}
                  </span>
                  <button className="btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => setCareerFor(b)}>
                    Record Status / <span className="ta">பதிவு செய்</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        <div className="glass-card p-5 lg:col-span-3">
          <h2 className="section-title mb-4 text-base">
            Funding Trajectory (12 months) / <span className="ta">நிதி பாதை</span>
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectory} margin={{ top: 5, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gCum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatINR(v, { compact: true })} />
                <Tooltip formatter={(v) => formatINR(Number(v))} />
                <Area type="monotone" dataKey="outflow" name="Monthly Disbursement" stroke="#0d9488" fill="url(#gOut)" strokeWidth={2} />
                <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke="#f59e0b" fill="url(#gCum)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="section-title mb-4 text-base">
            Allocation by Category & Level / <span className="ta">வகை வாரியான ஒதுக்கீடு</span>
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Education', amount: breakdown.byCategory.education },
                  { name: 'Health/Social', amount: breakdown.byCategory.health_social },
                  { name: 'Business', amount: breakdown.byCategory.business },
                ]}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b855" />
                <XAxis type="number" fontSize={11} tickFormatter={(v: number) => formatINR(v, { compact: true })} />
                <YAxis type="category" dataKey="name" fontSize={11} width={90} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => formatINR(Number(v))} />
                <Bar dataKey="amount" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="badge bg-primary-600/10 text-primary-700 dark:text-primary-300">School {formatINR(breakdown.byLevel.schooling, { compact: true })}</span>
            <span className="badge bg-amber-500/10 text-amber-700 dark:text-amber-300">UG {formatINR(breakdown.byLevel.undergraduate, { compact: true })}</span>
            <span className="badge bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">PG {formatINR(breakdown.byLevel.postgraduate, { compact: true })}</span>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="glass-card mt-6 overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="section-title">
            Beneficiary Roster / <span className="ta text-primary-600 dark:text-primary-400">பயனாளிகள் பட்டியல்</span>
          </h2>
        </div>
        {store.beneficiaries.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No beneficiaries yet" titleTa="பயனாளிகள் இல்லை" icon={<Users className="h-8 w-8 text-surface-300" />} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-50 text-xs uppercase tracking-wide text-surface-400 dark:bg-surface-800/60">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Name / <span className="ta">பெயர்</span></th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold">Program</th>
                  <th className="px-4 py-2.5 font-semibold">Funding (₹)</th>
                  <th className="px-4 py-2.5 font-semibold">GPA</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Career / Placement</th>
                  <th className="px-4 py-2.5 font-semibold">Enrolled</th>
                  <th className="px-4 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {store.beneficiaries.map((b) => (
                  <tr key={b.id} className="transition hover:bg-surface-50/70 dark:hover:bg-surface-800/40">
                    <td className="px-4 py-3 font-semibold text-surface-800 dark:text-surface-100">{b.name}</td>
                    <td className="px-4 py-3 capitalize text-surface-600 dark:text-surface-300">{b.category.replace('_', ' ')}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-surface-600 dark:text-surface-300">{b.program}</td>
                    <td className="px-4 py-3 font-bold text-primary-700 dark:text-primary-300">{formatINR(b.fundingReceived)}</td>
                    <td className="px-4 py-3 text-surface-600 dark:text-surface-300">{b.currentGpa || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          b.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : b.status === 'completed'
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                              : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><CareerBadge beneficiary={b} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-surface-500">{formatDate(b.enrolledSince)}</td>
                    <td className="px-4 py-3">
                      <button className="btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => setCareerFor(b)}>
                        <Briefcase className="h-3.5 w-3.5" /> Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CareerTransitionModal
        open={careerFor !== null}
        onClose={() => setCareerFor(null)}
        beneficiary={careerFor}
      />
      <AddBeneficiaryDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function AddBeneficiaryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const [name, setName] = useState('')
  const [program, setProgram] = useState('')
  const [category, setCategory] = useState<Beneficiary['category']>('education')
  const [level, setLevel] = useState<NonNullable<Beneficiary['educationLevel']>>('undergraduate')
  const [funding, setFunding] = useState('')
  const [gpa, setGpa] = useState('')

  const save = async () => {
    if (!name.trim()) return
    const ben: Beneficiary = {
      id: `ben-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      category,
      educationLevel: level,
      fundingReceived: Number(funding) || 0,
      program: program.trim() || '—',
      status: 'active',
      enrolledSince: new Date().toISOString(),
      expectedGraduation: '—',
      currentGpa: Number(gpa) || 0,
    }
    await store.upsertBeneficiary(ben)
    setName('')
    setProgram('')
    setFunding('')
    setGpa('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Beneficiary" titleTa="பயனாளியை சேர்க்கவும்">
      <div className="space-y-4">
        <Field label="Full Name" labelTa="முழுப் பெயர்" required>
          <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Program / Institution" labelTa="படிப்பு / நிறுவனம்">
          <input className="input-base" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="B.E. CSE — DGCT Salem" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" labelTa="வகை">
            <select className="input-base" value={category} onChange={(e) => setCategory(e.target.value as Beneficiary['category'])}>
              <option value="education">Education / கல்வி</option>
              <option value="health_social">Health & Social / சுகாதாரம்</option>
              <option value="business">Business / தொழில்</option>
            </select>
          </Field>
          <Field label="Education Level" labelTa="கல்வி நிலை">
            <select className="input-base" value={level} onChange={(e) => setLevel(e.target.value as NonNullable<Beneficiary['educationLevel']>)}>
              <option value="schooling">Schooling / பள்ளி</option>
              <option value="undergraduate">Undergraduate / இளநிலை</option>
              <option value="postgraduate">Postgraduate / முதுநிலை</option>
            </select>
          </Field>
          <Field label="Funding Received (₹)" labelTa="பெற்ற நிதி (₹)">
            <input className="input-base" type="number" value={funding} onChange={(e) => setFunding(e.target.value)} />
          </Field>
          <Field label="Current GPA" labelTa="தற்போதைய ஜிபிஏ">
            <input className="input-base" type="number" step="0.1" value={gpa} onChange={(e) => setGpa(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel / <span className="ta">ரத்து</span></button>
          <button className="btn-primary" onClick={() => void save()}>
            <Plus className="h-4 w-4" /> Add / <span className="ta">சேர்</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
