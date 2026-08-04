import { prisma } from '@/lib/db';
import { PageHead, Badge, Empty } from '@/components/ui';
import { activeRequirements } from '@/lib/domain';
import { Composer, type TownshipLite } from './Composer';
import { markSent, deleteDraft } from './actions';

export const dynamic = 'force-dynamic';

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ township?: string }> }) {
  const { township: presetTownshipId } = await searchParams;
  const [townshipsRaw, company, drafts] = await Promise.all([
    prisma.township.findMany({ orderBy: { name: 'asc' } }),
    prisma.company.findFirst(),
    prisma.emailDraft.findMany({ include: { township: true }, orderBy: { createdAt: 'desc' } }),
  ]);

  const townships: TownshipLite[] = townshipsRaw.map((t) => ({
    id: t.id,
    name: t.name,
    clerkName: t.clerkName,
    clerkEmail: t.clerkEmail,
    reqSummary: activeRequirements(t).map((r) => r.short).join(', '),
  }));
  const companyLite = company ? { name: company.name, contactName: company.contactName, contactTitle: company.contactTitle, phone: company.phone, email: company.email } : null;

  return (
    <>
      <PageHead
        title="Clerk emails"
        subtitle="Generate ready-to-send emails to township clerks — asking for requirements, following up, or transmitting applications. You review and send from your own inbox."
        action={<Composer townships={townships} company={companyLite} presetTownshipId={presetTownshipId} />}
      />

      <div className="card">
        <div className="card-head"><h3>Drafts</h3><div className="sub">{drafts.length}</div></div>
        {drafts.length === 0 ? (
          <Empty icon="✉" title="No email drafts yet" hint="Draft an email to a clerk's office — a template is generated for you to review and send." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Subject</th><th>Township</th><th>To</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d.id}>
                    <td><span className="cell-strong">{d.subject}</span><div className="cell-sub" style={{ maxWidth: 380, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.body.split('\n')[0]}</div></td>
                    <td>{d.township?.name ?? '—'}</td>
                    <td>{d.to ?? '—'}</td>
                    <td>{d.status === 'sent' ? <Badge tone="green">Sent</Badge> : <Badge tone="blue">Draft</Badge>}</td>
                    <td className="right">
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Composer townships={townships} company={companyLite} draft={{ id: d.id, townshipId: d.townshipId, to: d.to, cc: d.cc, subject: d.subject, body: d.body, purpose: d.purpose }} triggerLabel="Open" triggerClass="btn sm" />
                        {d.status !== 'sent' && <form action={markSent}><input type="hidden" name="id" value={d.id} /><button className="btn ghost sm" type="submit" title="Mark sent">✓</button></form>}
                        <form action={deleteDraft}><input type="hidden" name="id" value={d.id} /><button className="btn ghost sm" title="Delete">🗑</button></form>
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
