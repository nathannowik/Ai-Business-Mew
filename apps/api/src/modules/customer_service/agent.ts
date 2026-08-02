import type { ChatTurn, CustomerServiceConfig } from "@mew/shared";
import { chat } from "../../ai/claude.js";
import { env } from "../../env.js";
import { getKnowledgeContext } from "../receptionist/service.js";

function buildSystemPrompt(
  config: CustomerServiceConfig,
  knowledge: string,
): string {
  return [
    `You are the customer-support assistant for ${config.businessName}, chatting with a customer on the company website.`,
    `Be concise, friendly, and helpful. Answer ONLY from the business information below. If the answer isn't there, say you're not sure and offer to connect them with the team — never invent prices, policies, or availability.`,
    config.instructions ? `Business instructions:\n${config.instructions}` : "",
    knowledge
      ? `<business_information>\n${knowledge}\n</business_information>`
      : `No business information has been added yet, so for specifics offer to connect the customer with the team.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Generate the assistant's reply to a support chat message. */
export async function runSupportChat(
  organizationId: string,
  config: CustomerServiceConfig,
  history: ChatTurn[],
  message: string,
): Promise<string> {
  const knowledge = await getKnowledgeContext(organizationId);
  const system = buildSystemPrompt(config, knowledge);

  const messages = [
    ...history.map((t) => ({ role: t.role, content: t.text })),
    { role: "user" as const, content: message },
  ];

  const result = await chat({
    system,
    model: env.receptionistModel,
    maxTokens: 512,
    messages,
  });

  return result.text || "I'm not sure about that — let me connect you with our team.";
}
