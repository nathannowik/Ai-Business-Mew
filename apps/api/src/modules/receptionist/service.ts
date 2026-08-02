import { Prisma } from "@prisma/client";
import type { CallTurn, ReceptionistConfig } from "@mew/shared";
import { prisma } from "../../db.js";
import { logActivity } from "../../activity/service.js";

/** Prisma's Json columns want an index-signature type; our typed shapes are safe to cast. */
function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const DEFAULT_CONFIG: ReceptionistConfig = {
  greeting: "Thanks for calling! How can I help you today?",
  businessName: "the business",
  businessHours: "Monday to Friday, 9am to 5pm",
  transferNumber: null,
  instructions: "",
  enabled: true,
};

/** Read the receptionist config for an org, falling back to sane defaults. */
export async function getReceptionistConfig(
  organizationId: string,
): Promise<ReceptionistConfig> {
  const row = await prisma.serviceConfig.findUnique({
    where: {
      organizationId_serviceKey: { organizationId, serviceKey: "receptionist" },
    },
  });
  if (!row) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...(row.config as Partial<ReceptionistConfig>) };
}

export async function saveReceptionistConfig(
  organizationId: string,
  config: ReceptionistConfig,
): Promise<ReceptionistConfig> {
  await prisma.serviceConfig.upsert({
    where: {
      organizationId_serviceKey: { organizationId, serviceKey: "receptionist" },
    },
    create: {
      organizationId,
      serviceKey: "receptionist",
      enabled: config.enabled,
      config: asJson(config),
    },
    update: { enabled: config.enabled, config: asJson(config) },
  });
  return config;
}

/**
 * Concatenate the org's knowledge docs into a context block for the prompt.
 * By default only public docs are included; the Employee KB passes
 * includeInternal to also use internal policies/SOPs.
 */
export async function getKnowledgeContext(
  organizationId: string,
  opts: { includeInternal?: boolean } = {},
): Promise<string> {
  const docs = await prisma.knowledgeDoc.findMany({
    where: {
      organizationId,
      ...(opts.includeInternal ? {} : { internal: false }),
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });
  if (docs.length === 0) return "";
  return docs
    .map((d) => `# ${d.title}\n${d.content}`)
    .join("\n\n---\n\n")
    .slice(0, 12000); // keep the prompt bounded
}

export interface BookAppointmentInput {
  organizationId: string;
  customerName: string;
  customerPhone?: string | null;
  startsAt: Date;
  durationMinutes?: number;
  notes?: string | null;
}

export async function bookAppointment(input: BookAppointmentInput) {
  const appt = await prisma.appointment.create({
    data: {
      organizationId: input.organizationId,
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes ?? 30,
      notes: input.notes ?? null,
      source: "receptionist",
    },
  });
  await logActivity(
    input.organizationId,
    "appointment",
    `Appointment booked: ${input.customerName}`,
    appt.startsAt.toLocaleString(),
  );
  return appt;
}

/** Create a Call row when a new call comes in. */
export async function startCall(params: {
  organizationId: string;
  fromNumber: string;
  toNumber: string;
  externalId?: string;
}) {
  const call = await prisma.call.create({
    data: {
      organizationId: params.organizationId,
      fromNumber: params.fromNumber,
      toNumber: params.toNumber,
      externalId: params.externalId,
      transcript: [],
    },
  });
  await logActivity(params.organizationId, "call", `Incoming call from ${params.fromNumber}`);
  return call;
}

export async function getCall(callId: string) {
  return prisma.call.findUnique({ where: { id: callId } });
}

export function getTranscript(call: { transcript: unknown }): CallTurn[] {
  return Array.isArray(call.transcript) ? (call.transcript as CallTurn[]) : [];
}

export async function appendTurns(callId: string, turns: CallTurn[]) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) throw new Error(`Call ${callId} not found`);
  const transcript = [...getTranscript(call), ...turns];
  await prisma.call.update({
    where: { id: callId },
    data: { transcript: asJson(transcript) },
  });
}

export async function endCall(
  callId: string,
  status: "completed" | "transferred" | "missed",
  summary?: string,
) {
  await prisma.call.update({
    where: { id: callId },
    data: { status, endedAt: new Date(), summary: summary ?? null },
  });
}
