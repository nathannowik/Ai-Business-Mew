import type { LeadChannel, LeadMessage } from "@mew/shared";
import { prisma } from "../../db.js";
import { logActivity } from "../../activity/service.js";
import { sendEmail, sendSms } from "../../channels/send.js";
import { runLeadAgent } from "./agent.js";
import {
  appendMessage,
  getLead,
  getLeadFollowUpConfig,
  getMessages,
  pickChannel,
  setLeadStatus,
} from "./service.js";

const OPT_OUT = /\b(stop|unsubscribe|quit|cancel|opt.?out)\b/i;

export interface LeadTurnOutcome {
  reply: string;
  channel: LeadChannel | null;
  /** True when the message was only logged (no integration configured). */
  simulated: boolean;
  status: string;
}

async function deliver(
  organizationId: string,
  channel: LeadChannel,
  lead: { phone: string | null; email: string | null; name: string },
  text: string,
): Promise<boolean> {
  if (channel === "sms" && lead.phone) {
    const r = await sendSms(organizationId, lead.phone, text);
    return r.simulated;
  }
  if (channel === "email" && lead.email) {
    const r = await sendEmail(
      organizationId,
      lead.email,
      "Following up on your inquiry",
      text,
    );
    return r.simulated;
  }
  return true; // nothing to send to → treat as simulated
}

/**
 * Run one follow-up turn for a lead: generate the next message, send it over
 * the chosen channel (or simulate), persist it, and apply any status change.
 * `incomingText` is null for the first outreach.
 */
export async function runLeadFollowUp(
  leadId: string,
  incomingText: string | null,
  opts: { forceSimulate?: boolean } = {},
): Promise<LeadTurnOutcome> {
  const lead = await getLead(leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  const config = await getLeadFollowUpConfig(lead.organizationId);
  const channel = pickChannel(lead, config);
  const history = getMessages(lead);

  // Log the inbound message first so it's part of the transcript.
  if (incomingText) {
    const inbound: LeadMessage = {
      direction: "inbound",
      channel: channel ?? "form",
      text: incomingText,
      at: new Date().toISOString(),
    };
    await appendMessage(leadId, inbound);

    // Honor opt-out immediately — no AI, no further drips.
    if (OPT_OUT.test(incomingText)) {
      const msg = "You've been unsubscribed and won't receive further messages.";
      await appendMessage(leadId, {
        direction: "outbound",
        channel: channel ?? "form",
        text: msg,
        at: new Date().toISOString(),
      });
      await prisma.lead.update({
        where: { id: leadId },
        data: { optedOut: true, lastOutreachAt: new Date() },
      });
      return { reply: msg, channel, simulated: true, status: lead.status };
    }
  }

  const { reply, status } = await runLeadAgent(
    {
      id: lead.id,
      organizationId: lead.organizationId,
      name: lead.name,
      phone: lead.phone,
      inquiry: lead.inquiry,
      channel: channel ?? "form",
    },
    config,
    // `history` is the transcript before this inbound message; the agent adds
    // `incomingText` itself, so don't include it here (avoids double-counting).
    history,
    incomingText,
  );

  let simulated = true;
  if (channel && !opts.forceSimulate) {
    simulated = await deliver(lead.organizationId, channel, lead, reply);
  }

  await appendMessage(leadId, {
    direction: "outbound",
    channel: channel ?? "form",
    text: reply,
    at: new Date().toISOString(),
  });

  // Apply status: agent decision wins; otherwise first contact → "contacted".
  const newStatus = status ?? (lead.status === "new" ? "contacted" : lead.status);
  if (newStatus !== lead.status) await setLeadStatus(leadId, newStatus);

  // Track outreach time; a lead reply resets the drip cadence.
  await prisma.lead.update({
    where: { id: leadId },
    data: { lastOutreachAt: new Date(), ...(incomingText ? { dripStep: 0 } : {}) },
  });

  return { reply, channel, simulated, status: newStatus };
}

/** Send the next automated re-engagement (drip) message to a quiet lead. */
export async function runLeadDrip(
  leadId: string,
  opts: { forceSimulate?: boolean } = {},
): Promise<LeadTurnOutcome | null> {
  const lead = await getLead(leadId);
  if (!lead || lead.optedOut) return null;
  if (["booked", "lost"].includes(lead.status)) return null;

  const config = await getLeadFollowUpConfig(lead.organizationId);
  const channel = pickChannel(lead, config);

  const { reply } = await runLeadAgent(
    {
      id: lead.id,
      organizationId: lead.organizationId,
      name: lead.name,
      phone: lead.phone,
      inquiry: lead.inquiry,
      channel: channel ?? "form",
    },
    config,
    getMessages(lead),
    null,
    { nudge: true },
  );

  let simulated = true;
  if (channel && !opts.forceSimulate) {
    simulated = await deliver(lead.organizationId, channel, lead, reply);
  }
  await appendMessage(leadId, {
    direction: "outbound",
    channel: channel ?? "form",
    text: reply,
    at: new Date().toISOString(),
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { dripStep: lead.dripStep + 1, lastOutreachAt: new Date() },
  });
  await logActivity(lead.organizationId, "lead_drip", `Re-engaged lead: ${lead.name}`);

  return { reply, channel, simulated, status: lead.status };
}
