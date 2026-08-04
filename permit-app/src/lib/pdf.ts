import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import type { Company, Employee, Township } from '@prisma/client';
import { activeRequirements, parseExtraRequirements, resolveToken, type ResolveContext } from './domain';

// ---------------------------------------------------------------------------
// Field detection
// ---------------------------------------------------------------------------
/** Read the AcroForm field names out of an uploaded township PDF. */
export async function detectPdfFields(bytes: Uint8Array): Promise<string[]> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();
    return form.getFields().map((f) => f.getName());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fill a real township PDF using the saved field -> token mapping
// ---------------------------------------------------------------------------
export async function fillTownshipPdf(
  templateBytes: Uint8Array,
  mappings: Record<string, string>,
  ctx: ResolveContext,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = doc.getForm();

  for (const [fieldName, token] of Object.entries(mappings)) {
    if (!token) continue;
    const value = resolveToken(token, ctx);
    try {
      const field = form.getField(fieldName);
      const type = field.constructor.name;
      if (type === 'PDFTextField') {
        form.getTextField(fieldName).setText(value);
      } else if (type === 'PDFCheckBox') {
        const truthy = ['yes', 'true', 'x', '1', 'checked'].includes(value.trim().toLowerCase());
        const cb = form.getCheckBox(fieldName);
        if (truthy) cb.check();
        else cb.uncheck();
      } else if (type === 'PDFDropdown') {
        try {
          form.getDropdown(fieldName).select(value);
        } catch {
          /* value not an option; skip */
        }
      } else {
        // Fallback: try as a text field.
        try {
          form.getTextField(fieldName).setText(value);
        } catch {
          /* unsupported field type; skip */
        }
      }
    } catch {
      // Field named in the mapping no longer exists in the PDF; skip gracefully.
    }
  }

  // Flatten so the values are baked in and the sheet is print-ready (non-editable).
  try {
    form.flatten();
  } catch {
    /* some PDFs can't be flattened; leave the filled form as-is */
  }
  return doc.save();
}

// ---------------------------------------------------------------------------
// Generated fallback packet (when a township has no uploaded PDF yet)
// ---------------------------------------------------------------------------
export async function generatePacket(
  company: Company | null,
  employee: Employee,
  township: Township,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]); // US Letter
  const w = new Writer(page, font, bold);

  w.title('SOLICITATION PERMIT APPLICATION');
  w.subtle(`${township.name}${township.county ? `, ${township.county} County` : ''}${township.state ? `, ${township.state}` : ''}`);
  w.gap(6);
  w.rule();

  w.section('Applicant (Solicitor)');
  w.kv('Name', `${employee.firstName} ${employee.lastName}`);
  w.kv('Address', line(employee.address, cityStateZip(employee.city, employee.state, employee.zip)));
  w.kv('Phone', employee.phone);
  w.kv('Email', employee.email);
  w.kv('Date of birth', fmtDate(employee.dob));
  w.kv("Driver's license", join(employee.driverLicense, employee.driverLicenseState && `(${employee.driverLicenseState})`));
  w.kv('Vehicle', join(employee.vehicleColor, employee.vehicleMakeModel, employee.vehiclePlate && `— plate ${employee.vehiclePlate}`));

  w.gap(4);
  w.section('Company');
  w.kv('Business name', company?.name);
  w.kv('Legal name', company?.legalName);
  w.kv('Address', line(company?.address, cityStateZip(company?.city, company?.state, company?.zip)));
  w.kv('Phone', company?.phone);
  w.kv('Email', company?.email);
  w.kv('Nature of business', company?.natureOfBusiness);
  w.kv('EIN', company?.ein);
  w.kv('Insurance', join(company?.insuranceCarrier, company?.insurancePolicyNum && `Policy ${company.insurancePolicyNum}`));
  w.kv('Bond #', company?.bondNumber);

  w.gap(4);
  w.section('Township requirements');
  const reqs = activeRequirements(township).map((r) => r.label);
  const extras = parseExtraRequirements(township.extraRequirements);
  const allReqs = [...reqs, ...extras];
  if (allReqs.length === 0) {
    w.body('No specific requirements recorded.');
  } else {
    for (const r of allReqs) w.checkline(r);
  }
  if (township.permitFee != null) w.kv('Permit fee', `$${township.permitFee.toFixed(2)}`);
  if (township.permitDurationDays) w.kv('Permit valid for', `${township.permitDurationDays} days`);

  w.gap(16);
  w.rule();
  w.gap(10);
  w.signature('Applicant signature', 'Date');
  w.footerNote(
    'This packet was generated as a standardized fallback. Upload the township’s official permit PDF to auto-fill the real form.',
  );

  return doc.save();
}

// ---------------------------------------------------------------------------
// Merge many PDFs into one print-ready batch
// ---------------------------------------------------------------------------
export async function mergePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of pdfs) {
    try {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    } catch {
      // Skip a corrupt/unreadable member rather than failing the whole batch.
    }
  }
  return out.save();
}

