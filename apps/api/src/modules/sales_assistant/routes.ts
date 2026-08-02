import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { SalesCallAnalysis } from "@mew/shared";
import { chat } from "../../ai/claude.js";
import { env } from "../../env.js";
import { prisma } from "../../db.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";

function safeParseAnalysis(text: string): { analysis: SalesCallAnalysis | null; followUpDraft: string | null } {
  try {
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json);
    return {
      analysis: {
        score: Number(parsed.score) || 0,
        summary: String(parsed.summary ?? ""),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : [],
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String) : [],
      },
      followUpDraft: parsed.followUpDraft ? String(parsed.followUpDraft) : null,
    };
  } catch {
    return { analysis: null, followUpDraft: null };
  }
}

export async function salesAssistantRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("sales_assistant");

  // --- Call analysis / coaching ---
  app.get("/sales/calls", { preHandler: guard }, async (request) => {
    return prisma.salesCall.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  const analyzeSchema = z.object({
    title: z.string().min(1),
    transcript: z.string().min(1),
  });

  app.post("/sales/analyze", { preHandler: guard }, async (request, reply) => {
    const parsed = analyzeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const result = await chat({
      model: env.aiModel,
      maxTokens: 1000,
      system:
        "You are a sales coach. Analyze the sales-call transcript and respond with ONLY a JSON object (no prose, no code fences) with keys: " +
        '"score" (integer 1-100 for overall call quality), "summary" (2-3 sentences), ' +
        '"strengths" (array of short strings), "improvements" (array of short strings), ' +
        '"nextSteps" (array of short concrete actions), "followUpDraft" (a short follow-up email/text to the prospect).',
      messages: [{ role: "user", content: parsed.data.transcript }],
    });

    const { analysis, followUpDraft } = safeParseAnalysis(result.text);
    const call = await prisma.salesCall.create({
      data: {
        organizationId: request.auth!.organizationId,
        title: parsed.data.title,
        transcript: parsed.data.transcript,
        analysis: (analysis as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        followUpDraft,
      },
    });
    return reply.code(201).send(call);
  });

  // --- Opportunity pipeline ---
  app.get("/sales/opportunities", { preHandler: guard }, async (request) => {
    return prisma.opportunity.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  });

  const oppCreate = z.object({
    name: z.string().min(1),
    stage: z.enum(["new", "qualified", "proposal", "won", "lost"]).optional(),
    value: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
  });

  app.post("/sales/opportunities", { preHandler: guard }, async (request, reply) => {
    const parsed = oppCreate.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    return reply.code(201).send(
      await prisma.opportunity.create({
        data: {
          organizationId: request.auth!.organizationId,
          name: parsed.data.name,
          stage: parsed.data.stage ?? "new",
          value: parsed.data.value ?? null,
          notes: parsed.data.notes ?? null,
        },
      }),
    );
  });

  const oppUpdate = z.object({
    name: z.string().min(1).optional(),
    stage: z.enum(["new", "qualified", "proposal", "won", "lost"]).optional(),
    value: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
  });

  app.patch<{ Params: { id: string } }>(
    "/sales/opportunities/:id",
    { preHandler: guard },
    async (request, reply) => {
      const parsed = oppUpdate.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const r = await prisma.opportunity.updateMany({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
        data: parsed.data,
      });
      if (r.count === 0) return reply.code(404).send({ error: "Not found" });
      return prisma.opportunity.findUnique({ where: { id: request.params.id } });
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/sales/opportunities/:id",
    { preHandler: guard },
    async (request, reply) => {
      const r = await prisma.opportunity.deleteMany({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (r.count === 0) return reply.code(404).send({ error: "Not found" });
      return reply.code(204).send();
    },
  );
}
