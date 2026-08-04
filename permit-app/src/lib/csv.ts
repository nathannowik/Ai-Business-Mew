// Tiny dependency-free CSV parser + header mapping. Shared by the client (live preview)
// and the server (actual import), so it must stay free of server-only imports.

export type ParsedCsv = {
  headers: string[];           // original header labels
  rows: string[][];            // raw cell values per row
  objects: Record<string, string>[]; // rows keyed by normalized header
};

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Parse CSV text, handling quoted fields, escaped quotes, and CRLF/CR/LF newlines. */
export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); records.push(row); field = ''; row = [];
    } else {
      field += c;
    }
  }
  // flush last field/row if the file didn't end with a newline
  if (field !== '' || row.length) { row.push(field); records.push(row); }

  // Drop trailing fully-empty rows
  const cleaned = records.filter((r) => r.some((c) => c.trim() !== ''));
  if (cleaned.length === 0) return { headers: [], rows: [], objects: [] };

  const headers = cleaned[0].map((h) => h.trim());
  const normHeaders = headers.map(normalizeHeader);
  const dataRows = cleaned.slice(1);
  const objects = dataRows.map((r) => {
    const obj: Record<string, string> = {};
    normHeaders.forEach((nh, idx) => { obj[nh] = (r[idx] ?? '').trim(); });
    return obj;
  });
  return { headers, rows: dataRows, objects };
}

/** Read the first matching alias from a normalized-header row object. */
export function field(obj: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const key = normalizeHeader(a);
    if (obj[key] != null && obj[key] !== '') return obj[key];
  }
  return '';
}

/** Serialize rows to CSV text, quoting/escaping cells as needed. */
export function serializeCsv(rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

const TRUTHY = new Set(['yes', 'y', 'true', 't', '1', 'x', 'required', 'req']);
export function truthy(v: string): boolean {
  return TRUTHY.has(v.trim().toLowerCase());
}

// Column aliases accepted on import.
export const EMPLOYEE_COLUMNS = {
  firstName: ['first name', 'first', 'firstname', 'given name'],
  lastName: ['last name', 'last', 'lastname', 'surname'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'phone number', 'cell', 'mobile'],
  address: ['address', 'street', 'street address'],
  city: ['city'],
  state: ['state'],
  zip: ['zip', 'zip code', 'postal', 'postal code'],
  dob: ['dob', 'date of birth', 'birthdate', 'birth date'],
  driverLicense: ["driver's license", 'drivers license', 'license', 'dl', 'dl number'],
  driverLicenseState: ['license state', 'dl state'],
  vehicleMakeModel: ['vehicle', 'vehicle make/model', 'make/model', 'car'],
  vehiclePlate: ['plate', 'license plate', 'vehicle plate'],
  vehicleColor: ['vehicle color', 'color'],
  area: ['area', 'area group', 'group', 'team'],
};

export const TOWNSHIP_COLUMNS = {
  name: ['name', 'township', 'township name', 'municipality'],
  county: ['county'],
  state: ['state'],
  area: ['area', 'area group', 'group', 'team'],
  clerkOfficeName: ['office', 'office name', 'clerk office'],
  clerkName: ['clerk', 'clerk name'],
  clerkEmail: ['clerk email', 'email'],
  clerkPhone: ['clerk phone', 'phone'],
  officeAddress: ['office address', 'address'],
  officeCity: ['office city'],
  officeZip: ['office zip', 'zip'],
  website: ['website', 'url'],
  permitFee: ['fee', 'permit fee'],
  processingDays: ['processing days', 'processing time'],
  permitDurationDays: ['duration', 'valid days', 'permit duration', 'valid for'],
  reqFee: ['fee required', 'requires fee'],
  reqFingerprints: ['fingerprints', 'fingerprinting', 'fingerprint'],
  reqBackgroundCheck: ['background check', 'background', 'bci'],
  reqPhoto2x2: ['photo', '2x2 photo', 'photos', 'photo required'],
  reqInsurance: ['insurance', 'proof of insurance'],
  reqBond: ['bond', 'surety bond'],
  reqDriverLicense: ['driver license', 'dl copy'],
  reqVehicleInfo: ['vehicle info', 'vehicle information'],
  reqInPerson: ['in person', 'apply in person'],
  reqNotarized: ['notarized', 'notary'],
};
