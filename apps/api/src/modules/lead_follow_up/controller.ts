import type { LeadChannel, LeadMessage } from "@mew/shared";
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

  return { reply, channel, simulated, status: newStatus };
}
