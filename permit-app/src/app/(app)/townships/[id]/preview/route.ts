import { NextRequest } from 'next/server';
import type { Employee } from '@prisma/client';
import { prisma } from '@/lib/db';
import { readFile } from '@/lib/storage';
import { fillTownshipPdf, generatePacket } from '@/lib/pdf';

// Preview a township's permit — filled with a real (or sample) employee — so the field
// mapping can be verified before generating a real batch. Returns the PDF inline.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const employeeId = req.nextUrl.searchParams.get('employeeId');

  const [township, company] = await Promise.all([
    prisma.township.findUnique({ where: { id } }),
    prisma.company.findFirst(),
  ]);
  if (!township) return new Response('Township not found', { status: 404 });

  // Choose an employee to preview with: the requested one, else someone in this area,
  // else any active employee, else a synthetic sample so preview always works.
  let employee: Employee | null = null;
  if (employeeId) employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee && township.areaGroupId) {
    employee = await prisma.employee.findFirst({ where: { areaGroupId: township.areaGroupId, active: true }, orderBy: { lastName: 'asc' } });
  }
  if (!employee) employee = await prisma.employee.findFirst({ where: { active: true } });
  if (!employee) employee = SAMPLE_EMPLOYEE;

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

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="preview-${township.name.replace(/\s+/g, '-')}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}

const SAMPLE_EMPLOYEE: Employee = {
  id: 'sample', firstName: 'Sample', lastName: 'Applicant', email: 'sample@example.com', phone: '(555) 123-4567',
  address: '123 Main St', city: 'Anytown', state: 'MI', zip: '49000', dob: new Date('1990-01-01'),
  driverLicense: 'S123-4567-8901', driverLicenseState: 'MI', ssnLast4: '1234',
  vehicleMakeModel: 'Honda Civic', vehiclePlate: 'ABC-1234', vehicleColor: 'Blue',
  photoPath: null, photoStatus: 'complete', backgroundCheckStatus: 'complete', backgroundCheckDate: null,
  fingerprintStatus: 'complete', fingerprintDate: null, active: true, notes: null, areaGroupId: null,
  createdAt: new Date(), updatedAt: new Date(),
};
