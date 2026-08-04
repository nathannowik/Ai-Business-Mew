'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { saveFile, deleteFile } from '@/lib/storage';
import { str, bool, date } from '@/lib/form';
import { parseCsv, field, EMPLOYEE_COLUMNS } from '@/lib/csv';
import { logActivity } from '@/lib/activity';

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

/** Bulk-import employees from pasted CSV. Resolves/creates area groups by name. */
export async function importEmployeesCsv(formData: FormData) {
  const csv = str(formData, 'csv');
  if (!csv) redirect('/employees?imported=0&skipped=0');
  const { objects } = parseCsv(csv);

  // Area-name cache (SQLite has no case-insensitive query mode, so match in memory).
  const areas = await prisma.areaGroup.findMany();
  const areaByName = new Map(areas.map((a) => [a.name.trim().toLowerCase(), a.id]));

  let imported = 0;
  let skipped = 0;
  for (const row of objects) {
    const firstName = field(row, EMPLOYEE_COLUMNS.firstName);
    const lastName = field(row, EMPLOYEE_COLUMNS.lastName);
    if (!firstName || !lastName) { skipped++; continue; }

    const areaName = field(row, EMPLOYEE_COLUMNS.area);
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

    const dobStr = field(row, EMPLOYEE_COLUMNS.dob);
    const dob = dobStr ? new Date(dobStr) : null;
    const data = {
      firstName, lastName,
      email: field(row, EMPLOYEE_COLUMNS.email) || null,
      phone: field(row, EMPLOYEE_COLUMNS.phone) || null,
      address: field(row, EMPLOYEE_COLUMNS.address) || null,
      city: field(row, EMPLOYEE_COLUMNS.city) || null,
      state: field(row, EMPLOYEE_COLUMNS.state) || null,
      zip: field(row, EMPLOYEE_COLUMNS.zip) || null,
      dob: dob && !isNaN(dob.getTime()) ? dob : null,
      driverLicense: field(row, EMPLOYEE_COLUMNS.driverLicense) || null,
      driverLicenseState: field(row, EMPLOYEE_COLUMNS.driverLicenseState) || null,
      vehicleMakeModel: field(row, EMPLOYEE_COLUMNS.vehicleMakeModel) || null,
      vehiclePlate: field(row, EMPLOYEE_COLUMNS.vehiclePlate) || null,
      vehicleColor: field(row, EMPLOYEE_COLUMNS.vehicleColor) || null,
      areaGroupId,
    };

    // Update an existing person with the same name, else create.
    const existing = await prisma.employee.findFirst({ where: { firstName, lastName } });
    if (existing) await prisma.employee.update({ where: { id: existing.id }, data });
    else await prisma.employee.create({ data });
    imported++;
  }

  await logActivity({ action: 'employee.imported', entity: 'employee', detail: `${imported} imported${skipped ? `, ${skipped} skipped` : ''}` });
  revalidatePath('/employees');
  revalidatePath('/');
  redirect(`/employees?imported=${imported}&skipped=${skipped}`);
}
