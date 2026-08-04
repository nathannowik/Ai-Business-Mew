'use client';

import { useState } from 'react';

type Emp = { id: string; name: string };

export function PreviewControl({ townshipId, employees }: { townshipId: string; employees: Emp[] }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const url = `/townships/${townshipId}/preview${employeeId ? `?employeeId=${employeeId}` : ''}`;
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {employees.length > 0 && (
        <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={{ width: 'auto' }}>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      )}
      <a className="btn" href={url} target="_blank" rel="noreferrer">↗ Preview filled form</a>
    </div>
  );
}
