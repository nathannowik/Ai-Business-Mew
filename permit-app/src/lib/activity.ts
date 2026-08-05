import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

// Best-effort audit logging. Never throws — logging must not break the action it records.
export async function logActivity(input: {
  action: string;
  entity?: string;
  entityId?: string;
  detail?: string;
}): Promise<void> {
  try {
    const user = await getCurrentUser();
    await prisma.activityLog.create({
      data: {
        userId: user?.id ?? null,
        userName: user?.name ?? 'System',
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch {
    /* ignore logging failures */
  }
}

// Presentation metadata for the activity feed.
export const ACTIVITY_META: Record<string, { icon: string; label: string; tone: string }> = {
  'permits.generated': { icon: '✦', label: 'Generated permits', tone: 'blue' },
  'permit.status': { icon: '↻', label: 'Updated permit status', tone: 'amber' },
  'permit.renewed': { icon: '↻', label: 'Renewed permit', tone: 'green' },
  'permit.deleted': { icon: '🗑', label: 'Deleted permit', tone: 'red' },
  'employee.imported': { icon: '⇪', label: 'Imported employees', tone: 'blue' },
  'township.imported': { icon: '⇪', label: 'Imported townships', tone: 'blue' },
  'township.researched': { icon: '✨', label: 'Researched township', tone: 'green' },
  'township.pdf': { icon: '📄', label: 'Updated township form', tone: 'gray' },
  'user.created': { icon: '＋', label: 'Added user', tone: 'green' },
  'user.updated': { icon: '✎', label: 'Updated user', tone: 'gray' },
  'user.deleted': { icon: '🗑', label: 'Removed user', tone: 'red' },
};

export function activityMeta(action: string) {
  return ACTIVITY_META[action] ?? { icon: '•', label: action, tone: 'gray' };
}