// ---------------------------------------------------------------------------
// Small text layout helper for the generated packet
// ---------------------------------------------------------------------------
const MARGIN = 54;
class Writer {
  private y: number;
  constructor(private page: PDFPage, private font: PDFFont, private bold: PDFFont) {
    this.y = page.getHeight() - MARGIN;
  }
  private width() {
    return this.page.getWidth() - MARGIN * 2;
  }
  gap(n: number) {
    this.y -= n;
  }
  title(text: string) {
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 16, font: this.bold, color: rgb(0.06, 0.09, 0.16) });
    this.y -= 20;
  }
  subtle(text: string) {
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 11, font: this.font, color: rgb(0.35, 0.4, 0.5) });
    this.y -= 14;
  }
  section(text: string) {
    this.y -= 6;
    this.page.drawText(text.toUpperCase(), { x: MARGIN, y: this.y, size: 9, font: this.bold, color: rgb(0.15, 0.39, 0.92) });
    this.y -= 14;
  }
  kv(key: string, value?: string | null) {
    const v = value && value.trim() ? value : '—';
    this.page.drawText(`${key}:`, { x: MARGIN, y: this.y, size: 10, font: this.bold, color: rgb(0.25, 0.3, 0.4) });
    this.wrapValue(v, MARGIN + 130);
  }
  body(text: string) {
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 10, font: this.font, color: rgb(0.2, 0.24, 0.32) });
    this.y -= 15;
  }
  checkline(text: string) {
    this.page.drawRectangle({ x: MARGIN, y: this.y - 1, width: 9, height: 9, borderColor: rgb(0.4, 0.45, 0.55), borderWidth: 1 });
    this.page.drawText(text, { x: MARGIN + 16, y: this.y, size: 10, font: this.font, color: rgb(0.2, 0.24, 0.32) });
    this.y -= 16;
  }
  private wrapValue(text: string, x: number) {
    const maxWidth = this.page.getWidth() - MARGIN - x;
    const words = text.split(/\s+/);
    let lineStr = '';
    const flush = () => {
      this.page.drawText(lineStr, { x, y: this.y, size: 10, font: this.font, color: rgb(0.1, 0.13, 0.2) });
      this.y -= 15;
    };
    for (const word of words) {
      const test = lineStr ? `${lineStr} ${word}` : word;
      if (this.font.widthOfTextAtSize(test, 10) > maxWidth && lineStr) {
        flush();
        lineStr = word;
      } else {
        lineStr = test;
      }
    }
    flush();
  }
  rule() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y + 4 },
      end: { x: this.page.getWidth() - MARGIN, y: this.y + 4 },
      thickness: 1,
      color: rgb(0.85, 0.87, 0.91),
    });
    this.y -= 6;
  }
  signature(leftLabel: string, rightLabel: string) {
    const lineY = this.y;
    const half = this.width() / 2;
    this.page.drawLine({ start: { x: MARGIN, y: lineY }, end: { x: MARGIN + half - 20, y: lineY }, thickness: 1, color: rgb(0.5, 0.55, 0.62) });
    this.page.drawLine({ start: { x: MARGIN + half + 20, y: lineY }, end: { x: this.page.getWidth() - MARGIN, y: lineY }, thickness: 1, color: rgb(0.5, 0.55, 0.62) });
    this.y -= 12;
    this.page.drawText(leftLabel, { x: MARGIN, y: this.y, size: 8, font: this.font, color: rgb(0.45, 0.5, 0.58) });
    this.page.drawText(rightLabel, { x: MARGIN + half + 20, y: this.y, size: 8, font: this.font, color: rgb(0.45, 0.5, 0.58) });
    this.y -= 20;
  }
  footerNote(text: string) {
    this.wrapAt(text, MARGIN, 40, 8, rgb(0.55, 0.6, 0.68));
  }
  private wrapAt(text: string, x: number, y: number, size: number, color: ReturnType<typeof rgb>) {
    const maxWidth = this.width();
    const words = text.split(/\s+/);
    let lineStr = '';
    let cy = y + 12;
    const flush = () => {
      this.page.drawText(lineStr, { x, y: cy, size, font: this.font, color });
      cy -= size + 3;
    };
    for (const word of words) {
      const test = lineStr ? `${lineStr} ${word}` : word;
      if (this.font.widthOfTextAtSize(test, size) > maxWidth && lineStr) {
        flush();
        lineStr = word;
      } else {
        lineStr = test;
      }
    }
    flush();
  }
}

// small string helpers local to packet generation
function fmtDate(d?: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function cityStateZip(city?: string | null, state?: string | null, zip?: string | null): string {
  const left = [city, state].filter((p) => p && p.trim()).join(', ');
  return [left, zip].filter((p) => p && p.trim()).join(' ').trim();
}
function line(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => p && p.trim()).join(', ');
}
function join(...parts: (string | null | undefined | false)[]): string {
  return parts.filter((p) => p && String(p).trim()).join(' ');
}
