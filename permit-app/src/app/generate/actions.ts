'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { readFile, saveFile } from '@/lib/storage';
import { fillTownshipPdf, generatePacket, mergePdfs } from '@/lib/pdf';
import { missingRequirementsFor } from '@/lib/domain';
import { str, all } from '@/lib/form';

/**
 * The marquee action: "I need permits for Area 3 for these townships."
 * For every active employee in the area × every selected township, fill the real
 * township PDF (or a generated packet), then merge everything into one print-ready
 * batch and record each application.
 */
export async function generatePermits(formData: FormData) {
  const areaId = str(formData, 'areaId');
  const townshipIds = all(formData, 'townshipIds');
  if (!areaId || townshipIds.length === 0) return;

  const [company, area, employees, townships] = await Promise.all([
    prisma.company.findFirst(),
    prisma.areaGroup.findUnique({ where: { id: areaId } }),
    prisma.employee.findMany({ where: { areaGroupId: areaId, active: true }, orderBy: { lastName: 'asc' } }),
    prisma.township.findMany({ where: { id: { in: townshipIds } }, orderBy: { name: 'asc' } }),
  ]);

  if (!area || employees.length === 0 || townships.length === 0) return;

  const now = new Date();
  const pdfs: Uint8Array[] = [];
  type AppRow = {
    townshipId: string; employeeId: string; generatedPdfPath: string;
    missingRequirements: string; expiresAt: Date | null;
  };
  const appRows: AppRow[] = [];

  for (const township of townships) {
    let template: Buffer | null = null;
    if (township.permitPdfPath) {
      try { template = await readFile(township.permitPdfPath); } catch { template = null; }
    }
    const mappings: Record<string, string> = safeJson(township.fieldMappings, {});

    for (const employee of employees) {
      let bytes: Uint8Array;
      if (template) {
        bytes = await fillTownshipPdf(new Uint8Array(template), mappings, { company, employee, township, today: now });
      } else {
        bytes = await generatePacket(company, employee, township);
      }
      pdfs.push(bytes);

      const key = await saveFile('permits', '.pdf', Buffer.from(bytes));
      const missing = missingRequirementsFor(township, employee);
      const expiresAt = township.permitDurationDays
        ? new Date(now.getTime() + township.permitDurationDays * 86400000)
        : null;
      appRows.push({
        townshipId: township.id,
        employeeId: employee.id,
        generatedPdfPath: key,
        missingRequirements: JSON.stringify(missing),
        expiresAt,
      });
    }
  }

  const combined = await mergePdfs(pdfs);
  const combinedKey = await saveFile('batches', '.pdf', Buffer.from(combined));

  const twpLabel = townships.length === 1 ? townships[0].name : `${townships.length} townships`;
  const label = `${area.name} · ${twpLabel} · ${appRows.length} permits`;

  const batch = await prisma.permitBatch.create({
    data: {
      label,
      areaGroupId: area.id,
      combinedPdfPath: combinedKey,
      applicationCount: appRows.length,
      applications: {
        create: appRows.map((r) => ({
          townshipId: r.townshipId,
          employeeId: r.employeeId,
          generatedPdfPath: r.generatedPdfPath,
          missingRequirements: r.missingRequirements,
          expiresAt: r.expiresAt,
          status: 'generated',
        })),
      },
    },
  });

  revalidatePath('/batches');
  revalidatePath('/permits');
  revalidatePath('/');
  redirect(`/batches/${batch.id}`);
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
