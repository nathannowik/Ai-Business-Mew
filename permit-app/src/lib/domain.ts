// Central domain definitions shared across the app: township requirements, the data
// tokens available for PDF field mapping, and helpers to resolve them.

import type { Company, Employee, Township, PermitApplication } from '@prisma/client';

// ---------------------------------------------------------------------------
// Township requirement flags
// ---------------------------------------------------------------------------
// `employeeStatusField` links a township requirement to the per-employee compliance
// field that satisfies it, so we can flag which employees are missing what.
export type RequirementDef = {
  key: string; // matches the boolean column on Township (e.g. "reqFingerprints")
  label: string;
  short: string;
  employeeStatusField?: 'photoStatus' | 'backgroundCheckStatus' | 'fingerprintStatus';
};

export const REQUIREMENTS: RequirementDef[] = [
  { key: 'reqFee', label: 'Permit fee due', short: 'Fee' },
  { key: 'reqFingerprints', label: 'Fingerprints required', short: 'Fingerprints', employeeStatusField: 'fingerprintStatus' },
  { key: 'reqBackgroundCheck', label: 'Background check required', short: 'Background check', employeeStatusField: 'backgroundCheckStatus' },
  { key: 'reqPhoto2x2', label: '2×2" photo required', short: '2×2 photo', employeeStatusField: 'photoStatus' },
  { key: 'reqInsurance', label: 'Proof of insurance', short: 'Insurance' },
  { key: 'reqBond', label: 'Surety bond', short: 'Bond' },
  { key: 'reqDriverLicense', label: "Driver's license copy", short: "Driver's license" },
  { key: 'reqVehicleInfo', label: 'Vehicle information', short: 'Vehicle info' },
  { key: 'reqInPerson', label: 'Must apply in person', short: 'In person' },
  { key: 'reqNotarized', label: 'Notarized signature', short: 'Notarized' },
];

/** Requirements a township has turned on. */
export function activeRequirements(t: Township): RequirementDef[] {
  return REQUIREMENTS.filter((r) => (t as unknown as Record<string, boolean>)[r.key]);
}

/**
 * For a given township + employee, return the requirement labels the employee has not
 * yet satisfied (only for requirements tied to a per-employee compliance field).
 */
export function missingRequirementsFor(township: Township, employee: Employee): string[] {
  const missing: string[] = [];
  for (const req of activeRequirements(township)) {
    if (!req.employeeStatusField) continue;
    const status = (employee as unknown as Record<string, string>)[req.employeeStatusField];
    if (status !== 'complete') missing.push(req.short);
  }
  return missing;
}

export function parseExtraRequirements(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Data tokens for PDF field mapping
// ---------------------------------------------------------------------------
// A township's uploaded PDF has named AcroForm fields. The user maps each field to one
// of these tokens; at generation time we resolve the token against the company/employee/
// township records to fill the field.
export type DataToken = { token: string; label: string; group: 'Employee' | 'Company' | 'Township' | 'Other' };

export const DATA_TOKENS: DataToken[] = [
  { token: 'employee.fullName', label: 'Employee — Full name', group: 'Employee' },
  { token: 'employee.firstName', label: 'Employee — First name', group: 'Employee' },
  { token: 'employee.lastName', label: 'Employee — Last name', group: 'Employee' },
  { token: 'employee.email', label: 'Employee — Email', group: 'Employee' },
  { token: 'employee.phone', label: 'Employee — Phone', group: 'Employee' },
  { token: 'employee.address', label: 'Employee — Street address', group: 'Employee' },
  { token: 'employee.cityStateZip', label: 'Employee — City, State ZIP', group: 'Employee' },
  { token: 'employee.city', label: 'Employee — City', group: 'Employee' },
  { token: 'employee.state', label: 'Employee — State', group: 'Employee' },
  { token: 'employee.zip', label: 'Employee — ZIP', group: 'Employee' },
  { token: 'employee.dob', label: 'Employee — Date of birth', group: 'Employee' },
  { token: 'employee.driverLicense', label: "Employee — Driver's license #", group: 'Employee' },
  { token: 'employee.driverLicenseState', label: "Employee — Driver's license state", group: 'Employee' },
  { token: 'employee.ssnLast4', label: 'Employee — SSN (last 4)', group: 'Employee' },
  { token: 'employee.vehicle', label: 'Employee — Vehicle (make/model/color)', group: 'Employee' },
  { token: 'employee.vehiclePlate', label: 'Employee — Vehicle plate', group: 'Employee' },

  { token: 'company.name', label: 'Company — Name', group: 'Company' },
  { token: 'company.legalName', label: 'Company — Legal name', group: 'Company' },
  { token: 'company.address', label: 'Company — Street address', group: 'Company' },
  { token: 'company.cityStateZip', label: 'Company — City, State ZIP', group: 'Company' },
  { token: 'company.phone', label: 'Company — Phone', group: 'Company' },
  { token: 'company.email', label: 'Company — Email', group: 'Company' },
  { token: 'company.website', label: 'Company — Website', group: 'Company' },
  { token: 'company.ein', label: 'Company — EIN', group: 'Company' },
  { token: 'company.contactName', label: 'Company — Contact name', group: 'Company' },
  { token: 'company.natureOfBusiness', label: 'Company — Nature of business', group: 'Company' },
  { token: 'company.insuranceCarrier', label: 'Company — Insurance carrier', group: 'Company' },
  { token: 'company.insurancePolicyNum', label: 'Company — Insurance policy #', group: 'Company' },
  { token: 'company.bondNumber', label: 'Company — Bond number', group: 'Company' },

  { token: 'township.name', label: 'Township — Name', group: 'Township' },
  { token: 'township.county', label: 'Township — County', group: 'Township' },
  { token: 'township.state', label: 'Township — State', group: 'Township' },
  { token: 'township.permitFee', label: 'Township — Permit fee', group: 'Township' },

  { token: 'date.today', label: 'Other — Today’s date', group: 'Other' },
  { token: 'date.year', label: 'Other — Current year', group: 'Other' },
];

function fmtDate(d?: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => p && p.trim()).join(' ').trim();
}

