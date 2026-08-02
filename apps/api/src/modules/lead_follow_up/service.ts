import { Prisma } from "@prisma/client";
import type {
  LeadChannel,
  LeadFollowUpConfig,
  LeadMessage,
  LeadStatus,
} from "@mew/shared";
import { prisma } from "../../db.js";
import { logActivity } from "../../activity/service.js";

const DEFAULT_CONFIG: LeadFollowUpConfig = {
  businessName: "the business",
  instructions: "",
  qualificationCriteria:
    "A qualified lead has a real need we can serve, is in our service area, and is ready to schedule.",
  preferredChannel: "sms",
  enabled: true,
  dripEnabled: true,
  dripStepsDays: [1, 3, 7],
};

export async function getLeadFollowUpConfig(
  organizationId: string,
): Promise<LeadFollowUpConfig> {
  const row = await prisma.serviceConfig.findUnique({
    where: {
      organizationId_serviceKey: { organizationId, serviceKey: "lead_follow_up" },
    },
  });
  if (!row) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...(row.config as Partial<LeadFollowUpConfig>) };
}

export async function saveLeadFollowUpConfig(
  organizationId: string,
  config: LeadFollowUpConfig,
): Promise<LeadFollowUpConfig> {
  await prisma.serviceConfig.upsert({
    where: {
      organizationId_serviceKey: { organizationId, serviceKey: "lead_follow_up" },
    },
    create: {
      organizationId,
      serviceKey: "lead_follow_up",
      enabled: config.enabled,
      config: config as unknown as Prisma.InputJsonValue,
    },
    update: {
      enabled: config.enabled,
      config: config as unknown as Prisma.InputJsonValue,
    },
  });
  return config;
}

export interface CreateLeadInput {
  organizationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string;
  channel?: LeadChannel;
  inquiry?: string | null;
}

export async function createLead(input: CreateLeadInput) {
  const lead = await prisma.lead.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      source: input.source ?? "form",
      channel: input.channel ?? "form",
      inquiry: input.inquiry ?? null,
      messages: [],
    },
  });
  await logActivity(
    input.organizationId,
    "lead",
    `New lead: ${input.name}`,
    input.inquiry ?? null,
  );
  return lead;
}

export async function getLead(leadId: string) {
  return prisma.lead.findUnique({ where: { id: leadId } });
}

export async function findLeadByPhone(organizationId: string, phone: string) {
  return prisma.lead.findFirst({
    where: { organizationId, phone },
    orderBy: { updatedAt: "desc" },
  });
}

export function getMessages(lead: { messages: unknown }): LeadMessage[] {
  return Array.isArray(lead.messages) ? (lead.messages as LeadMessage[]) : [];
}

export async function appendMessage(leadId: string, message: LeadMessage) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      messages: [...getMessages(lead), message] as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function setLeadStatus(leadId: string, status: LeadStatus) {
  await prisma.lead.update({ where: { id: leadId }, data: { status } });
}

/** Decide which channel to use given what contact info we have + the preference. */
export function pickChannel(
  lead: { phone: string | null; email: string | null },
  config: LeadFollowUpConfig,
): LeadChannel | null {
  const hasPhone = Boolean(lead.phone);
  const hasEmail = Boolean(lead.email);
  if (config.preferredChannel === "sms" && hasPhone) return "sms";
  if (config.preferredChannel === "email" && hasEmail) return "email";
  if (hasPhone) return "sms";
  if (hasEmail) return "email";
  return null;
}
