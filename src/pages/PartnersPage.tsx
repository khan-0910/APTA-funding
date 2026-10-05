import { useMemo, useState } from 'react'
import { Building2, Handshake, Mail, Phone, UserPlus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDate, formatINR } from '@/lib/format'
import { EmptyState, Field, KpiCard, Modal, PageHeader } from '@/components/ui'
import type { Partner, PartnerRelationship } from '@/types'

const REL_LABEL: Record<PartnerRelationship, { en: string; ta: string }> = {
  corporate_csr: { en: 'Corporate CSR', ta: 'நிறுவன CSR' },
  ngo: { en: 'NGO Partner', ta: 'தொண்டு நிறுவனம்' },
  individual_donor: { en: 'Individual Donor', ta: 'தனி நன்கொடையாளர்' },
  foundation: { en: 'Foundation', ta: 'அறக்கட்டளை' },
}

export function PartnersPage() {
  const store = useStore()
  const { can } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [rel, setRel] = useState<PartnerRelationship>('corporate_csr')
  const [contributed, setContributed] = useState('')

  const total = useMemo(() => store.partners.reduce((s, p) => s + p.totalContributed, 0), [store.partners])

  if (!can('manage_partners')) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="glass-card p-8 text-center text-sm text-surface-500">
          Staff access only / <span className="ta">ஊழியர் அணுகல் மட்டும்</span>
        </p>
      </div>
    )
  }

  const save = async () => {
    if (!name.trim()) return
    const partner: Partner = {
      id: `partner-${Date.now().toString(36)}`,
      orgName: name.trim(),
      contactName: contactName.trim() || '—',
      contactEmail: email.trim(),
      relationshipStatus: rel,
      totalContributed: Number(contributed) || 0,
      lastContactedAt: new Date().toISOString(),
    }
    store.setPartners([...store.partners, partner])
    setName('')
    setContactName('')
    setEmail('')
    setContributed('')
    setAddOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Corporate & NGO Partners"
        titleTa="நிறுவன & தொண்டு கூட்டாளர்கள்"
        subtitle="Donor directory with contribution history and contacts."
        subtitleTa="நன்கொடையாளர் பட்டியல் மற்றும் தொடர்பு வரலாறு."
        actions={
          <button className="btn-accent" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4.5 w-4.5" /> Add Partner / <span className="ta">சேர்</span>
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={<Handshake className="h-5.5 w-5.5" />} label="Total Partners" labelTa="மொத்த கூட்டாளர்கள்" value={String(store.partners.length)} tone="primary" />
        <KpiCard icon={<Building2 className="h-5.5 w-5.5" />} label="Lifetime Contributions" labelTa="மொத்த பங்களிப்பு" value={formatINR(total, { compact: true })} tone="emerald" />
        <KpiCard
          icon={<Mail className="h-5.5 w-5.5" />}
          label="Contacted This Month"
          labelTa="இம்மாதம் தொடர்பு"
          value={String(store.partners.filter((p) => Date.now() - new Date(p.lastContactedAt).getTime() < 30 * 864e5).length)}
          tone="sky"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {store.partners.length === 0 && (
          <div className="md:col-span-2">
            <EmptyState icon={<Handshake className="h-8 w-8 text-surface-300" />} title="No partners yet" titleTa="கூட்டாளர்கள் இல்லை" />
          </div>
        )}
        {store.partners.map((p) => (
          <div key={p.id} className="glass-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-700 dark:text-primary-300">
                  <Building2 className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className="font-bold text-surface-900 dark:text-surface-50">{p.orgName}</p>
                  <p className="text-xs text-surface-400">{REL_LABEL[p.relationshipStatus].en} / <span className="ta">{REL_LABEL[p.relationshipStatus].ta}</span></p>
                </div>
              </div>
              <span className="badge bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-300">{formatINR(p.totalContributed, { compact: true })}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-surface-600 dark:text-surface-300">
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-surface-400" /> {p.contactName}</p>
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-surface-400" /> {p.contactEmail}</p>
            </div>
            <p className="mt-3 text-xs text-surface-400">Last contacted {formatDate(p.lastContactedAt)}</p>
          </div>
        ))}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Partner" titleTa="கூட்டாளரை சேர்க்கவும்">
        <div className="space-y-4">
          <Field label="Organisation Name" labelTa="நிறுவனப் பெயர்" required>
            <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact Person" labelTa="தொடர்பு நபர்">
              <input className="input-base" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </Field>
            <Field label="Contact Email" labelTa="மின்னஞ்சல்">
              <input className="input-base" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Relationship" labelTa="உறவு வகை">
              <select className="input-base" value={rel} onChange={(e) => setRel(e.target.value as PartnerRelationship)}>
                <option value="corporate_csr">Corporate CSR / நிறுவன CSR</option>
                <option value="ngo">NGO / தொண்டு நிறுவனம்</option>
                <option value="foundation">Foundation / அறக்கட்டளை</option>
                <option value="individual_donor">Individual Donor / தனி நன்கொடையாளர்</option>
              </select>
            </Field>
            <Field label="Total Contributed (₹)" labelTa="மொத்த பங்களிப்பு (₹)">
              <input className="input-base" type="number" value={contributed} onChange={(e) => setContributed(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setAddOpen(false)}>Cancel / <span className="ta">ரத்து</span></button>
            <button className="btn-primary" onClick={() => void save()}>Save / <span className="ta">சேமி</span></button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