function cityStateZip(city?: string | null, state?: string | null, zip?: string | null): string {
  const left = [city, state].filter((p) => p && p.trim()).join(', ');
  return joinParts(left, zip || undefined);
}

export type ResolveContext = {
  company: Company | null;
  employee: Employee;
  township: Township;
  today?: Date;
};

/** Resolve a mapping token to the string that should be written into a PDF field. */
export function resolveToken(token: string, ctx: ResolveContext): string {
  const { company, employee, township } = ctx;
  const today = ctx.today ?? new Date();
  switch (token) {
    // Employee
    case 'employee.fullName': return joinParts(employee.firstName, employee.lastName);
    case 'employee.firstName': return employee.firstName ?? '';
    case 'employee.lastName': return employee.lastName ?? '';
    case 'employee.email': return employee.email ?? '';
    case 'employee.phone': return employee.phone ?? '';
    case 'employee.address': return employee.address ?? '';
    case 'employee.cityStateZip': return cityStateZip(employee.city, employee.state, employee.zip);
    case 'employee.city': return employee.city ?? '';
    case 'employee.state': return employee.state ?? '';
    case 'employee.zip': return employee.zip ?? '';
    case 'employee.dob': return fmtDate(employee.dob);
    case 'employee.driverLicense': return employee.driverLicense ?? '';
    case 'employee.driverLicenseState': return employee.driverLicenseState ?? '';
    case 'employee.ssnLast4': return employee.ssnLast4 ? `XXX-XX-${employee.ssnLast4}` : '';
    case 'employee.vehicle': return joinParts(employee.vehicleColor, employee.vehicleMakeModel);
    case 'employee.vehiclePlate': return employee.vehiclePlate ?? '';
    // Company
    case 'company.name': return company?.name ?? '';
    case 'company.legalName': return company?.legalName ?? company?.name ?? '';
    case 'company.address': return company?.address ?? '';
    case 'company.cityStateZip': return cityStateZip(company?.city, company?.state, company?.zip);
    case 'company.phone': return company?.phone ?? '';
    case 'company.email': return company?.email ?? '';
    case 'company.website': return company?.website ?? '';
    case 'company.ein': return company?.ein ?? '';
    case 'company.contactName': return company?.contactName ?? '';
    case 'company.natureOfBusiness': return company?.natureOfBusiness ?? '';
    case 'company.insuranceCarrier': return company?.insuranceCarrier ?? '';
    case 'company.insurancePolicyNum': return company?.insurancePolicyNum ?? '';
    case 'company.bondNumber': return company?.bondNumber ?? '';
    // Township
    case 'township.name': return township.name ?? '';
    case 'township.county': return township.county ?? '';
    case 'township.state': return township.state ?? '';
    case 'township.permitFee': return township.permitFee != null ? `$${township.permitFee.toFixed(2)}` : '';
    // Other
    case 'date.today': return fmtDate(today);
    case 'date.year': return String(today.getFullYear());
    default: return '';
  }
}

