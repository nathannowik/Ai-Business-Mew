import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { PageHead, Badge, Avatar } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/auth';
import { UserForm } from './UserForm';
import { deleteUser, changeOwnPassword } from './actions';

export const dynamic = 'force-dynamic';

const ROLE_TONE: Record<string, string> = { admin: 'blue', manager: 'green', member: 'gray' };
const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString() : 'never');

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });

  return (
    <>
      <PageHead
        title="Users"
        subtitle="Who can sign in, and what they can do. Admins manage users and company settings; managers run everything else; members handle day-to-day permit work."
        action={<UserForm />}
      />

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><div className="row"><Avatar first={u.name.split(' ')[0]} last={u.name.split(' ')[1] ?? ''} /><span className="cell-strong">{u.name}{u.id === me.id && <span className="pill" style={{ marginLeft: 6 }}>you</span>}</span></div></td>
                  <td>{u.email}</td>
                  <td><Badge tone={ROLE_TONE[u.role] ?? 'gray'}>{ROLE_LABELS[u.role] ?? u.role}</Badge></td>
                  <td>{u.active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Disabled</Badge>}</td>
                  <td className="cell-sub">{fmt(u.lastLoginAt)}</td>
                  <td className="right">
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <UserForm user={{ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active }} triggerLabel="Edit" triggerClass="btn sm" />
                      {u.id !== me.id && (
                        <form action={deleteUser}><input type="hidden" name="id" value={u.id} /><button className="btn ghost sm" title="Delete">🗑</button></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, maxWidth: 460 }}>
        <div className="card-head"><h3>Change your password</h3></div>
        <div className="card-pad">
          <form action={changeOwnPassword}>
            <div className="field"><label>New password</label><input className="input" type="password" name="password" minLength={6} required placeholder="At least 6 characters" /></div>
            <button className="btn primary sm" type="submit">Update password</button>
          </form>
        </div>
      </div>
    </>
  );
}
