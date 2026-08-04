import { prisma } from '@/lib/db';
import { PageHead, Badge, Avatar, Empty } from '@/components/ui';
import { ImportDrawer } from '@/components/ImportDrawer';
import { COMPLIANCE_STATUS } from '@/lib/domain';
import { DocumentsDrawer } from '@/components/DocumentsDrawer';
import { EmployeeForm } from './EmployeeForm';
import { deleteEmployee, importEmployeesCsv } from './actions';

export const dynamic = 'force-dynamic';

const EMP_TEMPLATE = `First Name,Last Name,Email,Phone,Address,City,State,Zip,DOB,Driver License,Area
Jordan,Blake,jordan@example.com,(616) 555-0100,12 Oak St,Grand Rapids,MI,49503,1995-04-12,B123-4567-8901,Area 3
Casey,Nguyen,casey@example.com,(616) 555-0101,88 Birch Ln,Wyoming,MI,49509,1992-09-01,N987-6543-2109,Area 2`;

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ imported?: string; skipped?: string }> }) {
  const { imported, skipped } = await searchParams;
  const [employees, areas] = await Promise.all([
    prisma.employee.findMany({ include: { areaGroup: true, documents: { orderBy: { createdAt: 'desc' } } }, orderBy: [{ active: 'desc' }, { lastName: 'asc' }] }),
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHead
        title="Employees"
        subtitle="Your field team. Each person is assigned to an area group and tracked for photo, background check, and fingerprint compliance."
        action={
          <>
            <ImportDrawer
              action={importEmployeesCsv}
              title="Import employees"
              description="Bulk-add your roster from a spreadsheet export."
              template={EMP_TEMPLATE}
              templateName="employees-template.csv"
            />
            <EmployeeForm areas={areas} />
          </>
        }
      />
      {imported != null && (
        <div className="notice success" style={{ marginBottom: 16 }}>
          <span>✓</span>
          <div>Imported {imported} employee{imported === '1' ? '' : 's'}{Number(skipped) > 0 ? ` · skipped ${skipped} row${skipped === '1' ? '' : 's'} (missing name)` : ''}.</div>
        </div>
      )}

      <div className="card">
        {employees.length === 0 ? (
          <Empty icon="☺" title="No employees yet" hint="Add the people who will be knocking to start assigning them to areas and generating permits." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Area</th>
                  <th>2×2 Photo</th>
                  <th>Background</th>
                  <th>Fingerprints</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="row">
                        <Avatar first={e.firstName} last={e.lastName} />
                        <div>
                          <div className="cell-strong">{e.firstName} {e.lastName} {!e.active && <span className="pill" style={{ marginLeft: 6 }}>inactive</span>}</div>
                          <div className="cell-sub">{[e.email, e.phone].filter(Boolean).join(' · ') || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{e.areaGroup ? <span className="pill">{e.areaGroup.name}</span> : <span className="faint">Unassigned</span>}</td>
                    <td><Comp value={e.photoStatus} /></td>
                    <td><Comp value={e.backgroundCheckStatus} /></td>
                    <td><Comp value={e.fingerprintStatus} /></td>
                    <td className="right">
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <DocumentsDrawer
                          employeeId={e.id}
                          name={`${e.firstName} ${e.lastName}`}
                          docs={e.documents.map((d) => ({ id: d.id, name: d.name, category: d.category, storageKey: d.storageKey, mimeType: d.mimeType, size: d.size, createdAt: d.createdAt.toISOString() }))}
                        />
                        <EmployeeForm areas={areas} employee={e} triggerLabel="Edit" triggerClass="btn sm" />
                        <form action={deleteEmployee}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="btn ghost sm" title="Delete">🗑</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Comp({ value }: { value: string }) {
  const meta = COMPLIANCE_STATUS[value] ?? COMPLIANCE_STATUS.missing;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
