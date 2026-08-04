'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { saveFile, deleteFile } from '@/lib/storage';
import { detectPdfFields } from '@/lib/pdf';
import { guessToken, REQUIREMENTS } from '@/lib/domain';
import { str, bool, num, int } from '@/lib/form';
import { parseCsv, field, truthy, TOWNSHIP_COLUMNS } from '@/lib/csv';
import { logActivity } from '@/lib/activity';

function reqFlags(fd: FormData): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const r of REQUIREMENTS) out[r.key] = bool(fd, r.key);
  return out;
}

function extrasToJson(raw: string | null): string {
  if (!raw) return '[]';
  const items = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  return JSON.stringify(items);
}

export async function saveTownship(formData: FormData) {
  const id = str(formData, 'id');
  const name = str(formData, 'name');
  if (!name) return;
  const data = {
    name,
    state: str(formData, 'state'),
    county: str(formData, 'county'),
    areaGroupId: str(formData, 'areaGroupId'),
    clerkOfficeName: str(formData, 'clerkOfficeName'),
    clerkName: str(formData, 'clerkName'),
    clerkEmail: str(formData, 'clerkEmail'),
    clerkPhone: str(formData, 'clerkPhone'),
    officeAddress: str(formData, 'officeAddress'),
    officeCity: str(formData, 'officeCity'),
    officeZip: str(formData, 'officeZip'),
    website: str(formData, 'website'),
    permitFee: num(formData, 'permitFee'),
    processingDays: int(formData, 'processingDays'),
    permitDurationDays: int(formData, 'permitDurationDays'),
    renewalNotes: str(formData, 'renewalNotes'),
    extraRequirements: extrasToJson(str(formData, 'extraRequirements')),
    requirementsNotes: str(formData, 'requirementsNotes'),
    status: str(formData, 'status') ?? 'active',
    notes: str(formData, 'notes'),
    ...reqFlags(formData),
  };

  let townshipId = id ?? undefined;
  if (id) {
    await prisma.township.update({ where: { id }, data });
  } else {
    const created = await prisma.township.create({ data });
    townshipId = created.id;
  }
  revalidatePath('/townships');
  revalidatePath('/');
  return townshipId;
}

/** Bulk-import townships from pasted CSV. Resolves/creates area groups by name. */
export async function importTownshipsCsv(formData: FormData) {
  const csv = str(formData, 'csv');
  if (!csv) redirect('/townships?imported=0&skipped=0');
  const { objects } = parseCsv(csv);

  const areas = await prisma.areaGroup.findMany();
  const areaByName = new Map(areas.map((a) => [a.name.trim().toLowerCase(), a.id]));

  let imported = 0;
  let skipped = 0;
  for (const row of objects) {
    const name = field(row, TOWNSHIP_COLUMNS.name);
    if (!name) { skipped++; continue; }

    const areaName = field(row, TOWNSHIP_COLUMNS.area);
    let areaGroupId: string | null = null;
    if (areaName) {
      const key = areaName.trim().toLowerCase();
      areaGroupId = areaByName.get(key) ?? null;
      if (!areaGroupId) {
        const created = await prisma.areaGroup.create({ data: { name: areaName.trim() } });
        areaByName.set(key, created.id);
        areaGroupId = created.id;
      }
    }

    const feeStr = field(row, TOWNSHIP_COLUMNS.permitFee);
    const fee = feeStr ? Number(feeStr.replace(/[^0-9.]/g, '')) : null;
    const procStr = field(row, TOWNSHIP_COLUMNS.processingDays);
    const durStr = field(row, TOWNSHIP_COLUMNS.permitDurationDays);
    const state = field(row, TOWNSHIP_COLUMNS.state) || null;
    const county = field(row, TOWNSHIP_COLUMNS.county) || null;

    const data = {
      name, state, county, areaGroupId,
      clerkOfficeName: field(row, TOWNSHIP_COLUMNS.clerkOfficeName) || null,
      clerkName: field(row, TOWNSHIP_COLUMNS.clerkName) || null,
      clerkEmail: field(row, TOWNSHIP_COLUMNS.clerkEmail) || null,
      clerkPhone: field(row, TOWNSHIP_COLUMNS.clerkPhone) || null,
      officeAddress: field(row, TOWNSHIP_COLUMNS.officeAddress) || null,
      officeCity: field(row, TOWNSHIP_COLUMNS.officeCity) || null,
      officeZip: field(row, TOWNSHIP_COLUMNS.officeZip) || null,
      website: field(row, TOWNSHIP_COLUMNS.website) || null,
      permitFee: fee != null && Number.isFinite(fee) ? fee : null,
      processingDays: procStr ? parseInt(procStr, 10) || null : null,
      permitDurationDays: durStr ? parseInt(durStr, 10) || null : null,
      reqFee: truthy(field(row, TOWNSHIP_COLUMNS.reqFee)),
      reqFingerprints: truthy(field(row, TOWNSHIP_COLUMNS.reqFingerprints)),
      reqBackgroundCheck: truthy(field(row, TOWNSHIP_COLUMNS.reqBackgroundCheck)),
      reqPhoto2x2: truthy(field(row, TOWNSHIP_COLUMNS.reqPhoto2x2)),
      reqInsurance: truthy(field(row, TOWNSHIP_COLUMNS.reqInsurance)),
      reqBond: truthy(field(row, TOWNSHIP_COLUMNS.reqBond)),
      reqDriverLicense: truthy(field(row, TOWNSHIP_COLUMNS.reqDriverLicense)),
      reqVehicleInfo: truthy(field(row, TOWNSHIP_COLUMNS.reqVehicleInfo)),
      reqInPerson: truthy(field(row, TOWNSHIP_COLUMNS.reqInPerson)),
      reqNotarized: truthy(field(row, TOWNSHIP_COLUMNS.reqNotarized)),
    };

    const existing = await prisma.township.findFirst({ where: { name, state, county } });
    if (existing) await prisma.township.update({ where: { id: existing.id }, data });
    else await prisma.township.create({ data });
    imported++;
  }

  await logActivity({ action: 'township.imported', entity: 'township', detail: `${imported} imported${skipped ? `, ${skipped} skipped` : ''}` });
  revalidatePath('/townships');
  revalidatePath('/');
  redirect(`/townships?imported=${imported}&skipped=${skipped}`);
}

