'use client';

import { Drawer } from '@/components/Drawer';
import { DocumentsPanel, type DocItem } from '@/components/DocumentsPanel';

export function DocumentsDrawer({ employeeId, name, docs }: { employeeId: string; name: string; docs: DocItem[] }) {
  return (
    <Drawer
      title={`Documents — ${name}`}
      subtitle="Attach background checks, fingerprint cards, insurance, photos, and more."
      trigger={(open) => (
        <button className="btn sm" type="button" onClick={open}>📎 Docs{docs.length ? ` (${docs.length})` : ''}</button>
      )}
    >
      {() => <DocumentsPanel employeeId={employeeId} docs={docs} />}
    </Drawer>
  );
}
