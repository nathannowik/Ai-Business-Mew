'use client';

import { useMemo, useState } from 'react';
import { Drawer, SubmitBar } from '@/components/Drawer';
import { saveDraft } from './actions';

export type TownshipLite = {
  id: string; name: string; clerkName: string | null; clerkEmail: string | null;
  reqSummary: string;
};
export type CompanyLite = { name: string; contactName: string | null; contactTitle: string | null; phone: string | null; email: string | null } | null;

const PURPOSES = [
  { v: 'info_request', l: 'Request requirements & application' },
  { v: 'follow_up', l: 'Follow up on a pending application' },
  { v: 'submission', l: 'Submit / transmit applications' },
  { v: 'other', l: 'Other' },
];

function buildTemplate(purpose: string, township: TownshipLite | undefined, company: CompanyLite) {
  const clerk = township?.clerkName ? township.clerkName : 'Clerk';
  const twp = township?.name ?? 'your township';
  const co = company?.name ?? 'our company';
  const signer = [company?.contactName, company?.contactTitle].filter(Boolean).join(', ');
  const sig = `\n\nThank you,\n${signer || co}\n${co}${company?.phone ? `\n${company.phone}` : ''}${company?.email ? `\n${company.email}` : ''}`;

  switch (purpose) {
    case 'follow_up':
      return {
        subject: `Follow-up: solicitation permit application — ${co}`,
        body: `Dear ${clerk},\n\nI'm following up on the solicitation/peddler permit application(s) ${co} submitted for ${twp}. Could you let me know the current status and whether anything further is needed from us?\n\nWe appreciate your help.${sig}`,
      };
    case 'submission':
      return {
        subject: `Solicitation permit application(s) — ${co}`,
        body: `Dear ${clerk},\n\nPlease find attached the completed solicitation/peddler permit application(s) for ${co} to canvass in ${twp}. We've included the required documentation and fee.\n\nPlease let me know if anything else is needed to process these.${sig}`,
      };
    case 'other':
      return { subject: `${twp} — ${co}`, body: `Dear ${clerk},\n\n${sig}` };
    default:
      return {
        subject: `Solicitation permit requirements — ${twp}`,
        body: `Dear ${clerk},\n\n${co} would like to apply for solicitation/peddler permits for our representatives to canvass in ${twp}. Could you please confirm:\n\n  • The application form and where to submit it\n  • Required documentation (background check, fingerprints, photos, insurance, bond, etc.)\n  • The permit fee and accepted payment methods\n  • Typical processing time and how long the permit is valid\n${township?.reqSummary ? `\nOur current understanding of your requirements: ${township.reqSummary}. Please correct anything that's out of date.\n` : ''}\nThank you for your time and assistance.${sig}`,
      };
  }
}

export function Composer({
  townships,
  company,
  presetTownshipId,
  draft,
  triggerLabel = '+ New email draft',
  triggerClass = 'btn primary',
}: {
  townships: TownshipLite[];
  company: CompanyLite;
  presetTownshipId?: string;
  draft?: { id: string; townshipId: string | null; to: string | null; cc: string | null; subject: string; body: string; purpose: string };
  triggerLabel?: string;
  triggerClass?: string;
}) {
  const [townshipId, setTownshipId] = useState(draft?.townshipId ?? presetTownshipId ?? (townships[0]?.id ?? ''));
  const [purpose, setPurpose] = useState(draft?.purpose ?? 'info_request');
  const township = useMemo(() => townships.find((t) => t.id === townshipId), [townshipId, townships]);

  const tpl = useMemo(() => buildTemplate(purpose, township, company), [purpose, township, company]);
  const [subject, setSubject] = useState(draft?.subject ?? tpl.subject);
  const [body, setBody] = useState(draft?.body ?? tpl.body);
  const [to, setTo] = useState(draft?.to ?? township?.clerkEmail ?? '');
  const [dirty, setDirty] = useState(!!draft);

  // Regenerate template when township/purpose changes (unless user has edited a fresh draft)
  function regenerate(nextPurpose = purpose, nextTownshipId = townshipId) {
    const t = townships.find((x) => x.id === nextTownshipId);
    const next = buildTemplate(nextPurpose, t, company);
    setSubject(next.subject);
    setBody(next.body);
    setTo(t?.clerkEmail ?? '');
    setDirty(false);
  }

  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Drawer
      wide
      defaultOpen={!!presetTownshipId && !draft}
      title={draft ? 'Edit email draft' : 'Draft an email to a clerk'}
      subtitle="Generated for your review — nothing sends automatically. Copy it or open it in your mail app."
      trigger={(open) => <button className={triggerClass} type="button" onClick={open}>{triggerLabel}</button>}
    >
      {(close) => (
        <form action={async (fd) => { await saveDraft(fd); close(); }}>
          {draft && <input type="hidden" name="id" value={draft.id} />}
          <div className="form-grid">
            <div className="field">
              <label>Township</label>
              <select className="select" name="townshipId" value={townshipId} onChange={(e) => { setTownshipId(e.target.value); if (!dirty) regenerate(purpose, e.target.value); }}>
                <option value="">— None —</option>
                {townships.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Purpose</label>
              <select className="select" name="purpose" value={purpose} onChange={(e) => { setPurpose(e.target.value); if (!dirty) regenerate(e.target.value, townshipId); }}>
                {PURPOSES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div className="field"><label>To</label><input className="input" name="to" value={to} onChange={(e) => { setTo(e.target.value); setDirty(true); }} placeholder="clerk@township.gov" /></div>
            <div className="field"><label>Cc</label><input className="input" name="cc" defaultValue={draft?.cc ?? ''} /></div>
          </div>
          <div className="field"><label>Subject</label><input className="input" name="subject" value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} /></div>
          <div className="field">
            <div className="between"><label>Body</label><button type="button" className="btn ghost sm" onClick={() => regenerate()}>↻ Regenerate from template</button></div>
            <textarea className="textarea" name="body" style={{ minHeight: 240, fontFamily: 'ui-monospace, monospace', fontSize: 13 }} value={body} onChange={(e) => { setBody(e.target.value); setDirty(true); }} />
          </div>
          <SubmitBar
            close={close}
            label={draft ? 'Save draft' : 'Save draft'}
            extra={
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn sm" onClick={() => navigator.clipboard?.writeText(`Subject: ${subject}\n\n${body}`)}>⧉ Copy</button>
                <a className="btn sm" href={mailto}>✉ Open in mail app</a>
              </div>
            }
          />
        </form>
      )}
    </Drawer>
  );
}
