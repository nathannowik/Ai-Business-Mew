import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { chat } from "../../ai/claude.js";
import { env } from "../../env.js";
import { prisma } from "../../db.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { sendEmail, sendSms } from "../../channels/send.js";
import { getReceptionistConfig } from "../receptionist/service.js";

export async function reviewManagementRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("review_management");

  app.get("/reviews", { preHandler: guard }, async (request) => {
    return prisma.review.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  });

  // Ask a customer for a review over SMS/email (falls back to simulation).
  const requestSchema = z.object({
    customerName: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    jobDescription: z.string().optional(),
    reviewLink: z.string().optional(),
  });

  app.post("/reviews/request", { preHandler: guard }, async (request, reply) => {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const organizationId = request.auth!.organizationId;
    const cfg = await getReceptionistConfig(organizationId);
    const { customerName, phone, email, jobDescription, reviewLink } = parsed.data;

    const result = await chat({
      model: env.receptionistModel,
      maxTokens: 300,
      system: `You write brief, warm review-request messages for ${cfg.businessName}. One or two sentences, thank the customer by name, and politely ask them to leave a review${reviewLink ? " at the provided link" : ""}. No emojis unless natural.`,
      messages: [
        {
          role: "user",
          content: `Customer: ${customerName}. Job: ${jobDescription ?? "recent service"}.${reviewLink ? ` Review link: ${reviewLink}` : ""}`,
        },
      ],
    });
    const message = result.text;

    let simulated = true;
    if (phone) simulated = (await sendSms(organizationId, phone, message)).simulated;
    else if (email)
      simulated = (await sendEmail(organizationId, email, "How did we do?", message)).simulated;

    return { message, simulated };
  });

  // Add/import a review (manual entry, or a stubbed monitoring feed).
  const addSchema = z.object({
    author: z.string().min(1),
    rating: z.number().int().min(1).max(5),
    text: z.string().min(1),
    source: z.string().optional(),
  });

  app.post("/reviews", { preHandler: guard }, async (request, reply) => {
    const parsed = addSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    return reply.code(201).send(
      await prisma.review.create({
        data: {
          organizationId: request.auth!.organizationId,
          author: parsed.data.author,
          rating: parsed.data.rating,
          text: parsed.data.text,
          source: parsed.data.source ?? "manual",
        },
      }),
    );
  });

  // Draft an AI response to a review.
  app.post<{ Params: { id: string } }>(
    "/reviews/:id/draft-response",
    { preHandler: guard },
    async (request, reply) => {
      const organizationId = request.auth!.organizationId;
      const review = await prisma.review.findFirst({
        where: { id: request.params.id, organizationId },
      });
      if (!review) return reply.code(404).send({ error: "Not found" });
      const cfg = await getReceptionistConfig(organizationId);

      const result = await chat({
        model: env.aiModel,
        maxTokens: 400,
        system: `You write public responses to customer reviews for ${cfg.businessName}. Be gracious and professional. Thank positive reviewers; for negative reviews, apologize sincerely, take responsibility without being defensive, and invite them to make it right offline. 2-4 sentences.`,
        messages: [
          {
            role: "user",
            content: `${review.rating}-star review from ${review.author}: "${review.text}"`,
          },
        ],
      });

      const updated = await prisma.review.update({
        where: { id: review.id },
        data: { draftResponse: result.text },
      });
      return updated;
    },
  );

  // Mark a review as responded (optionally with an edited response).
  app.post<{ Params: { id: string }; Body: { response?: string } }>(
    "/reviews/:id/respond",
    { preHandler: guard },
    async (request, reply) => {
      const r = await prisma.review.updateMany({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
        data: {
          status: "responded",
          ...(request.body?.response ? { draftResponse: request.body.response } : {}),
        },
      });
      if (r.count === 0) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );
}
