import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, FileText, Trash2, Upload } from 'lucide-react'
import { Field, PageHeader, SectionCard } from '@/components/ui'
import { emptyDraft, type ApplicationDraft } from '@/lib/applicationDraft'
import { computeAcademicProjection } from '@/lib/academic'
import { formatAadhaar, formatIndianMobile, formatINR } from '@/lib/format'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import type { Application, AttachedDocument } from '@/types'

const uid = (p: string): string => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const DOC_CATEGORIES = ['Aadhaar Card', 'Income Certificate', 'Fee Receipt', 'Mark Sheet', 'Other']

export function NewApplicationPage() {
  const store = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<ApplicationDraft>(emptyDraft)
  const [attachments, setAttachments] = useState<AttachedDocument[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [docCategory, setDocCategory] = useState(DOC_CATEGORIES[0])

  const projection = useMemo(
    () =>
      computeAcademicProjection({
        educationType: draft.education.educationType,
        yearText:
          draft.education.educationType === 'school' ? draft.education.schoolYear : draft.education.collegeYear,
      }),
    [draft.education],
  )

  const set = <K extends keyof ApplicationDraft>(key: K, patch: Partial<ApplicationDraft[K]>) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }))

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const next: AttachedDocument[] = []
    for (const f of Array.from(files)) {
      next.push({
        id: uid('doc'),
        name: f.name,
        type: f.type || 'application/octet-stream',
        size: f.size,
        category: docCategory,
        uploadedAt: new Date().toISOString(),
      })
    }
    setAttachments((prev) => [...prev, ...next])
  }

  const submit = async () => {
    setSubmissionError('')
    if (!draft.basicInfo.fullName.trim()) {
      setSubmissionError('Full name is required / முழுப் பெயர் தேவை.')
      return
    }
    if (!draft.declaration.undertakingAgreed) {
      setSubmissionError('Please confirm the Zakkath undertaking / ஜகாத் உறுதிமொழியை உறுதிசெய்யவும்.')
      return
    }
    setSubmitting(true)
    const app: Application = {
      id: uid('app'),
      studentId: user?.id ?? 'guest',
      studentName: draft.basicInfo.fullName,
      category: draft.purpose.category === '' ? 'education' : draft.purpose.category,
      educationLevel:
        draft.education.educationType === 'school'
          ? 'schooling'
          : draft.purpose.category === 'education'
            ? 'undergraduate'
            : 'postgraduate',
      program:
        draft.education.educationType === 'school'
          ? `${draft.education.schoolName || 'School'} — ${draft.education.schoolYear}`
          : `${draft.education.collegeCourse || 'Degree'} — ${draft.education.collegeName}`,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      fundingRequested: Number(draft.purpose.amountRequired) || 0,
      statementOfNeed: draft.purpose.statement,
      basicInfo: {
        ...draft.basicInfo,
        dependents: draft.dependents,
        income: draft.income,
        references: draft.references,
      },
      familyProfile: {
        formDate: draft.declaration.date,
        fatherName: draft.family.fatherName,
        fatherAge: draft.family.fatherAge,
        fatherOccupation: draft.family.fatherOccupation,
        fatherSalary: Number(draft.family.fatherSalary) || 0,
        motherName: draft.family.motherName,
        motherAge: draft.family.motherAge,
        motherOccupation: draft.family.motherOccupation,
        motherSalary: Number(draft.family.motherSalary) || 0,
        siblingDetails: draft.family.siblingDetails,
        presentEducation: educationSummary(draft),
        educationType: draft.education.educationType,
        schoolYear: draft.education.schoolYear,
        schoolName: draft.education.schoolName,
        collegeYear: draft.education.collegeYear,
        collegeCourse: draft.education.collegeCourse,
        collegeName: draft.education.collegeName,
        academicYearSpan: projection?.currentSessionLabel,
        expectedGraduationYear: projection?.expectedGraduation,
        pastSchool10th: {
          schoolName: draft.family.pastSchool10thName,
          marksOrPercentage: draft.family.pastSchool10thMarks,
        },
        pastSchool12th: {
          schoolName: draft.family.pastSchool12thName,
          marksOrPercentage: draft.family.pastSchool12thMarks,
        },
        collegeDetails: {
          collegeName: draft.family.collegeDetailsName,
          degreeAndYear: draft.family.collegeDetailsDegreeYear,
          percentage: draft.family.collegeDetailsPercentage,
        },
      },
      purposeOfAssistance: { ...draft.purpose },
      supportingDocuments: { checklist: DOC_CATEGORIES, attachments },
      declaration: draft.declaration,
    }
    await store.saveApplication(app)
    setSubmitting(false)
    navigate(`/applications/${app.id}`)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Application for Educational Assistance"
        titleTa="கல்வி உதவிக்கான விண்ணப்பம்"
        subtitle="All information is kept confidential and used only for Zakkath eligibility."
        subtitleTa="வழங்கிய தகவல்கள் இரகசியமாக வைக்கப்படும்."
        actions={
          <button className="btn-ghost" onClick={() => setDraft(emptyDraft)}>
            <Trash2 className="h-4 w-4" /> Clear Form / <span className="ta">படிவத்தை காலி செய்</span>
          </button>
        }
      />

      {/* 1: Basic info */}
      <SectionCard number={1} title="Basic Applicant Information" titleTa="அடிப்படை விவரங்கள்">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full Name" labelTa="முழுப் பெயர்" required>
            <input className="input-base" value={draft.basicInfo.fullName} onChange={(e) => set('basicInfo', { fullName: e.target.value })} />
          </Field>
          <Field label="Age" labelTa="வயது" required>
            <input className="input-base" type="number" min={1} max={100} value={draft.basicInfo.age} onChange={(e) => set('basicInfo', { age: e.target.value })} />
          </Field>
          <Field label="Gender" labelTa="பாலினம்" required>
            <select className="input-base" value={draft.basicInfo.gender} onChange={(e) => set('basicInfo', { gender: e.target.value as ApplicationDraft['basicInfo']['gender'] })}>
              <option value="">— Select / தேர்வு —</option>
              <option value="Male">Male / ஆண்</option>
              <option value="Female">Female / பெண்</option>
              <option value="Other">Other / மற்றவை</option>
            </select>
          </Field>
          <Field label="Door / Flat No" labelTa="கதவு / பிளாட் எண்">
            <input className="input-base" value={draft.basicInfo.doorNo} onChange={(e) => set('basicInfo', { doorNo: e.target.value })} />
          </Field>
          <Field label="Street / Lane" labelTa="தெரு / சந்து">
            <input className="input-base" value={draft.basicInfo.street} onChange={(e) => set('basicInfo', { street: e.target.value })} />
          </Field>
          <Field label="Village / Town" labelTa="கிராமம் / நகரம்" hint="Hasthampatti, Manakkadu, Fairlands, Ammapet, Gugai…">
            <input className="input-base" value={draft.basicInfo.villageTown} onChange={(e) => set('basicInfo', { villageTown: e.target.value })} />
          </Field>
          <Field label="District" labelTa="மாவட்டம்">
            <input className="input-base" value={draft.basicInfo.district} onChange={(e) => set('basicInfo', { district: e.target.value })} />
          </Field>
          <Field label="State" labelTa="மாநிலம்">
            <input className="input-base" value={draft.basicInfo.state} onChange={(e) => set('basicInfo', { state: e.target.value })} />
          </Field>
          <Field label="PIN Code" labelTa="அஞ்சல் குறியீடு">
            <input className="input-base" inputMode="numeric" maxLength={6} value={draft.basicInfo.pinCode} onChange={(e) => set('basicInfo', { pinCode: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="Contact Mobile" labelTa="கைபேசி எண்" required>
            <input
              className="input-base"
              value={draft.basicInfo.mobile}
              onChange={(e) => set('basicInfo', { mobile: formatIndianMobile(e.target.value) })}
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field label="Aadhaar Number" labelTa="ஆதார் எண்" hint="12 digits / 12 இலக்கங்கள்">
            <input
              className="input-base"
              value={draft.basicInfo.aadhaar}
              onChange={(e) => set('basicInfo', { aadhaar: formatAadhaar(e.target.value) })}
              placeholder="#### #### ####"
            />
          </Field>
          <Field label="Marital Status" labelTa="திருமண நிலை">
            <select className="input-base" value={draft.basicInfo.maritalStatus} onChange={(e) => set('basicInfo', { maritalStatus: e.target.value })}>
              <option value="">— Select / தேர்வு —</option>
              <option>Unmarried / திருமணம் ஆகாதவர்</option>
              <option>Married / திருமணமானவர்</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      {/* 2: Education */}
      <SectionCard number={2} title="Education Level & Academic Timeline" titleTa="கல்வி நிலை & கல்விக்காலம்">
        <Field label="Education Type" labelTa="கல்வி நிலை" required>
          <select
            className="input-base sm:max-w-xs"
            value={draft.education.educationType}
            onChange={(e) => set('education', { educationType: e.target.value as ApplicationDraft['education']['educationType'] })}
          >
            <option value="school">School / பள்ளி</option>
            <option value="college">College / Higher Education / கல்லூரி / உயர் கல்வி</option>
          </select>
        </Field>

        {draft.education.educationType === 'school' ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Year / Standard of Study" labelTa="படிக்கும் வகுப்பு / ஆண்டு" required hint='e.g. "10th Standard", "12th Std"'>
              <input className="input-base" value={draft.education.schoolYear} onChange={(e) => set('education', { schoolYear: e.target.value })} placeholder="10th Standard" />
            </Field>
            <Field label="School Name & Medium" labelTa="பள்ளியின் பெயர் & பயிற்று மொழி" required>
              <input className="input-base" value={draft.education.schoolName} onChange={(e) => set('education', { schoolName: e.target.value })} placeholder="Govt Girls HSS, Hasthampatti (Tamil medium)" />
            </Field>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Year of Study" labelTa="படிக்கும் ஆண்டு" required hint='e.g. "1st Year / முதலாம் ஆண்டு", "Final Year"'>
              <input className="input-base" value={draft.education.collegeYear} onChange={(e) => set('education', { collegeYear: e.target.value })} placeholder="3rd Year / மூன்றாம் ஆண்டு" />
            </Field>
            <Field label="Course / Degree & Specialization" labelTa="படிக்கும் படிப்பு / துறை" required>
              <input className="input-base" value={draft.education.collegeCourse} onChange={(e) => set('education', { collegeCourse: e.target.value })} placeholder="B.E. Computer Science" />
            </Field>
            <Field label="College / University Name" labelTa="கல்லூரி / பல்கலைக்கழகத்தின் பெயர்" required>
              <input className="input-base" value={draft.education.collegeName} onChange={(e) => set('education', { collegeName: e.target.value })} placeholder="Dhirajlal Gandhi College of Technology" />
            </Field>
          </div>
        )}

        {/* Academic calendar projection */}
        {projection && (
          <div className="mt-5 rounded-xl border border-primary-200 bg-primary-50/70 p-4 dark:border-primary-800 dark:bg-primary-900/25">
            <p className="flex items-center gap-2 text-sm font-bold text-primary-800 dark:text-primary-200">
              <CalendarDays className="h-4.5 w-4.5" />
              Academic Calendar Projection / <span className="ta">கல்வியாண்டு கணிப்பு</span>
            </p>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Current Academic Session / <span className="ta">நடப்பு கல்வியாண்டு</span></p>
                <p className="font-bold text-surface-800 dark:text-surface-100">{projection.currentSessionLabel}</p>
                <p className="ta text-xs text-surface-500">{projection.currentSessionLabelTa}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400">4-Year Degree Completion / <span className="ta">படிப்பு முடிவு</span></p>
                <p className="font-bold text-surface-800 dark:text-surface-100">{projection.expectedGraduation}</p>
                <p className="ta text-xs text-surface-500">{projection.expectedGraduationTa}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Duration Remaining / <span className="ta">மீதமுள்ள காலம்</span></p>
                <p className="font-bold text-amber-600 dark:text-amber-300">{projection.yearsRemainingLabel}</p>
                {projection.isFinalYearOrBeyond && (
                  <p className="text-xs text-surface-500">Career survey unlocks after this session / <span className="ta">இந்த ஆண்டு முடிந்ததும் தொழில் கணக்கெடுப்பு</span></p>
                )}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 3: Family profile */}
      <SectionCard number={3} title="Family Profile & Educational Background" titleTa="குடும்ப விவரங்கள்">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Father's Name" labelTa="தந்தையின் பெயர்">
            <input className="input-base" value={draft.family.fatherName} onChange={(e) => set('family', { fatherName: e.target.value })} />
          </Field>
          <Field label="Father's Age" labelTa="தந்தையின் வயது">
            <input className="input-base" type="number" value={draft.family.fatherAge} onChange={(e) => set('family', { fatherAge: e.target.value })} />
          </Field>
          <Field label="Father's Occupation" labelTa="தந்தையின் தொழில்">
            <input className="input-base" value={draft.family.fatherOccupation} onChange={(e) => set('family', { fatherOccupation: e.target.value })} placeholder="Daily Wage / தினசரி கூலி" />
          </Field>
          <Field label="Father's Monthly Salary (₹)" labelTa="மாத வருமானம் (₹)">
            <input className="input-base" type="number" min={0} value={draft.family.fatherSalary} onChange={(e) => set('family', { fatherSalary: e.target.value })} />
          </Field>
          <Field label="Mother's Name" labelTa="தாயின் பெயர்">
            <input className="input-base" value={draft.family.motherName} onChange={(e) => set('family', { motherName: e.target.value })} />
          </Field>
          <Field label="Mother's Age" labelTa="தாயின் வயது">
            <input className="input-base" type="number" value={draft.family.motherAge} onChange={(e) => set('family', { motherAge: e.target.value })} />
          </Field>
          <Field label="Mother's Occupation" labelTa="தாயின் தொழில்">
            <input className="input-base" value={draft.family.motherOccupation} onChange={(e) => set('family', { motherOccupation: e.target.value })} placeholder="Housewife / இல்லத்தரசி" />
          </Field>
          <Field label="Mother's Monthly Salary (₹)" labelTa="மாத வருமானம் (₹)">
            <input className="input-base" type="number" min={0} value={draft.family.motherSalary} onChange={(e) => set('family', { motherSalary: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Sibling Details" labelTa="உடன்பிறப்புகள் விவரங்கள்">
              <textarea className="input-base min-h-16" value={draft.family.siblingDetails} onChange={(e) => set('family', { siblingDetails: e.target.value })} />
            </Field>
          </div>
          <Field label="10th Std School" labelTa="10-ம் வகுப்பு பள்ளி">
            <input className="input-base" value={draft.family.pastSchool10thName} onChange={(e) => set('family', { pastSchool10thName: e.target.value })} />
          </Field>
          <Field label="10th Marks / %" labelTa="10-ம் வகுப்பு மதிப்பெண்">
            <input className="input-base" value={draft.family.pastSchool10thMarks} onChange={(e) => set('family', { pastSchool10thMarks: e.target.value })} placeholder="482/500 (96%)" />
          </Field>
          <Field label="12th Std School" labelTa="12-ம் வகுப்பு பள்ளி">
            <input className="input-base" value={draft.family.pastSchool12thName} onChange={(e) => set('family', { pastSchool12thName: e.target.value })} />
          </Field>
          <Field label="12th Marks / %" labelTa="12-ம் வகுப்பு மதிப்பெண்">
            <input className="input-base" value={draft.family.pastSchool12thMarks} onChange={(e) => set('family', { pastSchool12thMarks: e.target.value })} placeholder="573/600 (95.5%)" />
          </Field>
          <Field label="College (if any)" labelTa="கல்லூரி">
            <input className="input-base" value={draft.family.collegeDetailsName} onChange={(e) => set('family', { collegeDetailsName: e.target.value })} />
          </Field>
          <Field label="Degree & Year" labelTa="படிப்பு & ஆண்டு">
            <input className="input-base" value={draft.family.collegeDetailsDegreeYear} onChange={(e) => set('family', { collegeDetailsDegreeYear: e.target.value })} />
          </Field>
          <Field label="Current CGPA / %" labelTa="தற்போதைய சதவீதம்">
            <input className="input-base" value={draft.family.collegeDetailsPercentage} onChange={(e) => set('family', { collegeDetailsPercentage: e.target.value })} placeholder="8.6 CGPA" />
          </Field>
        </div>
      </SectionCard>

      {/* 4: Dependents & assets */}
      <SectionCard number={4} title="Family Dependents & Assets" titleTa="குடும்ப சார்ந்திருப்போர் & சொத்து விவரங்கள்">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Total Family Members" labelTa="மொத்த குடும்ப உறுப்பினர்கள்">
            <input className="input-base" type="number" min={1} value={draft.dependents.totalMembers} onChange={(e) => set('dependents', { totalMembers: e.target.value })} />
          </Field>
          <Field label="School-going Children" labelTa="பள்ளிச் சேர்க்கை குழந்தைகள்">
            <input className="input-base" type="number" min={0} value={draft.dependents.schoolGoingChildren} onChange={(e) => set('dependents', { schoolGoingChildren: e.target.value })} />
          </Field>
          <Field label="Elderly Dependents" labelTa="முதியோர்">
            <input className="input-base" type="number" min={0} value={draft.dependents.elderlyDependents} onChange={(e) => set('dependents', { elderlyDependents: e.target.value })} />
          </Field>
          <Field label="Disabled / Chronically Ill" labelTa="மாற்றுத்திறனாளிகள் / நோயுற்றோர்">
            <input className="input-base" type="number" min={0} value={draft.dependents.disabledMembers} onChange={(e) => set('dependents', { disabledMembers: e.target.value })} />
          </Field>
          <Field label="House Ownership" labelTa="வீட்டு உரிமை" required>
            <select
              className="input-base"
              value={draft.dependents.houseOwnership}
              onChange={(e) => set('dependents', { houseOwnership: e.target.value as ApplicationDraft['dependents']['houseOwnership'] })}
            >
              <option value="">— Select / தேர்வு —</option>
              <option value="own">Own / சொந்த வீடு</option>
              <option value="rented">Rented / வாடகை வீடு</option>
              <option value="other">Other / மற்றவை</option>
            </select>
          </Field>
          {draft.dependents.houseOwnership === 'rented' && (
            <Field label="Monthly Rent (₹)" labelTa="மாத வாடகை (₹)">
              <input className="input-base" type="number" min={0} value={draft.dependents.monthlyRent} onChange={(e) => set('dependents', { monthlyRent: e.target.value })} />
            </Field>
          )}
          <Field label="Land / Vehicle Ownership" labelTa="நிலம் / வாகன உரிமை">
            <select
              className="input-base"
              value={draft.dependents.landVehicleOwnership}
              onChange={(e) => set('dependents', { landVehicleOwnership: e.target.value as ApplicationDraft['dependents']['landVehicleOwnership'] })}
            >
              <option value="">— Select / தேர்வு —</option>
              <option value="yes">Yes / உண்டு</option>
              <option value="no">No / இல்லை</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      {/* 5: Income & benefits */}
      <SectionCard number={5} title="Household Income & Welfare Benefits" titleTa="குடும்ப வருமானம் & உதவித்தொகை">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sources of Income" labelTa="வருமான ஆதாரங்கள்" hint="Daily wage, agriculture, small business…">
            <textarea className="input-base min-h-16" value={draft.income.incomeSources} onChange={(e) => set('income', { incomeSources: e.target.value })} />
          </Field>
          <Field label="Total Monthly Household Income (₹)" labelTa="மொத்த மாத வருமானம் (₹)" required>
            <input className="input-base" type="number" min={0} value={draft.income.totalMonthlyIncome} onChange={(e) => set('income', { totalMonthlyIncome: e.target.value })} />
          </Field>
          <Field label="Government Benefits" labelTa="அரசு உதவிகள்" hint="Ration card subsidy, PM Kisan…">
            <input className="input-base" value={draft.income.govtBenefits} onChange={(e) => set('income', { govtBenefits: e.target.value })} />
          </Field>
          <Field label="Monthly Benefit Amount (₹)" labelTa="மாத உதவித் தொகை (₹)">
            <input className="input-base" type="number" min={0} value={draft.income.govtBenefitAmount} onChange={(e) => set('income', { govtBenefitAmount: e.target.value })} />
          </Field>
        </div>
      </SectionCard>

      {/* 6: Purpose */}
      <SectionCard number={6} title="Purpose of Assistance" titleTa="உதவி கோருவதன் நோக்கம்">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assistance Category" labelTa="உதவி வகை" required>
            <select
              className="input-base"
              value={draft.purpose.category}
              onChange={(e) => set('purpose', { category: e.target.value as ApplicationDraft['purpose']['category'] })}
            >
              <option value="">— Select / தேர்வு —</option>
              <option value="education">Educational Tuition Fee / கல்விக் கட்டணம்</option>
              <option value="health_social">Medical Emergency / மருத்துவ அவசரம்</option>
              <option value="business">Business Aid / தொழில் உதவி</option>
            </select>
          </Field>
          <Field label="Specific Need" labelTa="குறிப்பிட்ட தேவை">
            <input className="input-base" value={draft.purpose.subCategory} onChange={(e) => set('purpose', { subCategory: e.target.value })} placeholder="Tuition Fee / கல்விக் கட்டணம்" />
          </Field>
          <Field label="Amount Required (₹)" labelTa="தேவைப்படும் தொகை (₹)" required>
            <input className="input-base" type="number" min={0} value={draft.purpose.amountRequired} onChange={(e) => set('purpose', { amountRequired: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Detailed Statement of Need"
              labelTa="தேவையின் விரிவான விளக்கம்"
              hint="Explain how this assistance improves your family situation / இந்த உதவி உங்கள் குடும்பத்தை எவ்வாறு மேம்படுத்தும் என்பதை விளக்குங்கள்."
            >
              <textarea className="input-base min-h-28" value={draft.purpose.statement} onChange={(e) => set('purpose', { statement: e.target.value })} />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* 7: References */}
      <SectionCard number={7} title="References" titleTa="சான்றொப்பக் குறிப்புகள்">
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
              <p className="mb-3 text-sm font-bold text-surface-700 dark:text-surface-200">Reference {i + 1}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" labelTa="பெயர்">
                  <input className="input-base" value={draft.references[i].name} onChange={(e) => setRef(i, 'name', e.target.value)} />
                </Field>
                <Field label="Occupation" labelTa="தொழில்">
                  <input className="input-base" value={draft.references[i].occupation} onChange={(e) => setRef(i, 'occupation', e.target.value)} />
                </Field>
                <Field label="Mobile" labelTa="கைபேசி">
                  <input className="input-base" value={draft.references[i].mobile} onChange={(e) => setRef(i, 'mobile', formatIndianMobile(e.target.value))} placeholder="+91 …" />
                </Field>
                <Field label="Relationship" labelTa="உறவு">
                  <input className="input-base" value={draft.references[i].relationship} onChange={(e) => setRef(i, 'relationship', e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address" labelTa="முகவரி">
                    <input className="input-base" value={draft.references[i].address} onChange={(e) => setRef(i, 'address', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 8: Documents + undertaking */}
      <SectionCard number={8} title="Document Attachments & Zakkath Undertaking" titleTa="ஆவணங்கள் & ஜகாத் உறுதிமொழி">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <Field label="Document Category" labelTa="ஆவண வகை">
            <select className="input-base" value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
              {DOC_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Upload Files" labelTa="கோப்புகளை பதிவேற்று" hint="PNG, JPG, PDF — Aadhaar, income certificate, fee receipts, mark sheets">
            <button type="button" className="btn-ghost w-full border-dashed py-6" onClick={() => fileRef.current?.click()}>
              <Upload className="h-5 w-5" /> Choose files / <span className="ta">கோப்புகளைத் தேர்ந்தெடுக்கவும்</span>
            </button>
            <input ref={fileRef} type="file" multiple accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </Field>
        </div>

        {attachments.length > 0 && (
          <ul className="mt-3 divide-y divide-surface-100 rounded-xl border border-surface-200 dark:divide-surface-800 dark:border-surface-700">
            {attachments.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                <FileText className="h-4.5 w-4.5 shrink-0 text-primary-600 dark:text-primary-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-surface-800 dark:text-surface-100">{doc.name}</p>
                  <p className="text-xs text-surface-400">
                    {doc.category} · {(doc.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button type="button" onClick={() => setAttachments((p) => p.filter((d) => d.id !== doc.id))} className="rounded-lg p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={draft.declaration.undertakingAgreed}
              onChange={(e) => set('declaration', { undertakingAgreed: e.target.checked })}
              className="mt-1 h-4.5 w-4.5 accent-amber-600"
            />
            <span className="text-sm leading-relaxed text-surface-800 dark:text-surface-100">
              <span className="font-semibold">I here by under take that the information provided above is true and that the student is eligible for Zakkath assistance.</span>
              <span className="ta block text-surface-600 dark:text-surface-300">
                மேற்கண்ட தகவல்கள் உண்மையானவை என்றும் மாணவர் ஜகாத் உதவியை பெறுவதற்கு தகுதியுடையவர் என்றும் உறுதியளிக்கிறேன்.
              </span>
            </span>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Place" labelTa="இடம்">
              <input className="input-base" value={draft.declaration.place} onChange={(e) => set('declaration', { place: e.target.value })} />
            </Field>
            <Field label="Date" labelTa="தேதி">
              <input className="input-base" type="date" value={draft.declaration.date} onChange={(e) => set('declaration', { date: e.target.value })} />
            </Field>
            <Field label="Signature Name" labelTa="கையொப்பப் பெயர்">
              <input className="input-base" value={draft.declaration.signatureOrName} onChange={(e) => set('declaration', { signatureOrName: e.target.value })} />
            </Field>
          </div>
        </div>
      </SectionCard>

      {submissionError && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">{submissionError}</p>
      )}

      <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-surface-800 dark:bg-surface-900/90 no-print">
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Request preview: <span className="font-bold text-surface-800 dark:text-surface-100">{formatINR(Number(draft.purpose.amountRequired) || 0)}</span>
          {projection && <> · Graduation: <span className="font-bold text-surface-800 dark:text-surface-100">{projection.expectedGraduation}</span></>}
        </p>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setDraft(emptyDraft())}>
            Clear / <span className="ta">அழி</span>
          </button>
          <button className="btn-primary" disabled={submitting} onClick={() => void submit()}>
            <CheckCircle2 className="h-4.5 w-4.5" />
            {submitting ? 'Submitting…' : 'Submit Application / சமர்ப்பி'}
          </button>
        </div>
      </div>
    </div>
  )

  function setRef(i: number, key: keyof ApplicationDraft['references'][0], value: string) {
    setDraft((d) => {
      const refs = [...d.references] as ApplicationDraft['references']
      refs[i] = { ...refs[i], [key]: value }
      return { ...d, references: refs }
    })
  }
}

function educationSummary(draft: ApplicationDraft): string {
  return draft.education.educationType === 'school'
    ? `${draft.education.schoolYear} — ${draft.education.schoolName}`
    : `${draft.education.collegeYear} ${draft.education.collegeCourse} — ${draft.education.collegeName}`
}

