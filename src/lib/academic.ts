import type { EducationType } from '@/types'

export interface AcademicProjection {
  currentSessionLabel: string
  currentSessionLabelTa: string
  currentStartYear: number
  currentEndYear: number
  studyYearIndex: number
  totalProgramYears: number
  yearsRemaining: number
  yearsRemainingLabel: string
  expectedGraduation: string
  expectedGraduationTa: string
  isFinalYearOrBeyond: boolean
}

/**
 * Indian academic calendar: session runs July (year) → May (year+1).
 * Parses free-text year of study like "1st Year", "3rd Year", "10th Standard", "12th Std".
 */
export function computeAcademicProjection(input: {
  educationType: EducationType
  yearText: string
  today?: Date
}): AcademicProjection | null {
  const today = input.today ?? new Date()
  const parsed = parseStudyYear(input.yearText)
  if (!parsed) return null

  const isSchool = input.educationType === 'school'
  const isStandard = parsed.kind === 'standard'
  const totalProgramYears = isSchool && isStandard ? 12 : 4

  // Session start: if we're before July, current session began last year.
  const sessionStartYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1
  const sessionEndYear = sessionStartYear + 1

  const yearsIntoProgram = isSchool && isStandard ? parsed.value : parsed.value
  const yearsRemaining = Math.max(0, totalProgramYears - yearsIntoProgram)

  // Final session of the program: April/May of (sessionStartYear + yearsRemaining).
  const gradYear = sessionStartYear + yearsRemaining

  const yearsRemainingLabel =
    yearsRemaining === 0
      ? 'Final Year — completing this session'
      : yearsRemaining === 1
        ? '1 Academic Year Remaining'
        : `${yearsRemaining} Academic Years Remaining`

  return {
    currentSessionLabel: `July ${sessionStartYear} – May ${sessionEndYear}`,
    currentSessionLabelTa: `ஜூலை ${sessionStartYear} – மே ${sessionEndYear}`,
    currentStartYear: sessionStartYear,
    currentEndYear: sessionEndYear,
    studyYearIndex: yearsIntoProgram,
    totalProgramYears,
    yearsRemaining,
    yearsRemainingLabel,
    expectedGraduation: `April / May ${gradYear}`,
    expectedGraduationTa: `ஏப்ரல் / மே ${gradYear}`,
    isFinalYearOrBeyond: yearsRemaining <= 0,
  }
}

interface ParsedYear {
  kind: 'year' | 'standard'
  value: number
}

export function parseStudyYear(text: string): ParsedYear | null {
  const t = text.trim().toLowerCase()
  if (!t) return null

  // Tamil words for ordinal years.
  if (/முதலாம்|முதல் ஆண்டு/.test(t)) return { kind: 'year', value: 1 }
  if (/இரண்டாம்/.test(t)) return { kind: 'year', value: 2 }
  if (/மூன்றாம்/.test(t)) return { kind: 'year', value: 3 }
  if (/நான்காம்|இறுதி ஆண்டு|final/.test(t)) return { kind: 'year', value: 4 }

  // English ordinals: 1st / 2nd / 3rd / 4th year
  const yearMatch = t.match(/(\d+)\s*(?:st|nd|rd|th)?\s*(?:year|ஆண்டு)/)
  if (yearMatch) {
    const v = Number(yearMatch[1])
    if (v >= 1 && v <= 6) return { kind: 'year', value: v }
  }

  // Standards: 10th standard / 12th std / class 10
  const stdMatch = t.match(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:standard|std|வகுப்பு)?/)
  if (stdMatch) {
    const v = Number(stdMatch[1])
    if (v >= 1 && v <= 12) return { kind: 'standard', value: v }
  }

  return null
}
