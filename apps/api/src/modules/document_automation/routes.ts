import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { chat } from "../../ai/claude.js";
import { env } from "../../env.js";
import { prisma } from "../../db.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { getKnowledgeContext } from "../receptionist/service.js";
import { renderPdf } from "./pdf.js";

export async function documentAutomationRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("document_automation");

  app.get("/documents", { preHandler: guard }, async (request) => {
    return prisma.document.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  app.get<{ Params: { id: string } }>(
    "/documents/:id",
    { preHandler: guard },
    async (request, reply) => {
      const doc = await prisma.document.findFirst({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (!doc) return reply.code(404).send({ error: "Not found" });
      return doc;
    },
  );

  const genSchema = z.object({
    docType: z.enum(["quote", "proposal", "invoice", "contract"]),
    customerName: z.string().min(1),
    details: z.string().min(1),
  });

  app.post("/documents/generate", { preHandler: guard }, async (request, reply) => {
    const parsed = genSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const organizationId = request.auth!.organizationId;
    const { docType, customerName, details } = parsed.data;
    const knowledge = await getKnowledgeContext(organizationId);

    const result = await chat({
      model: env.aiModel,
      maxTokens: 1200,
      system: `You draft professional business documents for a local service business. Produce a clean, ready-to-send ${docType} addressed to ${customerName}. Use the business information for company name, services, and pricing. If a specific price or figure isn't available, use a clear bracketed placeholder like [PRICE]. Output plain text with clear sections and line items where relevant — no markdown code fences.${knowledge ? `\n\n<business_information>\n${knowledge}\n</business_information>` : ""}`,
      messages: [{ role: "user", content: `Details for the ${docType}: ${details}` }],
    });

    const title = `${docType[0].toUpperCase()}${docType.slice(1)} — ${customerName}`;
    const doc = await prisma.document.create({
      data: { organizationId, docType, title, customerName, content: result.text },
    });
    return reply.code(201).send(doc);
  });

  // Download a document as a PDF.
  app.get<{ Params: { id: string } }>(
    "/documents/:id/pdf",
    { preHandler: guard },
    async (request, reply) => {
      const doc = await prisma.document.findFirst({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (!doc) return reply.code(404).send({ error: "Not found" });

      const pdf = await renderPdf({
        title: doc.title,
        subtitle: new Date(doc.createdAt).toLocaleDateString(),
        content: doc.content,
      });
      return reply
        .type("application/pdf")
        .header("Content-Disposition", `attachment; filename="${doc.docType}-${doc.id}.pdf"`)
        .send(pdf);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/documents/:id",
    { preHandler: guard },
    async (request, reply) => {
      const r = await prisma.document.deleteMany({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (r.count === 0) return reply.code(404).send({ error: "Not found" });
      return reply.code(204).send();
    },
  );
}
