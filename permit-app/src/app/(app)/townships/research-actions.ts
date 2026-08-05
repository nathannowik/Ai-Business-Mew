'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { researchTownship, researchEnabled, type ResearchResult } from '@/lib/research';
import { geocode } from '@/lib/geocode';
import { detectPdfFields } from '@/lib/pdf';
import { saveFile } from '@/lib/storage';
import { guessToken } from '@/lib/domain';
import { logActivity } from '@/lib/activity';
import { str } from '@/lib/form';

/**
 * "I need a permit for Gloucester Township" — research the township's requirements with
 * Claude + web search, create it as a draft for review, and attach the permit PDF if found.
 */
export async function researchAndAddTownship(formData: FormData) {
  const name = str(formData, 'name');
  if (!name) redirect('/townships');
  if (!researchEnabled()) redirect('/townships?research=nokey');

  const state = str(formData, 'state');
  const county = str(formData, 'county');
  const areaGroupId = str(formData, 'areaGroupId');

  let result: ResearchResult;
  try {
    result = await researchTownship({ name, state, county });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Research failed.';
    redirect(`/townships?research=error&msg=${encodeURIComponent(msg)}`);
  }

  // Geocode for the map (best-effort).
  const geo = await geocode({ name: result.name, county: result.county, state: result.state });

  const notesParts = [
    `Auto-researched with AI (confidence: ${result.confidence}). Please verify before filing.`,
    result.summary && `Summary: ${result.summary}`,
    result.sourceUrls.length ? `Sources:\n${result.sourceUrls.map((u) => `• ${u}`).join('\n')}` : '',
  ].filter(Boolean);

  const created = await prisma.township.create({
    data: {
      name: result.name,
      state: result.state,
      county: result.county,
      areaGroupId: areaGroupId ?? null,
      clerkOfficeName: result.clerkOfficeName,
      clerkName: result.clerkName,
      clerkEmail: result.clerkEmail,
      clerkPhone: result.clerkPhone,
      officeAddress: result.officeAddress,
      officeCity: result.officeCity,
      officeZip: result.officeZip,
      website: result.website,
      permitFee: result.permitFee,
      processingDays: result.processingDays,
      permitDurationDays: result.permitDurationDays,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      reqFee: result.reqFee,
      reqFingerprints: result.reqFingerprints,
      reqBackgroundCheck: result.reqBackgroundCheck,
      reqPhoto2x2: result.reqPhoto2x2,
      reqInsurance: result.reqInsurance,
      reqBond: result.reqBond,
      reqDriverLicense: result.reqDriverLicense,
      reqVehicleInfo: result.reqVehicleInfo,
      reqInPerson: result.reqInPerson,
      reqNotarized: result.reqNotarized,
      extraRequirements: JSON.stringify(result.extraRequirements),
      status: 'needs_info',
      notes: notesParts.join('\n\n'),
    },
  });

  // Best-effort: download the permit PDF the model found and attach it with detected fields.
  if (result.permitPdfUrl) {
    try {
      const bytes = await fetchPdf(result.permitPdfUrl);
      if (bytes) {
        const fields = await detectPdfFields(bytes);
        const key = await saveFile('townships', '.pdf', Buffer.from(bytes));
        const mapping: Record<string, string> = {};
        for (const f of fields) mapping[f] = guessToken(f);
        await prisma.township.update({
          where: { id: created.id },
          data: { permitPdfPath: key, permitPdfFields: JSON.stringify(fields), fieldMappings: JSON.stringify(mapping) },
        });
      }
    } catch {
      /* leave the township without a PDF; the user can upload it */
    }
  }

  await logActivity({ action: 'township.researched', entity: 'township', entityId: created.id, detail: `${result.name} (confidence ${result.confidence})` });
  revalidatePath('/townships');
  revalidatePath('/map');
  revalidatePath('/');
  redirect(`/townships/${created.id}?researched=1`);
}

/** Fetch a PDF from a URL with basic guards (type + size). Returns null on any problem. */
async function fetchPdf(url: string): Promise<Uint8Array | null> {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'PermitPilot/1.0' } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    const buf = new Uint8Array(await res.arrayBuffer());
    // Accept only if it looks like a PDF (header or content-type) and is under 20MB.
    const looksPdf = type.includes('pdf') || (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46); // %PDF
    if (!looksPdf || buf.byteLength > 20 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}
