import { prisma } from "../../db.js";
import { isEntitled } from "../../billing/service.js";
import { getLeadFollowUpConfig } from "./service.js";
import { runLeadDrip } from "./controller.js";

/**
 * Send due re-engagement messages for one org. A lead is "due" when it's still
 * open (not booked/lost/opted-out), hasn't exhausted the configured drip steps,
 * and enough time has passed since the last outreach for the next step.
 */
export async function runDripForOrg(
  organizationId: string,
  opts: { forceSimulate?: boolean } = {},
): Promise<number> {
  if (!(await isEntitled(organizationId, "lead_follow_up"))) return 0;
  const config = await getLeadFollowUpConfig(organizationId);
  if (!config.dripEnabled || config.dripStepsDays.length === 0) return 0;

  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      optedOut: false,
      status: { in: ["new", "contacted", "qualified"] },
    },
  });

  const now = Date.now();
  let sent = 0;
  for (const lead of leads) {
    if (lead.dripStep >= config.dripStepsDays.length) continue;
    const since = (lead.lastOutreachAt ?? lead.createdAt).getTime();
    const dueAfterMs = config.dripStepsDays[lead.dripStep] * 24 * 60 * 60 * 1000;
    if (now - since >= dueAfterMs) {
      await runLeadDrip(lead.id, opts);
      sent += 1;
    }
  }
  return sent;
}

/** Run drip across every organization (used by the background scheduler). */
export async function runAllDrips(): Promise<number> {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  let total = 0;
  for (const org of orgs) {
    try {
      total += await runDripForOrg(org.id);
    } catch (err) {
      console.error(`[drip] org ${org.id} failed:`, (err as Error).message);
    }
  }
  return total;
}
