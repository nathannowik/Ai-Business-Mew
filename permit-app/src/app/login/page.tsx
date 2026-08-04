import { login } from './actions';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; from?: string }> }) {
  const { error, from } = await searchParams;
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#0f172a,#1e293b)', padding: 20 }}>
      <div className="card" style={{ width: 380, maxWidth: '100%', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '28px 28px 8px', textAlign: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, margin: '0 auto 14px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>P</div>
          <h1 style={{ fontSize: 20 }}>PermitPilot</h1>
          <p className="muted" style={{ marginTop: 6 }}>Sign in to manage soliciting permits.</p>
        </div>
        <form action={login} style={{ padding: '12px 28px 28px' }}>
          <input type="hidden" name="from" value={from ?? '/'} />
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" name="email" autoFocus required placeholder="you@company.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" name="password" required placeholder="Enter password" />
          </div>
          {error && <div className="notice warn" style={{ marginBottom: 12 }}><span>⚠</span><div>Incorrect email or password. Please try again.</div></div>}
          <button className="btn primary lg" type="submit" style={{ width: '100%' }}>Sign in</button>
        </form>
      </div>
    </div>
  );
}
