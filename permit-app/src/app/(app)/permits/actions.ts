'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { readFile, saveFile, deleteFile } from '@/lib/storage';
import { fillTownshipPdf, generatePacket, mergePdfs } from '@/lib/pdf';
import { str, date, int } from '@/lib/form';

/** Inline quick status change from the list (dropdown). Fills sensible timestamps. */
export async function setApplicationStatus(formData: FormData) {
  const id = str(formData, 'id');
  const status = str(formData, 'status');
  if (!id || !status) return;
  const app = await prisma.permitApplication.findUnique({ where: { id }, include: { township: true } });
  if (!app) return;
  const now = new Date();
  const patch: Record<string, unknown> = { status };
  if (status === 'submitted' && !app.submittedAt) patch.submittedAt = now;
  if (status === 'approved') {
    if (!app.approvedAt) patch.approvedAt = now;
    // Default the expiry from the township's permit duration if we don't have one yet.
    if (!app.expiresAt && app.township.permitDurationDays) {
      patch.expiresAt = new Date(now.getTime() + app.township.permitDurationDays * 86400000);
    }
  }
  await prisma.permitApplication.update({ where: { id }, data: patch });
  revalidatePath('/permits');
  revalidatePath('/renewals');
  revalidatePath('/');
}

/** Full lifecycle edit from the permit detail page. */
export async function updateApplication(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const status = str(formData, 'status') ?? 'generated';
  const approvedAt = date(formData, 'approvedAt');
  const durationDays = int(formData, 'durationDays');
  let expiresAt = date(formData, 'expiresAt');
  // If a validity length was given instead of an explicit expiry, compute it.
  if (!expiresAt && durationDays && approvedAt) {
    expiresAt = new Date(approvedAt.getTime() + durationDays * 86400000);
  }
  await prisma.permitApplication.update({
    where: { id },
    data: {
      status,
      permitNumber: str(formData, 'permitNumber'),
      submittedAt: date(formData, 'submittedAt'),
      approvedAt,
      expiresAt,
      deniedReason: status === 'denied' ? str(formData, 'deniedReason') : null,
      notes: str(formData, 'notes'),
    },
  });
  revalidatePath('/permits');
  revalidatePath(`/permits/${id}`);
  revalidatePath('/renewals');
  revalidatePath('/');
}

export async function deleteApplication(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const app = await prisma.permitApplication.findUnique({ where: { id } });
  if (app?.generatedPdfPath) await deleteFile(app.generatedPdfPath);
  await prisma.permitApplication.delete({ where: { id } });
  revalidatePath('/permits');
  revalidatePath('/renewals');
  revalidatePath('/');
  const from = str(formData, 'redirectTo');
  if (from) redirect(from);
}

/**
 * Re-generate a single permit (e.g. to renew an expiring one): fills a fresh form for
 * the same employee + township and creates a new application in its own print batch.
 */
export async function regenerateApplication(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const source = await prisma.permitApplication.findUnique({
    where: { id },
    include: { township: true, employee: true },
  });
  if (!source) return;
  const company = await prisma.company.findFirst();
  const { township, employee } = source;

  let bytes: Uint8Array;
  if (township.permitPdfPath) {
    try {
      const template = await readFile(township.permitPdfPath);
      const mappings: Record<string, string> = JSON.parse(township.fieldMappings || '{}');
      bytes = await fillTownshipPdf(new Uint8Array(template), mappings, { company, employee, township, today: new Date() });
    } catch {
      bytes = await generatePacket(company, employee, township);
    }
  } else {
    bytes = await generatePacket(company, employee, township);
  }

  const pdfKey = await saveFile('permits', '.pdf', Buffer.from(bytes));
  const combined = await mergePdfs([bytes]);
  const combinedKey = await saveFile('batches', '.pdf', Buffer.from(combined));

  const batch = await prisma.permitBatch.create({
    data: {
      label: `Renewal · ${township.name} · ${employee.firstName} ${employee.lastName}`,
      areaGroupId: township.areaGroupId,
      combinedPdfPath: combinedKey,
      applicationCount: 1,
      applications: {
        create: [{
          townshipId: township.id,
          employeeId: employee.id,
          generatedPdfPath: pdfKey,
          missingRequirements: source.missingRequirements,
          status: 'generated',
        }],
      },
    },
  });

  revalidatePath('/permits');
  revalidatePath('/renewals');
  revalidatePath('/batches');
  revalidatePath('/');
  redirect(`/batches/${batch.id}`);
}
