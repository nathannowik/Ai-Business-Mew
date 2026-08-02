import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { chat } from "../../ai/claude.js";
import { env } from "../../env.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { getKnowledgeContext } from "../receptionist/service.js";

/**
 * Internal-facing chatbot for staff. Answers from the org's full knowledge base
 * (including internal policies/SOPs). Stateless: the client sends the running
 * history, so there's nothing sensitive persisted server-side.
 */
export async function employeeKnowledgeBaseRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("knowledge_base");

  const chatSchema = z.object({
    message: z.string().min(1),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
      .optional(),
  });

  app.post("/employee-kb/chat", { preHandler: guard }, async (request, reply) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const organizationId = request.auth!.organizationId;
    const knowledge = await getKnowledgeContext(organizationId, { includeInternal: true });

    const system = [
      "You are an internal knowledge assistant for company employees. Answer staff questions about policies, procedures, SOPs, pricing, and services using the company information below.",
      "Be direct and practical. If the answer isn't in the information, say so and suggest who might know — do not invent policy.",
      knowledge
        ? `<company_information>\n${knowledge}\n</company_information>`
        : "No company documents have been added yet.",
    ].join("\n\n");

    const messages = [
      ...(parsed.data.history ?? []).map((t) => ({ role: t.role, content: t.text })),
      { role: "user" as const, content: parsed.data.message },
    ];

    const result = await chat({
      system,
      model: env.aiModel,
      maxTokens: 700,
      messages,
    });
    return { reply: result.text || "I'm not sure — check with a manager." };
  });
}
