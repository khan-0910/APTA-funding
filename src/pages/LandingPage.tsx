import { Link } from 'react-router-dom'
import { ArrowRight, BadgeIndianRupee, ClipboardList, FileText, GraduationCap, HeartHandshake, Trophy, Users } from 'lucide-react'
import { Bi } from '@/components/ui'
import { useStore } from '@/lib/store'
import { formatINR } from '@/lib/format'

const STEPS = [
  {
    icon: FileText,
    titleEn: '1. Apply',
    titleTa: 'விண்ணப்பிக்கவும்',
    descEn: 'Fill the bilingual application with your family and income details.',
    descTa: 'குடும்ப மற்றும் வருமான விவரங்களுடன் இருமொழி விண்ணப்பத்தை நிரப்புங்கள்.',
  },
  {
    icon: ClipboardList,
    titleEn: '2. Review & Verification',
    titleTa: 'ஆய்வு & சரிபார்ப்பு',
    descEn: 'Staff verify documents and conduct a home visit within 2 weeks.',
    descTa: 'ஆவணங்கள் சரிபார்க்கப்பட்டு, 2 வாரங்களில் வீட்டு ஆய்வு மேற்கொள்ளப்படும்.',
  },
  {
    icon: HeartHandshake,
    titleEn: '3. Funding & Mentorship',
    titleTa: 'நிதி & வழிகாட்டல்',
    descEn: 'Zakkath grant disbursed, then mentorship till graduation & placement.',
    descTa: 'ஜகாத் நிதி வழங்கப்பட்டு, பட்டம் மற்றும் வேலைவாய்ப்பு வரை வழிகாட்டல்.',
  },
]

export function LandingPage() {
  const { beneficiaries, transactions, partners } = useStore()
  const totalFunding = beneficiaries.reduce((s, b) => s + b.fundingReceived, 0)
  const graduated = beneficiaries.filter((b) => b.status === 'completed' || b.careerSurvey?.status === 'already_employed').length
  const gradRate = beneficiaries.length > 0 ? Math.round((graduated / beneficiaries.length) * 100) : 0
  const totalInflow = transactions.filter((t) => t.direction === 'inflow').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <section className="glass-card relative overflow-hidden p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative">
          <span className="badge bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <HeartHandshake className="h-3.5 w-3.5" /> APTA · All Praise To Allah
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight text-surface-900 dark:text-surface-50 sm:text-5xl">
            Empowering Dreams Through Education{' '}
            <span className="ta block text-xl font-bold text-primary-600 dark:text-primary-400 sm:text-2xl">
              / கல்வியின் மூலம் எதிர்காலத்தை உருவாக்குவோம்
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-surface-600 dark:text-surface-300">
            Every student deserves the chance to learn. With community donations, APTA funds four-year college degrees for students in Salem, Tamil Nadu — and stands beside each one from the first day of class to the first day of work.
            <span className="ta mt-1 block">
              ஒவ்வொரு மாணவருக்கும் கற்க வாய்ப்பு உண்டு. சமூக நன்கொடைகள் மூலம், சேலம் மாவட்டத்தின் மாணவர்களுக்கு 4 ஆண்டு கல்லூரிக் கல்விக்கு நிதியுதவி செய்கிறோம் — வகுப்பறையின் முதல் நாள் முதல் பணியின் முதல் நாள் வரை ஒவ்வொரு மாணவருடனும் இருக்கிறோம்.
            </span>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/applications/new" className="btn-accent !px-6 !py-3 text-base">
              Apply for Funding <span className="ta font-normal">/ விண்ணப்பிக்க</span> <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <Link to="/login" className="btn-ghost !px-6 !py-3 text-base">
              Staff Portal / <span className="ta">ஊழியர் நுழைவு</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: GraduationCap, value: String(beneficiaries.length), en: 'Students Funded', ta: 'மாணவர்கள் நிதியுதவி' },
          { icon: BadgeIndianRupee, value: formatINR(totalFunding || totalInflow, { compact: true }), en: 'Distributed', ta: 'வழங்கப்பட்டது' },
          { icon: Trophy, value: `${gradRate}%`, en: 'Graduation Rate', ta: 'பட்டப்படிப்பு விகிதம்' },
          { icon: Users, value: String(partners.length), en: 'Partners', ta: 'கூட்டாளர்கள்' },
        ].map((s) => (
          <div key={s.en} className="glass-card flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-700 dark:bg-primary-400/10 dark:text-primary-300">
              <s.icon className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-2xl font-black text-surface-900 dark:text-surface-50">{s.value}</p>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
                {s.en} <span className="ta">/ {s.ta}</span>
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="mt-10">
        <h2 className="section-title mb-4 text-center">
          How It Works <span className="ta text-primary-600 dark:text-primary-400">/ எப்படி இயங்குகிறது</span>
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.titleEn} className="glass-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
                <s.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-surface-900 dark:text-surface-50">
                {s.titleEn} <span className="ta text-sm font-semibold text-primary-600 dark:text-primary-400">/ {s.titleTa}</span>
              </h3>
              <p className="mt-1.5 text-sm text-surface-600 dark:text-surface-300">{s.descEn}</p>
              <p className="ta mt-1 text-xs text-surface-500 dark:text-surface-400">{s.descTa}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="glass-card mt-10 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-primary-700 to-primary-900 p-7 text-white dark:bg-none">
        <div>
          <h3 className="text-xl font-bold">
            <Bi en="Ready to change a life?" ta="ஒரு வாழ்க்கையை மாற்ற தயாரா?" className="text-white" taClassName="ta text-white/80" />
          </h3>
          <p className="mt-1 text-sm text-white/80">
            100% of Zakkath donations reach verified students. <span className="ta">ஜகாத் நிதி முழுவதும் சரிபார்க்கப்பட்ட மாணவர்களுக்கே.</span>
          </p>
        </div>
        <Link to="/register" className="btn-accent !px-6 !py-3">
          Join as Donor / <span className="ta font-normal">நன்கொடையாளராகுங்கள்</span>
        </Link>
      </section>
    </div>
  )
}

