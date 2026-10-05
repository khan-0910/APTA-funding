import type { EducationType } from '@/types'
import { todayISO } from './format'

export interface BasicInfoDraft {
  fullName: string
  age: string
  gender: '' | 'Male' | 'Female' | 'Other'
  doorNo: string
  street: string
  villageTown: string
  district: string
  state: string
  pinCode: string
  mobile: string
  aadhaar: string
  maritalStatus: string
}

export interface EducationDraft {
  educationType: EducationType
  schoolYear: string
  schoolName: string
  collegeYear: string
  collegeCourse: string
  collegeName: string
}

export interface FamilyDraft {
  fatherName: string
  fatherAge: string
  fatherOccupation: string
  fatherSalary: string
  motherName: string
  motherAge: string
  motherOccupation: string
  motherSalary: string
  siblingDetails: string
  pastSchool10thName: string
  pastSchool10thMarks: string
  pastSchool12thName: string
  pastSchool12thMarks: string
  collegeDetailsName: string
  collegeDetailsDegreeYear: string
  collegeDetailsPercentage: string
}

export interface DependentsDraft {
  totalMembers: string
  schoolGoingChildren: string
  elderlyDependents: string
  disabledMembers: string
  houseOwnership: '' | 'own' | 'rented' | 'other'
  monthlyRent: string
  landVehicleOwnership: '' | 'yes' | 'no'
}

export interface IncomeDraft {
  incomeSources: string
  totalMonthlyIncome: string
  govtBenefits: string
  govtBenefitAmount: string
}

export interface PurposeDraft {
  category: '' | 'education' | 'health_social' | 'business'
  subCategory: string
  amountRequired: string
  statement: string
}

export interface ReferenceDraft {
  name: string
  occupation: string
  mobile: string
  relationship: string
  address: string
}

export interface DeclarationDraft {
  undertakingAgreed: boolean
  place: string
  date: string
  signatureOrName: string
}

export interface ApplicationDraft {
  basicInfo: BasicInfoDraft
  education: EducationDraft
  family: FamilyDraft
  dependents: DependentsDraft
  income: IncomeDraft
  purpose: PurposeDraft
  references: [ReferenceDraft, ReferenceDraft]
  declaration: DeclarationDraft
}

export function emptyDraft(): ApplicationDraft {
  return {
    basicInfo: {
      fullName: '',
      age: '',
      gender: '',
      doorNo: '',
      street: '',
      villageTown: '',
      district: 'Salem',
      state: 'Tamil Nadu',
      pinCode: '',
      mobile: '+91 ',
      aadhaar: '',
      maritalStatus: '',
    },
    education: {
      educationType: 'college',
      schoolYear: '',
      schoolName: '',
      collegeYear: '',
      collegeCourse: '',
      collegeName: '',
    },
    family: {
      fatherName: '',
      fatherAge: '',
      fatherOccupation: '',
      fatherSalary: '',
      motherName: '',
      motherAge: '',
      motherOccupation: '',
      motherSalary: '',
      siblingDetails: '',
      pastSchool10thName: '',
      pastSchool10thMarks: '',
      pastSchool12thName: '',
      pastSchool12thMarks: '',
      collegeDetailsName: '',
      collegeDetailsDegreeYear: '',
      collegeDetailsPercentage: '',
    },
    dependents: {
      totalMembers: '',
      schoolGoingChildren: '',
      elderlyDependents: '',
      disabledMembers: '',
      houseOwnership: '',
      monthlyRent: '',
      landVehicleOwnership: '',
    },
    income: {
      incomeSources: '',
      totalMonthlyIncome: '',
      govtBenefits: '',
      govtBenefitAmount: '',
    },
    purpose: {
      category: '',
      subCategory: 'Tuition Fee (கல்விக் கட்டணம்)',
      amountRequired: '',
      statement: '',
    },
    references: [
      { name: '', occupation: '', mobile: '+91 ', relationship: '', address: '' },
      { name: '', occupation: '', mobile: '+91 ', relationship: '', address: '' },
    ],
    declaration: {
      undertakingAgreed: false,
      place: 'Salem',
      date: todayISO(),
      signatureOrName: '',
    },
  }
}
