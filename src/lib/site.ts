/**
 * Organisation details shown on the Contact, Privacy and Terms pages and in footers.
 * Fill in the empty values; anything left empty is hidden rather than shown blank.
 */
export const SITE = {
  name: 'APTA Empowers',
  /** Registered name of the trust/society, e.g. "APTA Educational and Charitable Trust". */
  legalName: '',
  /** Registration number of the trust/society (optional). */
  registrationNo: '',
  email: '',
  phone: '',
  /** WhatsApp number in international format without +, e.g. 919876543210 (optional). */
  whatsapp: '',
  address: '',
  officeHours: '',
  /** Person who handles privacy requests and complaints (DPDP Act 2023, Grievance Officer). */
  grievanceOfficer: { name: '', email: '' },
  /** Where the Supabase project stores data, e.g. "Mumbai, India (AWS ap-south-1)". */
  dataRegion: '',
  city: 'Salem, Tamil Nadu',
}

/** Bump when the Privacy Policy or Terms change materially; stored with each sign-up's consent. */
export const POLICY_VERSION = '2026-11-07'
export const POLICY_UPDATED = '7 November 2026'