export async function deleteTownship(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const t = await prisma.township.findUnique({ where: { id } });
  if (t?.permitPdfPath) await deleteFile(t.permitPdfPath);
  await prisma.township.delete({ where: { id } });
  revalidatePath('/townships');
  revalidatePath('/');
}

/** Upload the official permit PDF, detect its fields, and pre-guess a mapping. */
export async function uploadTownshipPdf(formData: FormData) {
  const id = str(formData, 'townshipId');
  const file = formData.get('pdf');
  if (!id || !(file instanceof File) || file.size === 0) return;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fields = await detectPdfFields(bytes);
  const key = await saveFile('townships', '.pdf', Buffer.from(bytes));

  // Pre-fill a best-guess mapping so most fields are ready without manual work.
  const mapping: Record<string, string> = {};
  for (const f of fields) mapping[f] = guessToken(f);

  const existing = await prisma.township.findUnique({ where: { id } });
  if (existing?.permitPdfPath) await deleteFile(existing.permitPdfPath);

  await prisma.township.update({
    where: { id },
    data: {
      permitPdfPath: key,
      permitPdfFields: JSON.stringify(fields),
      fieldMappings: JSON.stringify(mapping),
    },
  });
  revalidatePath(`/townships/${id}`);
  revalidatePath('/townships');
}

export async function removeTownshipPdf(formData: FormData) {
  const id = str(formData, 'townshipId');
  if (!id) return;
  const t = await prisma.township.findUnique({ where: { id } });
  if (t?.permitPdfPath) await deleteFile(t.permitPdfPath);
  await prisma.township.update({
    where: { id },
    data: { permitPdfPath: null, permitPdfFields: '[]', fieldMappings: '{}' },
  });
  revalidatePath(`/townships/${id}`);
  revalidatePath('/townships');
}

/** Persist the field -> token mapping edited on the township detail page. */
export async function saveFieldMappings(formData: FormData) {
  const id = str(formData, 'townshipId');
  if (!id) return;
  const t = await prisma.township.findUnique({ where: { id } });
  if (!t) return;
  const fields: string[] = JSON.parse(t.permitPdfFields || '[]');
  const mapping: Record<string, string> = {};
  for (const f of fields) {
    const token = str(formData, `map__${f}`);
    mapping[f] = token ?? '';
  }
  await prisma.township.update({ where: { id }, data: { fieldMappings: JSON.stringify(mapping) } });
  revalidatePath(`/townships/${id}`);
}
