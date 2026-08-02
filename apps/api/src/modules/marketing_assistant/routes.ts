import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { chat } from "../../ai/claude.js";
import { env } from "../../env.js";
import { prisma } from "../../db.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { getKnowledgeContext } from "../receptionist/service.js";

const CONTENT_GUIDANCE: Record<string, string> = {
  social: "a short, engaging social media post with a call to action and 1-3 relevant hashtags",
  email: "a marketing email with a compelling subject line (as the first line, prefixed 'Subject: ') and a friendly body",
  ad: "a punchy paid ad: a headline, 2-3 short body lines, and a call to action",
  blog: "a blog post of 3-5 short paragraphs with an H1-style title on the first line",
};

export async function marketingAssistantRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("marketing_assistant");

  app.get("/marketing/content", { preHandler: guard }, async (request) => {
    return prisma.contentPiece.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  const genSchema = z.object({
    contentType: z.enum(["social", "email", "ad", "blog"]),
    topic: z.string().min(1),
    tone: z.string().optional(),
  });

  app.post("/marketing/generate", { preHandler: guard }, async (request, reply) => {
    const parsed = genSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const organizationId = request.auth!.organizationId;
    const { contentType, topic } = parsed.data;
    const tone = parsed.data.tone || "professional";
    const knowledge = await getKnowledgeContext(organizationId);

    const result = await chat({
      model: env.aiModel,
      maxTokens: 800,
      system: `You are a marketing copywriter for a local business. Write ${CONTENT_GUIDANCE[contentType]}. Tone: ${tone}. Use the business information for accurate details; never invent prices or claims not supported by it.${knowledge ? `\n\n<business_information>\n${knowledge}\n</business_information>` : ""}`,
      messages: [{ role: "user", content: `Topic: ${topic}` }],
    });

    const body = result.text;
    const title = body.split("\n")[0].replace(/^#+\s*/, "").replace(/^Subject:\s*/i, "").slice(0, 120);

    const piece = await prisma.contentPiece.create({
      data: { organizationId, contentType, topic, tone, title, body },
    });
    return reply.code(201).send(piece);
  });

  app.delete<{ Params: { id: string } }>(
    "/marketing/content/:id",
    { preHandler: guard },
    async (request, reply) => {
      const r = await prisma.contentPiece.deleteMany({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (r.count === 0) return reply.code(404).send({ error: "Not found" });
      return reply.code(204).send();
    },
  );
}
