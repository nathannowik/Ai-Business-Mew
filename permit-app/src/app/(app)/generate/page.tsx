import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHead } from '@/components/ui';
import { activeRequirements } from '@/lib/domain';
import { GenerateWizard } from './GenerateWizard';

export const dynamic = 'force-dynamic';

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ area?: string; township?: string }> }) {
  const { area: presetArea, township: presetTownship } = await searchParams;
  const [areas, townshipsRaw, employeesRaw] = await Promise.all([
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
    prisma.township.findMany({ orderBy: { name: 'asc' } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { lastName: 'asc' } }),
  ]);

  const townships = townshipsRaw.map((t) => ({
    id: t.id,
    name: t.name,
    areaGroupId: t.areaGroupId,
    status: t.status,
    hasPdf: !!t.permitPdfPath,
    county: t.county,
    state: t.state,
    needsPhoto: t.reqPhoto2x2,
    needsBackground: t.reqBackgroundCheck,
    needsFingerprint: t.reqFingerprints,
    reqShort: activeRequirements(t).map((r) => r.short),
  }));
  const employees = employeesRaw.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    areaGroupId: e.areaGroupId,
    photoStatus: e.photoStatus,
    backgroundCheckStatus: e.backgroundCheckStatus,
    fingerprintStatus: e.fingerprintStatus,
  }));

  if (areas.length === 0) {
    return (
      <>
        <PageHead title="Generate permits" />
        <div className="card"><div className="empty"><div className="big">◈</div>Create an <Link className="link" href="/areas">area group</Link>, add employees, and designate townships first.</div></div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Generate permits"
        subtitle="Tell it the area and townships — it fills each employee’s permit form and produces one print-ready batch to turn in."
      />
      <GenerateWizard areas={areas} townships={townships} employees={employees} presetArea={presetArea} presetTownship={presetTownship} />
    </>
  );
}
