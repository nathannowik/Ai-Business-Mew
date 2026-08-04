// Document category definitions. Kept in a plain module (not the 'use server' actions
// file, where every export must be an async function) so both client and server can use it.

export const DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: 'photo', label: '2×2 Photo' },
  { value: 'background_check', label: 'Background check' },
  { value: 'fingerprints', label: 'Fingerprint card' },
  { value: 'insurance', label: 'Insurance certificate' },
  { value: 'bond', label: 'Surety bond' },
  { value: 'drivers_license', label: "Driver's license" },
  { value: 'permit', label: 'Issued permit' },
  { value: 'application', label: 'Application form' },
  { value: 'other', label: 'Other' },
];
