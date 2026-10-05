export type UserRole = 'student' | 'staff' | 'admin'
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
export type BeneficiaryStatus = 'active' | 'completed' | 'suspended'
export type EducationType = 'school' | 'college'
export type CareerStatus =
  | 'already_employed'
  | 'seeking_job'
  | 'higher_studies'
  | 'preparing_govt_exams'
  | 'entrepreneurship'

export interface CareerTransitionSurvey {
  status: CareerStatus
  companyName?: string
  jobTitle?: string
  workLocation?: string
  monthlySalary?: number
  offerLetterFileName?: string
  preferredRoles?: string
  preferredLocations?: string
  expectedSalary?: number
  resumeFileName?: string
  connectWithMentors?: boolean
  higherStudiesProgram?: string
  notes?: string
  submittedAt: string
}

export interface AttachedDocument {
  id: string
  name: string
  type: string
  size: number
  category: string
  dataUrl?: string
  uploadedAt: string
}

export interface FamilyProfileSalem {
  formDate?: string
  fatherName?: string
  fatherAge?: string
  fatherOccupation?: string
  fatherSalary?: number
  motherName?: string
  motherAge?: string
  motherOccupation?: string
  motherSalary?: number
  siblingDetails?: string
  presentEducation?: string
  educationType?: EducationType
  schoolYear?: string
  schoolName?: string
  collegeYear?: string
  collegeCourse?: string
  collegeName?: string
  academicYearSpan?: string
  expectedGraduationYear?: string
  pastSchool10th?: { schoolName: string; marksOrPercentage: string }
  pastSchool12th?: { schoolName: string; marksOrPercentage: string }
  collegeDetails?: { collegeName: string; degreeAndYear: string; percentage: string }
  area?: string
  remarks?: string
}

export interface Application {
  id: string
  studentId: string
  studentName: string
  category: 'education' | 'health_social' | 'business'
  educationLevel?: 'schooling' | 'undergraduate' | 'postgraduate'
  program: string
  status: ApplicationStatus
  submittedAt: string | null
  fundingRequested: number
  statementOfNeed: string
  basicInfo?: Record<string, unknown>
  familyProfile?: FamilyProfileSalem
  purposeOfAssistance?: Record<string, unknown>
  supportingDocuments?: { checklist: string[]; attachments: AttachedDocument[] }
  declaration?: {
    undertakingAgreed: boolean
    place: string
    date: string
    signatureOrName: string
  }
  officeUseOnly?: {
    verifiedBy: string
    verificationDate: string
    fieldNotes: string
    sanctionedAmount: number
    approvedBy: string
  }
  careerSurvey?: CareerTransitionSurvey
}

export interface Beneficiary {
  id: string
  name: string
  category: 'education' | 'health_social' | 'business'
  educationLevel?: 'schooling' | 'undergraduate' | 'postgraduate'
  fundingReceived: number
  program: string
  status: BeneficiaryStatus
  enrolledSince: string
  expectedGraduation: string
  currentGpa: number
  careerSurvey?: CareerTransitionSurvey
}

export type PartnerRelationship = 'corporate_csr' | 'ngo' | 'individual_donor' | 'foundation'
export type TransactionDirection = 'inflow' | 'outflow'
export type ReportReviewStatus = 'pending' | 'reviewed' | 'action_required'

export interface Partner {
  id: string
  orgName: string
  contactName: string
  contactEmail: string
  relationshipStatus: PartnerRelationship
  totalContributed: number
  lastContactedAt: string
}

export interface Transaction {
  id: string
  date: string
  amount: number
  direction: TransactionDirection
  category: 'education' | 'health_social' | 'business' | 'operations' | 'donation'
  description: string
  reconciled: boolean
  relatedPartnerId?: string
}

export interface ProgressReport {
  id: string
  studentId: string
  studentName: string
  semester: string
  status: ReportReviewStatus
  gpa: number
  narrative: string
  submittedAt: string
  reviewNotes?: string
}

export interface UserAccount {
  id: string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  status: 'active' | 'disabled'
  loginCount: number
  createdAt: string
  lastLoginAt: string | null
}

export type LoginAction = 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCOUNT_CREATED' | 'LOGOUT'

export interface LoginLog {
  id: string
  userId: string | null
  userEmail: string
  role: UserRole | 'unknown'
  action: LoginAction
  ipAddress: string
  userAgent: string
  status: 'success' | 'failure' | 'info'
  timestamp: string
}

export interface DatabaseSnapshot {
  accounts: UserAccount[]
  loginLogs: LoginLog[]
  applications: Application[]
  beneficiaries: Beneficiary[]
  transactions: Transaction[]
  partners: Partner[]
  progressReports: ProgressReport[]
}
