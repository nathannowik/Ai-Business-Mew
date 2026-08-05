'use client';

import { useFormStatus } from 'react-dom';
import { researchAndAddTownship } from './research-actions';

type Area = { id: string; name: string };

function SubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" type="submit" disabled={!enabled || pending}>
      {pending ? '⏳ Researching…' : '🔎 Research & add'}
    </button>
  );
}

export function ResearchBar({ areas, enabled }: { areas: Area[]; enabled: boolean }) {
  return (
    <div className="card" style={{ marginBottom: 16, borderColor: 'var(--brand)', borderWidth: 1 }}>
      <div className="card-pad">
        <div className="row" style={{ gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <div>
            <div className="cell-strong">Add a township with AI</div>
            <div className="cell-sub">Type a township — it searches the web for the requirements, clerk contact, fee, and permit form, then drafts it for you to review.</div>
          </div>
        </div>
        <form action={researchAndAddTownship}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            <input className="input" name="name" placeholder="e.g. Gloucester Township" required style={{ flex: '2 1 220px' }} />
            <input className="input" name="state" placeholder="State (e.g. NJ)" style={{ flex: '1 1 90px', maxWidth: 130 }} />
            <input className="input" name="county" placeholder="County (optional)" style={{ flex: '1 1 120px', maxWidth: 170 }} />
            <select className="select" name="areaGroupId" defaultValue="" style={{ flex: '1 1 130px', maxWidth: 170 }}>
              <option value="">Area (optional)</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <SubmitButton enabled={enabled} />
          </div>
        </form>
        {!enabled && (
          <div className="notice warn" style={{ marginTop: 12 }}>
            <span>⚠</span>
            <div>AI research is off. Set an <code>ANTHROPIC_API_KEY</code> environment variable to enable it — until then, add townships manually or by CSV.</div>
          </div>
        )}
        {enabled && (
          <div className="cell-sub" style={{ marginTop: 10 }}>Researching can take up to a minute. The result is created as a draft (“needs info”) for you to verify.</div>
        )}
      </div>
    </div>
  );
}
