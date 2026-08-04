import { prisma } from '@/lib/db';
import { serializeCsv } from '@/lib/csv';

const d = (x: Date | null) => (x ? new Date(x).toISOString().slice(0, 10) : '');
const yn = (b: boolean) => (b ? 'yes' : 'no');

export async function GET() {
  const townships = await prisma.township.findMany({ include: { areaGroup: true }, orderBy: { name: 'asc' } });
  const header = ['Name', 'County', 'State', 'Area', 'Clerk Name', 'Clerk Email', 'Clerk Phone', 'Office Address', 'Website', 'Fee', 'Processing Days', 'Duration Days', 'Fee Required', 'Fingerprints', 'Background Check', 'Photo', 'Insurance', 'Bond', 'Driver License', 'Vehicle Info', 'In Person', 'Notarized', 'Has Permit PDF', 'Status'];
  const body = townships.map((t) => [
    t.name, t.county ?? '', t.state ?? '', t.areaGroup?.name ?? '',
    t.clerkName ?? '', t.clerkEmail ?? '', t.clerkPhone ?? '', t.officeAddress ?? '', t.website ?? '',
    t.permitFee ?? '', t.processingDays ?? '', t.permitDurationDays ?? '',
    yn(t.reqFee), yn(t.reqFingerprints), yn(t.reqBackgroundCheck), yn(t.reqPhoto2x2), yn(t.reqInsurance), yn(t.reqBond),
    yn(t.reqDriverLicense), yn(t.reqVehicleInfo), yn(t.reqInPerson), yn(t.reqNotarized),
    t.permitPdfPath ? 'yes' : 'no', t.status,
  ]);
  const csv = serializeCsv([header, ...body]);
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="townships-${d(new Date())}.csv"` },
  });
}
