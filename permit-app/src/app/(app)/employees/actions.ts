'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { saveFile, deleteFile } from '@/lib/storage';
import { str, bool, date } from '@/lib/form';

function statusFromDate(status: string): string {
  return ['missing', 'pending', 'complete'].includes(status) ? status : 'missing';
}

export async function saveEmployee(formData: FormData) {
  const id = str(formData, 'id');
  const data = {
    firstName: str(formData, 'firstName') ?? '',
    lastName: str(formData, 'lastName') ?? '',
    email: str(formData, 'email'),
    phone: str(formData, 'phone'),
    address: str(formData, 'address'),
    city: str(formData, 'city'),
    state: str(formData, 'state'),
    zip: str(formData, 'zip'),
    dob: date(formData, 'dob'),
    driverLicense: str(formData, 'driverLicense'),
    driverLicenseState: str(formData, 'driverLicenseState'),
    ssnLast4: str(formData, 'ssnLast4'),
    vehicleMakeModel: str(formData, 'vehicleMakeModel'),
    vehicleColor: str(formData, 'vehicleColor'),
    vehiclePlate: str(formData, 'vehiclePlate'),
    photoStatus: statusFromDate(str(formData, 'photoStatus') ?? 'missing'),
    backgroundCheckStatus: statusFromDate(str(formData, 'backgroundCheckStatus') ?? 'missing'),
    fingerprintStatus: statusFromDate(str(formData, 'fingerprintStatus') ?? 'missing'),
    active: bool(formData, 'active'),
    notes: str(formData, 'notes'),
    areaGroupId: str(formData, 'areaGroupId'),
  };

  if (!data.firstName || !data.lastName) return;

  // Optional 2x2 photo upload
  const photo = formData.get('photo');
  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.name.split('.').pop() || 'jpg';
    photoPath = await saveFile('photos', `.${ext}`, Buffer.from(await photo.arrayBuffer()));
  }

  if (id) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (photoPath && existing?.photoPath) await deleteFile(existing.photoPath);
    await prisma.employee.update({
      where: { id },
      data: {
        ...data,
        ...(photoPath ? { photoPath, photoStatus: 'complete' } : {}),
      },
    });
  } else {
    await prisma.employee.create({
      data: { ...data, ...(photoPath ? { photoPath, photoStatus: 'complete' } : {}) },
    });
  }
  revalidatePath('/employees');
  revalidatePath('/');
}

export async function deleteEmployee(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) return;
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (emp?.photoPath) await deleteFile(emp.photoPath);
  await prisma.employee.delete({ where: { id } });
  revalidatePath('/employees');
  revalidatePath('/');
}
