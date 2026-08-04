'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireManager } from '@/lib/session';
import { str } from '@/lib/form';

export async function saveCompany(formData: FormData) {
  await requireManager();
  const id = str(formData, 'id');
  const data = {
    name: str(formData, 'name') ?? 'My Company',
    legalName: str(formData, 'legalName'),
    address: str(formData, 'address'),
    city: str(formData, 'city'),
    state: str(formData, 'state'),
    zip: str(formData, 'zip'),
    phone: str(formData, 'phone'),
    email: str(formData, 'email'),
    website: str(formData, 'website'),
    ein: str(formData, 'ein'),
    contactName: str(formData, 'contactName'),
    contactTitle: str(formData, 'contactTitle'),
    insuranceCarrier: str(formData, 'insuranceCarrier'),
    insurancePolicyNum: str(formData, 'insurancePolicyNum'),
    bondNumber: str(formData, 'bondNumber'),
    natureOfBusiness: str(formData, 'natureOfBusiness'),
    notes: str(formData, 'notes'),
  };
  if (id) await prisma.company.update({ where: { id }, data });
  else await prisma.company.create({ data });
  revalidatePath('/company');
  revalidatePath('/');
}
