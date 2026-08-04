'use client';

import { useMemo, useState } from 'react';
import { Drawer, SubmitBar } from '@/components/Drawer';
import { parseCsv } from '@/lib/csv';

export function ImportDrawer({
  action,
  title,
  description,
  template,
  templateName,
  triggerLabel = '⇪ Import CSV',
  triggerClass = 'btn',
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  description: string;
  template: string;
  templateName: string;
  triggerLabel?: string;
  triggerClass?: string;
}) {
  const [text, setText] = useState('');
  const parsed = useMemo(() => (text.trim() ? parseCsv(text) : null), [text]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Drawer
      wide
      title={title}
      subtitle={description}
      trigger={(open) => <button className={triggerClass} type="button" onClick={open}>{triggerLabel}</button>}
    >
      {(close) => (
        <form action={action}>
          <div className="notice info" style={{ marginBottom: 14 }}>
            <span>ℹ</span>
            <div>The first row must be column headers. Header names are matched flexibly (e.g. “First Name”, “first”, “Given Name” all work). Existing records with the same name are updated.</div>
          </div>

          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button type="button" className="btn sm" onClick={downloadTemplate}>⬇ Download template</button>
            <label className="btn sm" style={{ cursor: 'pointer' }}>
              📄 Choose .csv file
              <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="field">
            <label>CSV data</label>
            <textarea
              className="textarea"
              name="csv"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={template}
              style={{ minHeight: 180, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}
            />
          </div>

          {parsed && (
            <div style={{ marginBottom: 8 }}>
              <div className="between" style={{ marginBottom: 8 }}>
                <span className="cell-strong">{parsed.objects.length} row{parsed.objects.length === 1 ? '' : 's'} detected</span>
                <span className="cell-sub">{parsed.headers.length} columns</span>
              </div>
              <div className="table-wrap" style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table className="tbl">
                  <thead><tr>{parsed.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                  <tbody>
                    {parsed.rows.slice(0, 6).map((r, ri) => (
                      <tr key={ri}>{parsed.headers.map((_, ci) => <td key={ci} className="cell-sub">{r[ci] ?? ''}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 6 && <div className="cell-sub" style={{ marginTop: 6 }}>…and {parsed.rows.length - 6} more</div>}
            </div>
          )}

          <SubmitBar close={close} label={parsed ? `Import ${parsed.objects.length} row${parsed.objects.length === 1 ? '' : 's'}` : 'Import'} />
        </form>
      )}
    </Drawer>
  );
}
