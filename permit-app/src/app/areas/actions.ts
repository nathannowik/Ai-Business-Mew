'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { str } from '@/lib/form';

export async function saveArea(formData: FormData) {
  const id = str(formData, 'id');
  const name = str(formData, 'name');
  if (!name) return;
  const data = {
    name,
    description: str(formData, 'description'),
    color: str(formData, 'color') ?? '#2563eb',
  };
  if (id) await prisma.areaGroup.update({ where: { id }, data });
  else await prisma.areaGroup.create({ data });
  revalidatePath('/areas');
  revalidatePath('/');
}

export async function deleteArea(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  // Employees/townships keep their records; their areaGroupId is set null by the schema.
  await prisma.areaGroup.delete({ where: { id } });
  revalidatePath('/areas');
  revalidatePath('/');
}
