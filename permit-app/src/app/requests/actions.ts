'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { str } from '@/lib/form';

export async function saveRequest(formData: FormData) {
  const id = str(formData, 'id');
  const townshipName = str(formData, 'townshipName');
  if (!townshipName) return;
  const data = {
    townshipName,
    state: str(formData, 'state'),
    county: str(formData, 'county'),
    areaGroupId: str(formData, 'areaGroupId'),
    requestedBy: str(formData, 'requestedBy'),
    priority: str(formData, 'priority') ?? 'normal',
    status: str(formData, 'status') ?? 'new',
    knownRequirements: str(formData, 'knownRequirements'),
    clerkContact: str(formData, 'clerkContact'),
    notes: str(formData, 'notes'),
  };
  if (id) await prisma.townshipRequest.update({ where: { id }, data });
  else await prisma.townshipRequest.create({ data });
  revalidatePath('/requests');
  revalidatePath('/');
}

export async function setRequestStatus(formData: FormData) {
  const id = str(formData, 'id');
  const status = str(formData, 'status');
  if (!id || !status) return;
  await prisma.townshipRequest.update({ where: { id }, data: { status } });
  revalidatePath('/requests');
  revalidatePath('/');
}

export async function deleteRequest(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  await prisma.townshipRequest.delete({ where: { id } });
  revalidatePath('/requests');
  revalidatePath('/');
}

/** Turn a ready request into a real Township record. */
export async function convertRequest(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const r = await prisma.townshipRequest.findUnique({ where: { id } });
  if (!r) return;
  const existing = await prisma.township.findFirst({ where: { name: r.townshipName, state: r.state, county: r.county } });
  const township = existing ?? (await prisma.township.create({
    data: {
      name: r.townshipName,
      state: r.state,
      county: r.county,
      areaGroupId: r.areaGroupId,
      clerkName: r.clerkContact,
      requirementsNotes: r.knownRequirements,
      notes: r.notes,
      status: 'needs_info',
    },
  }));
  await prisma.townshipRequest.update({ where: { id }, data: { status: 'added', resultingTownshipId: township.id } });
  revalidatePath('/requests');
  revalidatePath('/townships');
  revalidatePath('/');
}
