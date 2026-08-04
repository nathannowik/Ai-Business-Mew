import { prisma } from '@/lib/db';
import { PageHead, Badge, Avatar, Empty } from '@/components/ui';
import { COMPLIANCE_STATUS } from '@/lib/domain';
import { EmployeeForm } from './EmployeeForm';
import { deleteEmployee } from './actions';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const [employees, areas] = await Promise.all([
    prisma.employee.findMany({ include: { areaGroup: true }, orderBy: [{ active: 'desc' }, { lastName: 'asc' }] }),
    prisma.areaGroup.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHead
        title="Employees"
        subtitle="Your field team. Each person is assigned to an area group and tracked for photo, background check, and fingerprint compliance."
        action={<EmployeeForm areas={areas} />}
      />

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
