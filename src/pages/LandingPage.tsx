import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ClipboardList, FileText, HandCoins, HeartHandshake, Users } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { LangSwitch, Logo } from '@/components/AppShell'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { formatINR } from '@/lib/format'
import { fetchPublicStats, type PublicStats } from '@/lib/persistence'

gsap.registerPlugin(ScrollTrigger, SplitText)

const STEPS = [
  {
    icon: FileText,
    en: 'Apply online',
    ta: 'இணையத்தில் விண்ணப்பிக்கவும்',
    body: 'Fill in the bilingual form with your family, income and course details, and attach your documents.',
    bodyTa: 'குடும்பம், வருமானம், படிப்பு விவரங்களுடன் படிவத்தை நிரப்பி ஆவணங்களை இணைக்கவும்.',
  },
  {
    icon: ClipboardList,
    en: 'Verification',
    ta: 'சரிபார்ப்பு',
    body: 'Our team checks your documents and visits your home, usually within two weeks.',
    bodyTa: 'ஆவணங்கள் சரிபார்க்கப்பட்டு, பொதுவாக இரண்டு வாரங்களில் வீட்டு ஆய்வு நடைபெறும்.',
  },
  {
    icon: HandCoins,
    en: 'Funding',
    ta: 'நிதியுதவி',
    body: 'Once approved, the sanctioned amount is disbursed from Zakkath donations and recorded in our ledger.',
    bodyTa: 'அனுமதி கிடைத்ததும், ஒதுக்கப்பட்ட தொகை ஜகாத் நன்கொடையிலிருந்து வழங்கப்பட்டு கணக்கில் பதிவு செய்யப்படும்.',
  },
  {
    icon: HeartHandshake,
    en: 'Mentorship to placement',
    ta: 'வேலைவாய்ப்பு வரை வழிகாட்டல்',
    body: 'Semester progress check-ins through graduation, then help with your first job or further studies.',
    bodyTa: 'பட்டம் வரை ஒவ்வொரு பருவமும் தொடர்பு, பின்னர் முதல் வேலை அல்லது மேற்படிப்புக்கு உதவி.',
  },
]

const PRINCIPLES = [
  {
    icon: BadgeCheck,
    en: 'Every case is verified',
    body: 'Applications are checked against documents and a home visit before any amount is sanctioned.',
  },
  {
    icon: HandCoins,
    en: 'Every rupee is accounted for',
    body: 'Donations received and funds disbursed are entered in one ledger and reconciled against the bank.',
  },
  {
    icon: Users,
    en: 'Support beyond fees',
    body: 'Students share progress each semester and get guidance until they are working or studying further.',
  },
]

