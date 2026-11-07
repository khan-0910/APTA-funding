import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { POLICY_UPDATED, SITE } from '@/lib/site'

const contactEmail = SITE.grievanceOfficer.email || SITE.email

function LegalLayout({ title, titleTa, updated, children }: { title: string; titleTa: string; updated?: boolean; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl pb-10">
      <header className="mb-8 border-b border-surface-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-surface-900 sm:text-3xl">{title}</h1>
        <p className="ta mt-0.5 text-sm text-surface-500">{titleTa}</p>
        {updated && <p className="mt-3 text-sm text-surface-500">Last updated {POLICY_UPDATED}</p>}
      </header>
      <div className="space-y-8 text-[15px] leading-relaxed text-surface-700 [&_a]:font-medium [&_a]:text-primary-700 [&_a:hover]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-surface-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:mt-2 [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  )
}

/** "write to us at …" with whatever contact details have been filled in. */
function ContactLine() {
  if (!contactEmail && !SITE.phone) return <Link to="/contact">our contact page</Link>
  return (
    <>
      {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
      {contactEmail && SITE.phone && ' or '}
      {SITE.phone && <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a>}
    </>
  )
}

const orgName = SITE.legalName ? `${SITE.name} (${SITE.legalName})` : SITE.name

export function ContactPage() {
  const rows = [
    SITE.email && { icon: Mail, label: 'Email', value: <a href={`mailto:${SITE.email}`}>{SITE.email}</a> },
    SITE.phone && { icon: Phone, label: 'Phone', value: <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a> },
    SITE.whatsapp && {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: (
        <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer">
          Message us on WhatsApp
        </a>
      ),
    },
    SITE.address && { icon: MapPin, label: 'Address', value: <span className="whitespace-pre-line">{SITE.address}</span> },
    SITE.officeHours && { icon: Clock, label: 'Office hours', value: SITE.officeHours },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; value: ReactNode }>

  return (
    <LegalLayout title="Contact us" titleTa="எங்களைத் தொடர்பு கொள்ள">
      <p>
        Questions about an application, a donation or this website? Reach us below. Please don't send Aadhaar numbers,
        bank details or documents by email — upload documents through your application instead.
      </p>
      {rows.length > 0 ? (
        <dl className="card divide-y divide-surface-200">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-4 p-5">
              <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <dt className="text-sm text-surface-500">{r.label}</dt>
                <dd className="mt-0.5 text-surface-900 [&_a]:text-primary-700">{r.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <p className="card p-5 text-surface-500">Contact details will be published here shortly.</p>
      )}
      {(SITE.grievanceOfficer.name || SITE.grievanceOfficer.email) && (
        <section>
          <h2>Privacy requests and complaints</h2>
          <p>
            Our Grievance Officer{SITE.grievanceOfficer.name && <>, {SITE.grievanceOfficer.name},</>} handles requests to
            access, correct or delete your data and any complaint about how we handle it
            {SITE.grievanceOfficer.email && (
              <>
                {' '}
                — <a href={`mailto:${SITE.grievanceOfficer.email}`}>{SITE.grievanceOfficer.email}</a>
              </>
            )}
            . See our <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </section>
      )}
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" titleTa="தனியுரிமைக் கொள்கை" updated>
      <section>
        <p>
          {orgName} ("APTA", "we") runs this website to receive and manage applications for Zakkath-funded educational
          assistance in {SITE.city}. This policy explains what personal data we collect, why, who can see it, and the
          choices you have. We follow India's Digital Personal Data Protection Act, 2023.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your name and email address. Your password is handled by our authentication provider; we never see it.</li>
          <li><strong>Application details:</strong> contact number, address, age, gender, marital status, Aadhaar number, family members and their occupations and income, household assets and expenses, education history and marks, references, and your statement of need.</li>
          <li><strong>Documents you upload:</strong> such as your Aadhaar card, income certificate, fee receipts and mark sheets.</li>
          <li><strong>Progress and career information:</strong> semester reports and grades, and after graduation your employment, salary, resume or offer letter if you choose to share them.</li>
          <li><strong>Sign-in records:</strong> the time of each sign-in or sign-out and your browser type, used to keep accounts secure.</li>
        </ul>
        <p className="mt-3">
          We do not use advertising or tracking cookies, and we do not load fonts or scripts from tracking services. To
          keep the site fast we measure how quickly pages load (Vercel Speed Insights): this records the page type, browser
          and device type and load timings — no cookies, no names, emails or record numbers. Your browser stores your
          sign-in session and language preference locally so the site keeps working.
        </p>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To check whether you are eligible for Zakkath assistance and to verify your application, including a home visit.</li>
          <li>To decide on, disburse and keep accounts of any assistance given.</li>
          <li>To follow your progress and help with placement or further studies after graduation.</li>
          <li>To contact you about your application, and to keep the service secure and prevent misuse.</li>
          <li>To publish overall totals (for example, how many students we have funded) — never anything that identifies you.</li>
        </ul>
        <p className="mt-3">
          We process your data on the basis of the consent you give when you create an account and submit an application.
          You can withdraw consent at any time (see "Your rights"); we will then stop processing your application, except
          for records we must keep by law.
        </p>
      </section>

      <section>
        <h2>Who can see it</h2>
        <ul>
          <li><strong>You</strong> can see your own account, applications, documents and reports.</li>
          <li><strong>Authorised APTA staff and volunteers</strong> who review applications can see application data. Access is enforced by the database itself, not just the website.</li>
          <li><strong>Service providers</strong> that run the site for us under contract: Supabase (database, sign-in and document storage{SITE.dataRegion && `, hosted in ${SITE.dataRegion}`}) and Vercel (delivers the website's pages and measures page speed; it does not receive your application data){/* Turnstile is listed only when enabled */}{import.meta.env.VITE_TURNSTILE_SITE_KEY ? ', and Cloudflare Turnstile (a bot check on sign-in forms)' : ''}.</li>
          <li><strong>Authorities</strong>, only where the law requires it.</li>
        </ul>
        <p className="mt-3">We never sell your data or share it with donors, partners or advertisers.</p>
      </section>

      <section>
        <h2>How we protect it</h2>
        <ul>
          <li>All traffic is encrypted (HTTPS).</li>
          <li>Each student can only read their own records; only staff can review applications, and only administrators can change who has staff access.</li>
          <li>Documents are kept in private storage and opened only through links that expire after a minute.</li>
          <li>Aadhaar numbers are shown masked (only the last four digits) on screen.</li>
        </ul>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep application records while your application or funding is active and for up to five years after the last
          disbursement or the closing of your application, so that we can meet accounting and audit requirements. After
          that we delete them. If you are not funded and ask us to delete your data, we will do so.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>You can ask us to:</p>
        <ul>
          <li>give you a summary of the personal data we hold about you and how we use it;</li>
          <li>correct or complete inaccurate data, or delete data we no longer need;</li>
          <li>withdraw your consent;</li>
          <li>nominate someone to exercise these rights for you in case of death or incapacity.</li>
        </ul>
        <p className="mt-3">
          Write to <ContactLine />
          {SITE.grievanceOfficer.name && <> (Grievance Officer: {SITE.grievanceOfficer.name})</>}. We will respond within 30
          days. If you are not satisfied, you may complain to the Data Protection Board of India.
        </p>
      </section>

      <section>
        <h2>Applicants under 18</h2>
        <p>
          If you are under 18, a parent or legal guardian must create the account or complete the application with you
          and give consent on your behalf.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy in a way that matters, we will update the date above and ask for your consent again
          where required.
        </p>
      </section>
    </LegalLayout>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" titleTa="பயன்பாட்டு விதிமுறைகள்" updated>
      <section>
        <p>
          These terms apply to your use of this website, run by {orgName}. By creating an account you agree to them and
          to our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>
      <section>
        <h2>Applications</h2>
        <ul>
          <li>Information and documents you submit must be true and complete. False information can lead to rejection or to withdrawal of assistance already given.</li>
          <li>Submitting an application does not guarantee funding. Decisions are made by APTA after verification, depending on need and available Zakkath funds, and are final.</li>
          <li>Funded students agree to share semester progress reports and to tell us of changes in their studies.</li>
        </ul>
      </section>
      <section>
        <h2>Your account</h2>
        <ul>
          <li>Keep your password private and tell us if you think someone else has used your account.</li>
          <li>Create one account per person. If you are under 18, a parent or guardian must agree to these terms for you.</li>
        </ul>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Don't try to access other people's data, interfere with the site, upload anything harmful or unrelated to an
          application, or create accounts automatically. We may suspend accounts that do.
        </p>
      </section>
      <section>
        <h2>Liability</h2>
        <p>
          We work to keep the site available and accurate but provide it "as is". To the extent the law allows, APTA is not
          liable for losses arising from use of the site or from interruptions to it.
        </p>
      </section>
      <section>
        <h2>Law</h2>
        <p>These terms are governed by the laws of India, and courts in {SITE.city} have jurisdiction.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <ContactLine />.
        </p>
      </section>
      <p className="flex items-center gap-2 text-sm text-surface-500">
        <ShieldCheck className="h-4 w-4" /> Also see our <Link to="/privacy">Privacy Policy</Link>.
      </p>
    </LegalLayout>
  )
}
