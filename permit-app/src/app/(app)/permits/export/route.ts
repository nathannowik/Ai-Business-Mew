import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeCsv } from '@/lib/csv';
import { effectiveStatus, expiryInfo, APPLICATION_STATUS } from '@/lib/domain';

const d = (x: Date | null) => (x ? new Date(x).toISOString().slice(0, 10) : '');
const parseMissing = (j: string | null) => { try { const v = JSON.parse(j || '[]'); return Array.isArray(v) ? v.join('; ') : ''; } catch { return ''; } };

export async function GET(req: NextRequest) {
  const filter = req.nextUrl.searchParams.get('status') ?? 'all';
  const apps = await prisma.permitApplication.findMany({ include: { township: true, employee: true }, orderBy: { createdAt: 'desc' } });

  const rows = apps
    .map((a) => ({ a, eff: effectiveStatus(a), exp: expiryInfo(a) }))
    .filter((x) => {
      if (filter === 'all') return true;
      if (filter === 'expiring') return x.exp.expiringSoon && x.eff !== 'expired';
      return x.eff === filter;
    });

  const header = ['Employee', 'Township', 'County', 'State', 'Permit #', 'Status', 'Missing requirements', 'Filled out', 'Submitted', 'Approved', 'Expires', 'Days remaining'];
  const body = rows.map(({ a, eff, exp }) => [
    `${a.employee.firstName} ${a.employee.lastName}`,
    a.township.name, a.township.county ?? '', a.township.state ?? '',
    a.permitNumber ?? '',
    APPLICATION_STATUS[eff]?.label ?? eff,
    parseMissing(a.missingRequirements),
    d(a.createdAt), d(a.submittedAt), d(a.approvedAt), d(a.expiresAt),
    exp.daysRemaining ?? '',
  ]);

  const csv = serializeCsv([header, ...body]);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="permits-${filter}-${d(new Date())}.csv"`,
    },
  });
}