/** Best-guess a data token for a PDF field based on its name, to pre-fill the mapping UI. */
export function guessToken(fieldName: string): string {
  const f = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const has = (...s: string[]) => s.some((x) => f.includes(x));
  const isCompany = has('company', 'business', 'firm', 'employer', 'organization');
  if (has('firstname', 'fname', 'givenname')) return 'employee.firstName';
  if (has('lastname', 'lname', 'surname')) return 'employee.lastName';
  if (isCompany && has('name')) return 'company.name';
  if (isCompany && has('address', 'street')) return 'company.address';
  if (isCompany && has('phone')) return 'company.phone';
  if (has('applicantname', 'solicitorname', 'fullname')) return 'employee.fullName';
  if (has('email')) return 'employee.email';
  if (has('phone', 'telephone', 'cell', 'mobile')) return 'employee.phone';
  if (has('dob', 'dateofbirth', 'birthdate', 'birth')) return 'employee.dob';
  if (has('license', 'dlnumber', 'driverlic', 'dlnum')) return 'employee.driverLicense';
  if (has('vehicle', 'plate', 'car')) return 'employee.vehicle';
  if (has('street', 'address', 'residence')) return 'employee.address';
  if (has('city')) return 'employee.city';
  if (has('state')) return 'employee.state';
  if (has('zip', 'postal')) return 'employee.zip';
  if (has('citystatezip')) return 'employee.cityStateZip';
  if (isCompany) return 'company.name';
  if (has('township', 'municipality', 'jurisdiction')) return 'township.name';
  if (has('county')) return 'township.county';
  if (has('fee', 'amount')) return 'township.permitFee';
  if (has('date', 'today', 'signed')) return 'date.today';
  if (has('name', 'applicant', 'solicitor', 'canvasser')) return 'employee.fullName';
  return '';
}

// ---------------------------------------------------------------------------
// Status metadata (labels + colors) used by badges throughout the UI
// ---------------------------------------------------------------------------
export const COMPLIANCE_STATUS: Record<string, { label: string; tone: string }> = {
  missing: { label: 'Missing', tone: 'red' },
  pending: { label: 'Pending', tone: 'amber' },
  complete: { label: 'Complete', tone: 'green' },
};

export const APPLICATION_STATUS: Record<string, { label: string; tone: string }> = {
  generated: { label: 'Generated', tone: 'blue' },
  submitted: { label: 'Submitted', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  denied: { label: 'Denied', tone: 'red' },
  expired: { label: 'Expired', tone: 'gray' },
};

export const REQUEST_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: 'New', tone: 'blue' },
  researching: { label: 'Researching', tone: 'amber' },
  info_needed: { label: 'Info needed', tone: 'red' },
  ready: { label: 'Ready to add', tone: 'green' },
  added: { label: 'Added', tone: 'gray' },
  declined: { label: 'Declined', tone: 'gray' },
};

export const TOWNSHIP_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'green' },
  needs_info: { label: 'Needs info', tone: 'amber' },
  inactive: { label: 'Inactive', tone: 'gray' },
};

// ---------------------------------------------------------------------------
// Permit lifecycle
// ---------------------------------------------------------------------------
// The ordered stages a permit moves through, used for the timeline on the detail page.
export const LIFECYCLE_STAGES: { key: string; label: string; desc: string }[] = [
  { key: 'generated', label: 'Filled out', desc: 'Form auto-filled and added to a print batch' },
  { key: 'submitted', label: 'Submitted', desc: 'Turned in to the township clerk' },
  { key: 'approved', label: 'Approved', desc: 'Permit granted by the township' },
];

const DAY_MS = 86400000;

/** Whole days from now until a date (negative if in the past). */
export function daysUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/**
 * The status to actually show: an approved permit past its expiry reads as "expired"
 * even if the stored status hasn't been swept yet.
 */
export function effectiveStatus(app: Pick<PermitApplication, 'status' | 'expiresAt'>): string {
  if (app.status === 'approved' && app.expiresAt && new Date(app.expiresAt).getTime() < Date.now()) {
    return 'expired';
  }
  return app.status;
}

export type ExpiryInfo = {
  daysRemaining: number | null;
  expired: boolean;
  expiringSoon: boolean; // approved and within 30 days of expiry
  label: string | null;
};

export function expiryInfo(app: Pick<PermitApplication, 'status' | 'expiresAt'>, soonDays = 30): ExpiryInfo {
  if (!app.expiresAt) return { daysRemaining: null, expired: false, expiringSoon: false, label: null };
  const d = daysUntil(app.expiresAt);
  const expired = d !== null && d < 0;
  const expiringSoon = app.status === 'approved' && d !== null && d >= 0 && d <= soonDays;
  let label: string | null = null;
  if (d !== null) {
    if (expired) label = `Expired ${Math.abs(d)}d ago`;
    else if (d === 0) label = 'Expires today';
    else label = `${d}d left`;
  }
  return { daysRemaining: d, expired, expiringSoon, label };
}