export function LandingPage() {
  const { user } = useAuth()
  const { beneficiaries, transactions, partners } = useStore()
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null)
  const root = useRef<HTMLDivElement>(null)

  const storeHasData = beneficiaries.length + transactions.length + partners.length > 0

  // Logged-out visitors can't read the tables under RLS; the homepage uses the
  // aggregate-only RPC instead. Staff see the live store.
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

  const stats =
    !storeHasData && publicStats
      ? {
          students: publicStats.studentsFunded,
          disbursed: publicStats.amountDisbursed || publicStats.inflowTotal,
          graduated: publicStats.graduated,
          partners: publicStats.partners,
        }
      : {
          students: beneficiaries.length,
          disbursed:
            beneficiaries.reduce((s, b) => s + b.fundingReceived, 0) ||
            transactions.filter((t) => t.direction === 'inflow').reduce((s, t) => s + t.amount, 0),
          graduated: beneficiaries.filter((b) => b.status === 'completed' || b.careerSurvey?.status === 'already_employed').length,
          partners: partners.length,
        }
  // A brand-new fund showing rows of zeros helps nobody; the band appears once there's a record.
  const showStats = stats.students > 0

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Hero: headline words rise out of a mask. autoSplit re-splits once web fonts load
        // (or the layout changes), so line breaks always match the final typeface.
        SplitText.create('[data-hero-title]', {
          type: 'words',
          mask: 'words',
          autoSplit: true,
          onSplit: (self) => gsap.from(self.words, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.06 }),
        })
        gsap
          .timeline({ defaults: { ease: 'power3.out' }, delay: 0.35 })
          .from('[data-hero-fade]', { autoAlpha: 0, y: 16, duration: 0.7, stagger: 0.08 })
          .from('[data-journey-step]', { autoAlpha: 0, x: 18, duration: 0.6, stagger: 0.1 }, '-=0.5')
          .from('[data-journey-rail]', { scaleY: 0, transformOrigin: 'top', duration: 1, ease: 'power2.inOut' }, '<')

        gsap.to('[data-hero-bg]', {
          yPercent: 18,
          ease: 'none',
          scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
        })

        // Mission statement: words brighten as the paragraph scrolls through.
        SplitText.create('[data-mission]', {
          type: 'words',
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(
              self.words,
              { opacity: 0.16 },
              {
                opacity: 1,
                ease: 'none',
                stagger: 0.05,
                scrollTrigger: { trigger: '[data-mission]', start: 'top 80%', end: 'bottom 45%', scrub: true },
              },
            ),
        })

        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el.children, {
            autoAlpha: 0,
            y: 28,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 82%', once: true },
          })
        })

      })

      // "How it works": pinned with a filling progress rail on wide screens.
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const steps = gsap.utils.toArray<HTMLElement>('[data-step]')
        gsap.set(steps, { opacity: 0.35 })
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '[data-process]',
            start: 'top top+=80',
            end: () => `+=${steps.length * 260}`,
            pin: true,
            scrub: 0.6,
          },
        })
        tl.fromTo('[data-process-rail]', { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: steps.length }, 0)
        steps.forEach((step, i) => {
          tl.to(step, { opacity: 1, duration: 0.4 }, i)
          tl.to(
            step.querySelector('[data-step-dot]'),
            { backgroundColor: '#2f68cc', color: '#fff', borderColor: '#2f68cc', duration: 0.3 },
            i,
          )
        })
      })

      // Count-ups; with reduced motion the final numbers are simply shown.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
          const target = Number(el.dataset.count)
          const render = (n: number) => {
            el.textContent = el.dataset.format === 'inr' ? formatINR(Math.round(n), { compact: true }) : String(Math.round(n))
          }
          const counter = { n: 0 }
          render(0)
          gsap.to(counter, {
            n: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => render(counter.n),
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          })
        })
      }
    }, root)
    return () => ctx.revert()
  }, [showStats, stats.students, stats.disbursed, stats.graduated, stats.partners])

  const statItems = [
    { value: stats.students, format: 'n', en: 'Students funded', ta: 'நிதியுதவி பெற்ற மாணவர்கள்' },
    { value: stats.disbursed, format: 'inr', en: 'Disbursed', ta: 'வழங்கப்பட்ட நிதி' },
    { value: stats.graduated, format: 'n', en: 'Graduated or employed', ta: 'பட்டம் / வேலை' },
    { value: stats.partners, format: 'n', en: 'Partner organisations', ta: 'கூட்டாளர் அமைப்புகள்' },
  ]
  const applyTo = user ? '/applications/new' : '/register'

  return (
    <div ref={root} className="bg-white text-surface-800">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-surface-600 md:flex" aria-label="Homepage">
            <a href="#how" className="hover:text-surface-900">How it works</a>
            <a href="#principles" className="hover:text-surface-900">Our principles</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LangSwitch />
            </div>
            {user ? (
              <Link to="/applications" className="btn-primary !py-1.5">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn-ghost !py-1.5">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section data-hero className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
        <div
          data-hero-bg
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 h-[42rem] bg-[radial-gradient(60rem_30rem_at_70%_0%,var(--color-primary-100),transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-surface-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-surface-200)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p data-hero-fade className="text-sm font-medium text-primary-700">
              Zakkath education fund · Salem, Tamil Nadu
            </p>
            <h1
              data-hero-title
              className="font-display mt-4 text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-surface-900 sm:text-6xl"
            >
              A college degree shouldn’t depend on family income.
            </h1>
            <p data-hero-fade className="ta mt-4 text-lg text-primary-800">
              குடும்ப வருமானம் கல்விக்கு தடையாக இருக்கக்கூடாது.
            </p>
            <p data-hero-fade className="mt-5 max-w-xl text-lg leading-relaxed text-surface-600">
              APTA Empowers funds the education of students from low-income families in Salem through community Zakkath
              — and stays with each student from the first day of class to the first day of work.
            </p>
            <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={applyTo} className="btn-accent group !px-5 !py-2.5 text-[15px]">
                Apply for funding
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#how" className="btn-ghost !px-5 !py-2.5 text-[15px]">
                See how it works
              </a>
            </div>
          </div>

          <div data-hero-fade className="card relative p-6 shadow-[0_24px_60px_-30px_rgba(31,61,108,0.35)]">
            <p className="text-xs font-medium uppercase tracking-wider text-surface-500">Your application, step by step</p>
            <ol className="relative mt-5 space-y-5">
              <span data-journey-rail aria-hidden="true" className="absolute bottom-3 left-[15px] top-3 w-px bg-primary-200" />
              {STEPS.map((s, i) => (
                <li key={s.en} data-journey-step className="relative flex gap-4">
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular ${
                      i === 0 ? 'border-primary-600 bg-primary-600 text-white' : 'border-surface-300 bg-white text-surface-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <p className="text-sm font-medium text-surface-900">{s.en}</p>
                    <p className="ta text-xs text-surface-500">{s.ta}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {showStats && (
        <section className="border-y border-surface-200 bg-surface-50">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-surface-200 px-5 lg:grid-cols-4 lg:divide-x">
            {statItems.map((s) => (
              <div key={s.en} className="px-2 py-8 lg:px-8">
                <dt className="text-sm text-surface-500">
                  {s.en}
                  <span className="ta block text-xs">{s.ta}</span>
                </dt>
                <dd
                  data-count={s.value}
                  data-format={s.format}
                  className="font-display mt-2 text-4xl font-semibold tracking-tight text-surface-900 tabular"
                >
                  {s.format === 'inr' ? formatINR(s.value, { compact: true }) : s.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-5 py-24 sm:py-32">
        <p data-mission className="font-display text-2xl leading-snug text-surface-900 sm:text-[2rem]">
          Zakkath is meant to lift a family for good. We put it where it lasts longest — in a student’s education — and
          keep checking in every semester until they graduate and find their footing.
        </p>
        <p className="ta mt-6 text-base leading-relaxed text-surface-600">
          ஜகாத் ஒரு குடும்பத்தை நிரந்தரமாக உயர்த்த வேண்டும். அதனால் அதை மாணவரின் கல்வியில் முதலீடு செய்கிறோம் — பட்டம்
          பெறும் வரை ஒவ்வொரு பருவமும் உடன் இருக்கிறோம்.
        </p>
      </section>

      <section id="how" className="scroll-mt-20 bg-surface-50 py-24">
        <div data-process className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">How it works</h2>
            <p className="ta mt-1 text-primary-800">எப்படி இயங்குகிறது</p>
            <p className="mt-4 max-w-sm leading-relaxed text-surface-600">
              One application, one team that knows your case, and a clear decision you can follow in your account.
            </p>
            <Link to={applyTo} className="btn-primary mt-8">
              Start an application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ol className="relative space-y-4">
            <span aria-hidden="true" className="absolute bottom-6 left-[35px] top-6 hidden w-px bg-surface-200 lg:block" />
            <span
              data-process-rail
              aria-hidden="true"
              className="absolute bottom-6 left-[35px] top-6 hidden w-px origin-top bg-primary-500 lg:block"
            />
            {STEPS.map((s, i) => (
              <li key={s.en} data-step className="card relative flex gap-5 p-5">
                <span
                  data-step-dot
                  className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-surface-300 bg-white text-xs font-semibold text-surface-600 tabular"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 font-medium text-surface-900">
                    <s.icon className="h-4 w-4 text-primary-600" /> {s.en}
                  </h3>
                  <p className="ta text-xs text-surface-500">{s.ta}</p>
                  <p className="mt-2 text-sm leading-relaxed text-surface-600">{s.body}</p>
                  <p className="ta mt-1 text-xs leading-relaxed text-surface-500">{s.bodyTa}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div data-reveal className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-surface-900 sm:text-4xl">
            Accountable to every donor.
          </h2>
          <p className="mt-3 leading-relaxed text-surface-600">
            Zakkath is given in trust that it reaches the right hands. These are the rules we hold ourselves to.
          </p>
        </div>
        <div data-reveal className="mt-12 grid gap-px overflow-hidden rounded-xl border border-surface-200 bg-surface-200 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.en} className="bg-white p-7">
              <p.icon className="h-5 w-5 text-primary-600" />
              <h3 className="mt-4 font-medium text-surface-900">{p.en}</h3>
              <p className="mt-2 text-sm leading-relaxed text-surface-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24">
        <div
          data-reveal
          className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl bg-primary-600 px-8 py-12 text-white sm:px-12 md:flex-row md:items-center"
        >
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Applications are open.</h2>
            <p className="ta mt-1 text-primary-100">விண்ணப்பங்கள் திறந்துள்ளன.</p>
            <p className="mt-3 max-w-lg text-primary-100">
              Keep your Aadhaar, income certificate and latest fee receipt handy before you start.
            </p>
          </div>
          <Link to={applyTo} className="btn-accent !px-6 !py-3 text-[15px]">
            Apply now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-surface-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-surface-500 sm:flex-row sm:items-center sm:justify-between">
          <p>APTA Empowers · All Praise To Allah · Salem, Tamil Nadu</p>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-surface-800">Staff sign in</Link>
            <Link to="/register" className="hover:text-surface-800">Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
