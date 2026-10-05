import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Printer, XCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { formatDate, formatINR, todayISO } from '@/lib/format'
import { Field, PageHeader, StatusBadge, Modal } from '@/components/ui'
import type { Application } from '@/types'

type Tab = 'all' | 'basic' | 'family' | 'income' | 'need' | 'documents' | 'declaration' | 'office'

const TABS: Array<[Tab, string, string]> = [
  ['all', 'All', 'அனைத்தும்'],
  ['basic', 'Basic Info', 'அடிப்படை விவரங்கள்'],
  ['family', 'Family Profile', 'குடும்ப விவரங்கள்'],
  ['income', 'Income & Living', 'வருமானம் & வாழ்க்கை'],
  ['need', 'Statement of Need', 'தேவை விளக்கம்'],
  ['documents', 'Documents', 'ஆவணங்கள்'],
  ['declaration', 'Declaration', 'உறுதிமொழி'],
  ['office', 'Office Review', 'அலுவலக ஆய்வு'],
]

export function ApplicationDetailPage() {
  const { id } = useParams()
  const store = useStore()
  const { can, user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [decide, setDecide] = useState<'approve' | 'reject' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [sanctioned, setSanctioned] = useState('')

  const app = useMemo(() => store.applications.find((a) => a.id === id) ?? null, [store.applications, id])

  if (!app) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="glass-card p-8 text-center text-sm text-surface-500">Application not found / விண்ணப்பம் கிடைக்கவில்லை</p>
        <div className="mt-4 text-center">
          <Link to="/applications" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Back / திரும்பு
          </Link>
        </div>
      </div>
    )
  }

  const basic = (app.basicInfo ?? {}) as Record<string, unknown>
  const fp = app.familyProfile
  const purpose = (app.purposeOfAssistance ?? {}) as Record<string, unknown>
  const office = app.officeUseOnly

  const submitDecision = async () => {
    if (!decide) return
    const approved = decide === 'approve'
    const next: Application = {
      ...app,
      status: approved ? 'approved' : 'rejected',
      officeUseOnly: {
        verifiedBy: user?.name ?? 'Staff',
        verificationDate: todayISO(),
        fieldNotes: reviewNotes || office?.fieldNotes || '',
        sanctionedAmount: approved ? Number(sanctioned) || app.fundingRequested : 0,
        approvedBy: user?.name ?? 'Staff',
      },
    }
    await store.saveApplication(next)

    if (approved) {
      const existing = store.beneficiaries.find((b) => b.name === next.studentName)
      const ben = existing ?? {
        id: `ben-${Date.now().toString(36)}`,
        name: next.studentName,
        category: next.category,
        educationLevel: next.educationLevel,
        fundingReceived: 0,
        program: next.program,
        status: 'active' as const,
        enrolledSince: new Date().toISOString(),
        expectedGraduation: next.familyProfile?.expectedGraduationYear ?? '—',
        currentGpa: 0,
      }
      ben.fundingReceived = next.officeUseOnly?.sanctionedAmount ?? next.fundingRequested
      await store.upsertBeneficiary(ben)
    }
    setDecide(null)
    setReviewNotes('')
  }

  const show = (t: Tab) => tab === 'all' || tab === t

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-3 no-print">
        <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => navigate('/applications')}>
          <ArrowLeft className="h-4 w-4" /> Back / <span className="ta">திரும்பு</span>
        </button>
        <button className="btn-primary !px-3 !py-1.5 !text-xs" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print Application / <span className="ta">அச்சிடு</span>
        </button>
      </div>

      <div className="print-only mb-6">
        <p className="text-xl font-bold">APTA Empowers — Application {app.id}</p>
        <p className="ta text-sm">கல்வி உதவி விண்ணப்பம் — அமெரிக்க முற்போக்கு தமிழ் சங்கம்</p>
      </div>

      <PageHeader
        title={app.studentName}
        titleTa={app.program}
        subtitle={`Application ${app.id} · Submitted ${formatDate(app.submittedAt)}`}
        actions={<StatusBadge status={app.status} />}
      />

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5 no-print">
        {TABS.map(([key, en, ta]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === key
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
            }`}
          >
            {en} <span className="ta">/ {ta}</span>
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {show('basic') && (
          <Section title="Basic Applicant Information" titleTa="அடிப்படை விவரங்கள்">
            <Grid>
              <Row label="Full Name / முழுப் பெயர்" value={str(basic.fullName)} />
              <Row label="Age / வயது" value={str(basic.age)} />
              <Row label="Gender / பாலினம்" value={str(basic.gender)} />
              <Row label="Mobile / கைபேசி" value={str(basic.mobile)} />
              <Row label="Aadhaar / ஆதார்" value={str(basic.aadhaar)} />
              <Row label="Marital Status / திருமண நிலை" value={str(basic.maritalStatus)} />
              <Row label="Address / முகவரி" value={[str(basic.doorNo), str(basic.street), str(basic.villageTown), str(basic.district), str(basic.state), str(basic.pinCode)].filter(Boolean).join(', ')} />
            </Grid>
          </Section>
        )}

        {show('family') && (
          <Section title="Family Profile & Education" titleTa="குடும்ப விவரங்கள் & கல்வி">
            <Grid>
              <Row label="Father / தந்தை" value={[str(fp?.fatherName), str(fp?.fatherAge)].filter(Boolean).join(' · ') + (fp?.fatherOccupation ? ` — ${fp.fatherOccupation}, ${formatINR(fp.fatherSalary)}/mo` : '')} />
              <Row label="Mother / தாய்" value={[str(fp?.motherName), str(fp?.motherAge)].filter(Boolean).join(' · ') + (fp?.motherOccupation ? ` — ${fp.motherOccupation}, ${formatINR(fp.motherSalary)}/mo` : '')} />
              <Row label="Siblings / உடன்பிறப்புகள்" value={str(fp?.siblingDetails)} />
              <Row label="Education / கல்வி" value={str(fp?.presentEducation)} />
              <Row label="Year of Study / படிக்கும் ஆண்டு" value={fp?.educationType === 'school' ? str(fp?.schoolYear) : str(fp?.collegeYear)} />
              <Row label="Institution / நிறுவனம்" value={fp?.educationType === 'school' ? str(fp?.schoolName) : str(fp?.collegeName)} />
              <Row label="10th / 10-ம் வகுப்பு" value={fp?.pastSchool10th ? `${fp.pastSchool10th.schoolName} — ${fp.pastSchool10th.marksOrPercentage}` : ''} />
              <Row label="12th / 12-ம் வகுப்பு" value={fp?.pastSchool12th ? `${fp.pastSchool12th.schoolName} — ${fp.pastSchool12th.marksOrPercentage}` : ''} />
              <Row label="Current CGPA / %" value={str(fp?.collegeDetails?.percentage)} />
              <Row label="Academic Session / கல்வியாண்டு" value={str(fp?.academicYearSpan)} />
              <Row label="Expected Graduation / எதிர்பார்க்கும் பட்டப்படிப்பு முடிவு" value={str(fp?.expectedGraduationYear)} />
            </Grid>
          </Section>
        )}

        {show('income') && (
          <Section title="Income & Living Conditions" titleTa="வருமானம் & வாழ்க்கை நிலை">
            {(() => {
              const dep = (basic.dependents ?? {}) as Record<string, unknown>
              const inc = (basic.income ?? {}) as Record<string, unknown>
              return (
                <Grid>
                  <Row label="Family Members / குடும்ப உறுப்பினர்கள்" value={str(dep.totalMembers)} />
                  <Row label="School-going Children / பள்ளிக் குழந்தைகள்" value={str(dep.schoolGoingChildren)} />
                  <Row label="House / வீடு" value={`${str(dep.houseOwnership)}${dep.monthlyRent ? ` — ₹${dep.monthlyRent}/mo` : ''}`} />
                  <Row label="Land / Vehicle / நிலம் / வாகனம்" value={str(dep.landVehicleOwnership)} />
                  <Row label="Income Sources / வருமான ஆதாரங்கள்" value={str(inc.incomeSources)} />
                  <Row label="Monthly Income / மாத வருமானம்" value={inc.totalMonthlyIncome ? formatINR(Number(inc.totalMonthlyIncome)) : ''} />
                  <Row label="Govt Benefits / அரசு உதவிகள்" value={`${str(inc.govtBenefits)}${inc.govtBenefitAmount ? ` — ₹${inc.govtBenefitAmount}/mo` : ''}`} />
                </Grid>
              )
            })()}
          </Section>
        )}

        {show('need') && (
          <Section title="Purpose of Assistance & Statement of Need" titleTa="உதவி நோக்கம் & தேவை விளக்கம்">
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-semibold text-surface-700 dark:text-surface-200">Category / <span className="ta">வகை:</span></span>{' '}
                <span className="capitalize">{String(purpose.category ?? app.category).replace('_', ' ')}</span> — {str(purpose.subCategory)}
              </p>
              <p>
                <span className="font-semibold text-surface-700 dark:text-surface-200">Amount / <span className="ta">தொகை:</span></span>{' '}
                <span className="text-lg font-black text-primary-700 dark:text-primary-300">{formatINR(app.fundingRequested)}</span>
              </p>
              <p className="whitespace-pre-line rounded-xl bg-surface-50 p-4 leading-relaxed text-surface-700 dark:bg-surface-800/60 dark:text-surface-200">
                {app.statementOfNeed || str(purpose.statement)}
              </p>
            </div>
          </Section>
        )}

        {show('documents') && (
          <Section title="Documents" titleTa="ஆவணங்கள்">
            {app.supportingDocuments?.attachments?.length ? (
              <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                {app.supportingDocuments.attachments.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <p className="font-semibold text-surface-800 dark:text-surface-100">{d.name}</p>
                      <p className="text-xs text-surface-400">{d.category} · {(d.size / 1024).toFixed(0)} KB · {formatDate(d.uploadedAt)}</p>
                    </div>
                    <a
                      className="btn-ghost !px-2.5 !py-1 !text-xs"
                      href={d.dataUrl ?? '#'}
                      download={d.name}
                      onClick={(e) => {
                        if (!d.dataUrl) e.preventDefault()
                      }}
                    >
                      Download / <span className="ta">பதிவிறக்கு</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-surface-400">No documents attached / ஆவணங்கள் இல்லை</p>
            )}
          </Section>
        )}

        {show('declaration') && (
          <Section title="Zakkath Declaration" titleTa="ஜகாத் உறுதிமொழி">
            <div className="rounded-xl border border-amber-300/70 bg-amber-50/80 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="font-semibold text-surface-800 dark:text-surface-100">
                I here by under take that the information provided above is true and that the student is eligible for Zakkath assistance.
              </p>
              <p className="ta mt-1 text-surface-600 dark:text-surface-300">
                மேற்கண்ட தகவல்கள் உண்மையானவை என்றும் மாணவர் ஜகாத் உதவியை பெறுவதற்கு தகுதியுடையவர் என்றும் உறுதியளிக்கிறேன்.
              </p>
              <div className="mt-3 grid gap-2 text-xs text-surface-600 dark:text-surface-300 sm:grid-cols-3">
                <p>Place / <span className="ta">இடம்</span>: <b>{str(app.declaration?.place)}</b></p>
                <p>Date / <span className="ta">தேதி</span>: <b>{formatDate(app.declaration?.date ?? null)}</b></p>
                <p>Signature / <span className="ta">கையொப்பம்</span>: <b>{str(app.declaration?.signatureOrName)}</b></p>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Undertaking confirmed / <span className="ta">உறுதிமொழி உறுதிசெய்யப்பட்டது</span>
              </p>
            </div>
          </Section>
        )}

        {show('office') && (
          <Section title="Office Use Only — Page 8" titleTa="அலுவலகப் பயன்பாட்டிற்கு மட்டும் — பக்கம் 8">
            {office && !can('review') ? (
              <p className="text-sm text-surface-500">
                Verified by {office.verifiedBy} on {formatDate(office.verificationDate)} · Sanctioned{' '}
                <b className="text-primary-700 dark:text-primary-300">{formatINR(office.sanctionedAmount)}</b>
              </p>
            ) : can('review') ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Info label="Verified By" value={office?.verifiedBy ?? '—'} />
                  <Info label="Verification Date" value={office?.verificationDate ? formatDate(office.verificationDate) : '—'} />
                  <Info label="Sanctioned Amount" value={office?.sanctionedAmount ? formatINR(office.sanctionedAmount) : '—'} />
                </div>
                <Info label="Field Inspection Notes / கள ஆய்வு விவரங்கள்" value={office?.fieldNotes ?? 'Pending field visit / கள ஆய்வு நிலுவையில்'} />
                {app.status === 'submitted' || app.status === 'under_review' ? (
                  <div className="flex flex-wrap gap-2 no-print">
                    <button className="btn-primary" onClick={() => setDecide('approve')}>
                      <CheckCircle2 className="h-4 w-4" /> Approve / <span className="ta">அனுமதி</span>
                    </button>
                    <button className="btn-danger" onClick={() => setDecide('reject')}>
                      <XCircle className="h-4 w-4" /> Reject / <span className="ta">மறு</span>
                    </button>
                  </div>
                ) : (
                  <Info label="Approved By" value={office?.approvedBy ?? '—'} />
                )}
              </div>
            ) : (
              <p className="text-sm text-surface-400">Sign in as staff to review / ஊழியராக உள்நுழைந்து ஆய்வு செய்யவும்</p>
            )}
          </Section>
        )}
      </div>

      {/* Decision modal */}
      <Modal open={decide !== null} onClose={() => setDecide(null)} title={decide === 'approve' ? 'Approve & Sanction' : 'Reject Application'} titleTa={decide === 'approve' ? 'ஒப்புதல் & நிதி ஒதுக்கீடு' : 'விண்ணப்பத்தை மறு'}>
        <div className="space-y-4">
          {decide === 'approve' && (
            <Field label="Sanctioned Amount (₹)" labelTa="ஒதுக்கப்பட்ட தொகை (₹)" required>
              <input className="input-base" type="number" value={sanctioned} onChange={(e) => setSanctioned(e.target.value)} placeholder={String(app.fundingRequested)} />
            </Field>
          )}
          <Field label="Review / Field Notes" labelTa="ஆய்வு குறிப்புகள்">
            <textarea className="input-base min-h-24" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Verification checklist: address, income, academic records, Zakkath eligibility…" />
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setDecide(null)}>
              Cancel / <span className="ta">ரத்து</span>
            </button>
            <button className={decide === 'approve' ? 'btn-primary' : 'btn-danger'} onClick={() => void submitDecision()}>
              Confirm / <span className="ta">உறுதி</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Section({ title, titleTa, children }: { title: string; titleTa: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-5">
      <h2 className="section-title mb-4 text-base">
        {title} <span className="ta text-sm font-semibold text-primary-600 dark:text-primary-400">/ {titleTa}</span>
      </h2>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</div>
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-surface-400">{label}</p>
      <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">{value || '—'}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
      <p className="text-xs font-medium text-surface-400">{label}</p>
      <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">{value}</p>
    </div>
  )
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v)
}

