import { prisma } from '@/lib/db';
import { serializeCsv } from '@/lib/csv';

const d = (x: Date | null) => (x ? new Date(x).toISOString().slice(0, 10) : '');

export async function GET() {
  const employees = await prisma.employee.findMany({ include: { areaGroup: true }, orderBy: { lastName: 'asc' } });
  const header = ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip', 'DOB', 'Driver License', 'License State', 'Area', 'Active', '2x2 Photo', 'Background Check', 'Fingerprints'];
  const body = employees.map((e) => [
    e.firstName, e.lastName, e.email ?? '', e.phone ?? '', e.address ?? '', e.city ?? '', e.state ?? '', e.zip ?? '',
    d(e.dob), e.driverLicense ?? '', e.driverLicenseState ?? '', e.areaGroup?.name ?? '', e.active ? 'yes' : 'no',
    e.photoStatus, e.backgroundCheckStatus, e.fingerprintStatus,
  ]);
  const csv = serializeCsv([header, ...body]);
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="employees-${d(new Date())}.csv"` },
  });
}
