import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeIndianRupee,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'
import { Bi } from '@/components/ui'
import { useStore } from '@/lib/store'
import { formatINR } from '@/lib/format'
import { fetchPublicStats, type PublicStats } from '@/lib/persistence'
import { useCountUp, useReveal } from '@/lib/motion'

const STEPS = [
  {
    icon: FileText,
    titleEn: 'Apply',
    titleTa: 'விண்ணப்பிக்கவும்',
    descEn: 'Fill the bilingual application with your family and income details.',
    descTa: 'குடும்ப மற்றும் வருமான விவரங்களுடன் இருமொழி விண்ணப்பத்தை நிரப்புங்கள்.',
  },
  {
    icon: ClipboardList,
    titleEn: 'Review & Verification',
    titleTa: 'ஆய்வு & சரிபார்ப்பு',
    descEn: 'Staff verify documents and conduct a home visit within 2 weeks.',
    descTa: 'ஆவணங்கள் சரிபார்க்கப்பட்டு, 2 வாரங்களில் வீட்டு ஆய்வு மேற்கொள்ளப்படும்.',
  },
  {
    icon: HeartHandshake,
    titleEn: 'Funding & Mentorship',
    titleTa: 'நிதி & வழிகாட்டல்',
    descEn: 'Zakkath grant disbursed, then mentorship till graduation & placement.',
    descTa: 'ஜகாத் நிதி வழங்கப்பட்டு, பட்டம் மற்றும் வேலைவாய்ப்பு வரை வழிகாட்டல்.',
  },
]

function StatValue({ value, format }: { value: number; format: (n: number) => string }) {
  const animated = useCountUp(value)
  return <>{format(animated)}</>
}

