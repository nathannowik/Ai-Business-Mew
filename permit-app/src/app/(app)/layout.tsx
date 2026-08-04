import Sidebar from '@/components/Sidebar';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="app">
      <Sidebar user={user ? { name: user.name, role: user.role } : null} />
      <div className="main">
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
