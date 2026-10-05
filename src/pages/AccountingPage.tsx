import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDate, formatINR, todayISO } from '@/lib/format'
import { EmptyState, Field, KpiCard, Modal, PageHeader } from '@/components/ui'
import type { Transaction, TransactionDirection } from '@/types'

export function AccountingPage() {
  const store = useStore()
  const { can } = useAuth()
  const [filter, setFilter] = useState<'all' | 'inflow' | 'outflow' | 'pending'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<TransactionDirection>('inflow')
  const [category, setCategory] = useState<Transaction['category']>('donation')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO())

  const metrics = useMemo(() => {
    const totalIn = store.transactions.filter((t) => t.direction === 'inflow').reduce((s, t) => s + t.amount, 0)
    const totalOut = store.transactions.filter((t) => t.direction === 'outflow').reduce((s, t) => s + t.amount, 0)
    const reconciled = store.transactions.filter((t) => t.reconciled).length
    return { totalIn, totalOut, net: totalIn - totalOut, reconciled }
  }, [store.transactions])

  if (!can('accounting')) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="glass-card p-8 text-center text-sm text-surface-500">
          Admin & staff accounting access only / <span className="ta">கணக்கியல் அணுகல் வரம்பு</span>
        </p>
      </div>
    )
  }

  const rows = store.transactions
    .filter((t) =>
      filter === 'all'
        ? true
        : filter === 'pending'
          ? !t.reconciled
          : t.direction === filter,
    )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))

  const toggleReconciled = async (id: string) => {
    store.setTransactions(store.transactions.map((t) => (t.id === id ? { ...t, reconciled: !t.reconciled } : t)))
  }

  const addEntry = async () => {
    const amt = Number(amount)
    if (!description.trim() || !Number.isFinite(amt) || amt <= 0) return
    const txn: Transaction = {
      id: `txn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      amount: amt,
      direction,
      category,
      description: description.trim(),
      reconciled: false,
    }
    store.setTransactions([txn, ...store.transactions])
    setAddOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Accounting & Bank Reconciliation"
        titleTa="கணக்கியல் & வங்கி சரிபார்ப்பு"
        subtitle="Donor inflows and student grant outflows with 1-click reconciliation."
        subtitleTa="நன்கொடை வரவுகள் மற்றும் மாணவர் நிதி செலவுகள்."
        actions={
          <button
            className="btn-accent"
            onClick={() => {
              setAmount('')
              setDescription('')
              setDate(todayISO())
              setAddOpen(true)
            }}
          >
            <Plus className="h-4.5 w-4.5" /> Add Entry / <span className="ta">பதிவு சேர்</span>
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<ArrowDownLeft className="h-5.5 w-5.5" />} label="Total In" labelTa="மொத்த வரவு" value={formatINR(metrics.totalIn, { compact: true })} tone="emerald" />
        <KpiCard icon={<ArrowUpRight className="h-5.5 w-5.5" />} label="Total Out" labelTa="மொத்த செலவு" value={formatINR(metrics.totalOut, { compact: true })} tone="amber" />
        <KpiCard icon={<Landmark className="h-5.5 w-5.5" />} label="Net Balance" labelTa="நிகர இருப்பு" value={formatINR(metrics.net, { compact: true })} tone="primary" />
        <KpiCard icon={<ArrowDownLeft className="h-5.5 w-5.5" />} label="Reconciled Entries" labelTa="சரிபார்க்கப்பட்டவை" value={`${metrics.reconciled}/${store.transactions.length}`} tone="sky" />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(
          [
            ['all', 'All', 'அனைத்தும்'],
            ['inflow', 'Inflow', 'வரவு'],
            ['outflow', 'Outflow', 'செலவு'],
            ['pending', 'Pending Reconciliation', 'நிலுவை'],
          ] as Array<[typeof filter, string, string]>
        ).map(([key, en, ta]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === key
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
            }`}
          >
            {en} <span className="ta">/ {ta}</span>
          </button>
        ))}
      </div>

      <div className="glass-card mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No transactions" titleTa="பரிவர்த்தனைகள் இல்லை" icon={<Landmark className="h-8 w-8 text-surface-300" />} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-50 text-xs uppercase tracking-wide text-surface-400 dark:bg-surface-800/60">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date / <span className="ta">தேதி</span></th>
                  <th className="px-4 py-2.5 font-semibold">Description</th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold">Amount (₹)</th>
                  <th className="px-4 py-2.5 font-semibold">Direction</th>
                  <th className="px-4 py-2.5 font-semibold">Reconciled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {rows.map((t) => (
                  <tr key={t.id} className="transition hover:bg-surface-50/70 dark:hover:bg-surface-800/40">
                    <td className="whitespace-nowrap px-4 py-3 text-surface-500">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 text-surface-700 dark:text-surface-200">{t.description}</td>
                    <td className="px-4 py-3 capitalize text-surface-500">{t.category.replace('_', ' ')}</td>
                    <td className={`px-4 py-3 font-bold ${t.direction === 'inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {t.direction === 'inflow' ? '+' : '−'}{formatINR(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${t.direction === 'inflow' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'}`}>
                        {t.direction === 'inflow' ? 'Inflow / வரவு' : 'Outflow / செலவு'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void toggleReconciled(t.id)}
                        className={`badge cursor-pointer transition ${
                          t.reconciled
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-surface-100 text-surface-500 hover:bg-amber-100 hover:text-amber-700 dark:bg-surface-800 dark:text-surface-400'
                        }`}
                      >
                        {t.reconciled ? '✓ Reconciled / சரி' : 'Pending / நிலுவை'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Ledger Entry" titleTa="கணக்கு பதிவை சேர்க்கவும்">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Direction" labelTa="வரவு / செலவு" required>
              <select className="input-base" value={direction} onChange={(e) => setDirection(e.target.value as TransactionDirection)}>
                <option value="inflow">Inflow (donation received) / வரவு</option>
                <option value="outflow">Outflow (grant disbursed) / செலவு</option>
              </select>
            </Field>
            <Field label="Date" labelTa="தேதி" required>
              <input className="input-base" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Category" labelTa="வகை" required>
              <select className="input-base" value={category} onChange={(e) => setCategory(e.target.value as Transaction['category'])}>
                <option value="donation">Donation / நன்கொடை</option>
                <option value="education">Education / கல்வி</option>
                <option value="health_social">Health / Social / சுகாதாரம்</option>
                <option value="business">Business Aid / தொழில் உதவி</option>
                <option value="operations">Operations / செயல்பாடு</option>
              </select>
            </Field>
            <Field label="Amount (₹)" labelTa="தொகை (₹)" required>
              <input className="input-base" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" />
            </Field>
          </div>
          <Field label="Description" labelTa="விவரம்" required>
            <input
              className="input-base"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Zoho CSR grant — Q3 / மூன்றாம் காலாண்டு நன்கொடை"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel / <span className="ta">ரத்து</span></button>
            <button className="btn-primary" onClick={() => void addEntry()} disabled={!Number(amount) || !description.trim()}>
              Save Entry / <span className="ta">சேமி</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