export function LandingPage() {
  const { beneficiaries, transactions, partners } = useStore()
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null)
  const revealRef = useReveal<HTMLDivElement>()

  const storeHasData = beneficiaries.length + transactions.length + partners.length > 0

  // Logged-out visitors can't read the tables once the database is locked down, so the
  // homepage asks the aggregate-only RPC instead. Signed-in users use the live store.
  useEffect(() => {
    if (storeHasData) return
    let cancelled = false
    void fetchPublicStats().then((s) => {
      if (!cancelled) setPublicStats(s)
    })
    return () => {
      cancelled = true
    }
  }, [storeHasData])

  const local = {
    studentsFunded: beneficiaries.length,
    totalFunding: beneficiaries.reduce((s, b) => s + b.fundingReceived, 0),
    totalInflow: transactions.filter((t) => t.direction === 'inflow').reduce((s, t) => s + t.amount, 0),
    graduated: beneficiaries.filter((b) => b.status === 'completed' || b.careerSurvey?.status === 'already_employed').length,
    partners: partners.length,
  }
  const stats =
    !storeHasData && publicStats
      ? {
          studentsFunded: publicStats.studentsFunded,
          totalFunding: publicStats.amountDisbursed,
          totalInflow: publicStats.inflowTotal,
          graduated: publicStats.graduated,
          partners: publicStats.partners,
        }
      : local
  const gradRate = stats.studentsFunded > 0 ? Math.round((stats.graduated / stats.studentsFunded) * 100) : 0

  const STATS = [
    { icon: GraduationCap, value: stats.studentsFunded, fmt: (n: number) => String(Math.round(n)), en: 'Students Funded', ta: 'மாணவர்கள் நிதியுதவி' },
    {
      icon: BadgeIndianRupee,
      value: stats.totalFunding || stats.totalInflow,
      fmt: (n: number) => formatINR(Math.round(n), { compact: true }),
      en: 'Distributed',
      ta: 'வழங்கப்பட்டது',
    },
    { icon: Trophy, value: gradRate, fmt: (n: number) => `${Math.round(n)}%`, en: 'Graduation Rate', ta: 'பட்டப்படிப்பு விகிதம்' },
    { icon: Users, value: stats.partners, fmt: (n: number) => String(Math.round(n)), en: 'Partners', ta: 'கூட்டாளர்கள்' },
  ]

  return (
    <div ref={revealRef} className="mx-auto max-w-6xl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-900 to-primary-950 p-8 text-white shadow-xl shadow-primary-950/25 ring-1 ring-white/10 sm:p-12">
        <div className="anim-drift pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="anim-drift-slow pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-primary-400/20 blur-3xl" />
        {/* fine academic grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 70% 30%, black, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 70% 30%, black, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div className="relative stagger">
          <span className="eyebrow !text-amber-300">
            <HeartHandshake className="h-3.5 w-3.5" /> APTA · All Praise To Allah
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.12] tracking-tight sm:text-5xl">
            Empowering Dreams Through Education
            <span className="ta mt-3 block text-lg font-semibold leading-snug text-amber-200 sm:text-2xl">
              கல்வியின் மூலம் எதிர்காலத்தை உருவாக்குவோம்
            </span>
          </h1>
          <span className="gold-rule anim-draw mt-6 !w-24" aria-hidden="true" />
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80">
            Every student deserves the chance to learn. With community donations, APTA funds four-year college degrees for students in Salem, Tamil Nadu — and stands beside each one from the first day of class to the first day of work.
            <span className="ta mt-2 block text-sm leading-relaxed text-white/65">
              ஒவ்வொரு மாணவருக்கும் கற்க வாய்ப்பு உண்டு. சமூக நன்கொடைகள் மூலம், சேலம் மாவட்டத்தின் மாணவர்களுக்கு 4 ஆண்டு கல்லூரிக் கல்விக்கு நிதியுதவி செய்கிறோம் — வகுப்பறையின் முதல் நாள் முதல் பணியின் முதல் நாள் வரை ஒவ்வொரு மாணவருடனும் இருக்கிறோம்.
            </span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/applications/new" className="btn-accent group !px-6 !py-3 text-base">
              Apply for Funding <span className="ta font-normal">/ விண்ணப்பிக்க</span>
              <ArrowRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="btn-ghost !border-white/25 !bg-white/5 !px-6 !py-3 text-base !text-white hover:!border-amber-300/60 hover:!bg-white/10"
            >
              Staff Portal / <span className="ta">ஊழியர் நுழைவு</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto -mt-8 grid max-w-5xl grid-cols-2 gap-3 px-2 sm:gap-4 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.en}
            className="reveal glass-card card-hover flex items-center gap-3 p-4 sm:p-5"
            style={{ '--i': i } as CSSProperties}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-800 text-amber-300 ring-1 ring-amber-400/40 dark:bg-primary-700">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold tabular-nums text-primary-900 dark:text-surface-50">
                <StatValue value={s.value} format={s.fmt} />
              </p>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
                {s.en} <span className="ta">/ {s.ta}</span>
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="mt-14">
        <div className="reveal flex flex-col items-center text-center">
          <span className="eyebrow">Process / <span className="ta tracking-normal">செயல்முறை</span></span>
          <h2 className="section-title mt-2 !text-2xl">
            How It Works <span className="ta text-lg text-amber-600 dark:text-amber-300">/ எப்படி இயங்குகிறது</span>
          </h2>
          <span className="gold-rule mt-3" aria-hidden="true" />
        </div>
        <div className="relative mt-8 grid gap-4 md:grid-cols-3">
          {/* connector line behind the medallions */}
          <div
            className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-[2.65rem] hidden h-px bg-gradient-to-r from-amber-400/0 via-amber-400/60 to-amber-400/0 md:block"
            aria-hidden="true"
          />
          {STEPS.map((s, i) => (
            <div
              key={s.titleEn}
              className="reveal glass-card card-hover relative p-6 text-center"
              style={{ '--i': i } as CSSProperties}
            >
              <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-800 text-amber-300 shadow-md shadow-primary-900/20 ring-4 ring-white dark:bg-primary-700 dark:ring-surface-900">
                <s.icon className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-primary-950">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-primary-900 dark:text-surface-50">
                {s.titleEn} <span className="ta block text-sm font-semibold text-amber-600 dark:text-amber-300">{s.titleTa}</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">{s.descEn}</p>
              <p className="ta mt-1 text-xs leading-relaxed text-surface-500 dark:text-surface-400">{s.descTa}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="reveal relative mt-14 flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900 to-primary-950 p-7 text-white ring-1 ring-amber-400/25 sm:p-8">
        <div className="pointer-events-none absolute -right-16 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40 sm:flex">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="text-xl font-bold">
              <Bi en="Ready to change a life?" ta="ஒரு வாழ்க்கையை மாற்ற தயாரா?" className="text-white" taClassName="ta text-amber-200" />
            </h3>
            <p className="mt-1 text-sm text-white/75">
              100% of Zakkath donations reach verified students. <span className="ta">ஜகாத் நிதி முழுவதும் சரிபார்க்கப்பட்ட மாணவர்களுக்கே.</span>
            </p>
          </div>
        </div>
        <Link to="/register" className="btn-accent relative !px-6 !py-3">
          Join as Donor / <span className="ta font-normal">நன்கொடையாளராகுங்கள்</span>
        </Link>
      </section>
    </div>
  )
}
