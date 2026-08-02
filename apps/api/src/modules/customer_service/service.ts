import { Prisma } from "@prisma/client";
import type { ChatTurn, CustomerServiceConfig } from "@mew/shared";
import { prisma } from "../../db.js";

const DEFAULT_CONFIG: CustomerServiceConfig = {
  businessName: "the business",
  greeting: "Hi! How can I help you today?",
  instructions: "",
  enabled: true,
};

export async function getCustomerServiceConfig(
  organizationId: string,
): Promise<CustomerServiceConfig> {
  const row = await prisma.serviceConfig.findUnique({
    where: {
      organizationId_serviceKey: { organizationId, serviceKey: "customer_service" },
    },
  });
  if (!row) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...(row.config as Partial<CustomerServiceConfig>) };
}

export async function saveCustomerServiceConfig(
  organizationId: string,
  config: CustomerServiceConfig,
): Promise<CustomerServiceConfig> {
  await prisma.serviceConfig.upsert({
    where: {
      organizationId_serviceKey: { organizationId, serviceKey: "customer_service" },
    },
    create: {
      organizationId,
      serviceKey: "customer_service",
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

export function getChatTurns(session: { transcript: unknown }): ChatTurn[] {
  return Array.isArray(session.transcript) ? (session.transcript as ChatTurn[]) : [];
}

export async function getOrCreateSession(
  organizationId: string,
  sessionId?: string,
) {
  if (sessionId) {
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (existing) return existing;
  }
  return prisma.chatSession.create({
    data: { organizationId, transcript: [] },
  });
}

export async function appendChatTurns(sessionId: string, turns: ChatTurn[]) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error(`Chat session ${sessionId} not found`);
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      transcript: [...getChatTurns(session), ...turns] as unknown as Prisma.InputJsonValue,
    },
  });
}
