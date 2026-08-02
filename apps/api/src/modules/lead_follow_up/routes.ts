import type { FastifyInstance } from "fastify";
import { z } from "zod";
import twilio from "twilio";
import type { LeadFollowUpConfig } from "@mew/shared";
import { prisma } from "../../db.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { isEntitled } from "../../billing/service.js";
import { runLeadFollowUp } from "./controller.js";
import { runDripForOrg } from "./drip.js";
import {
  createLead,
  findLeadByPhone,
  getLead,
  getLeadFollowUpConfig,
  saveLeadFollowUpConfig,
} from "./service.js";

const configSchema = z.object({
  businessName: z.string().min(1),
  instructions: z.string(),
  qualificationCriteria: z.string(),
  preferredChannel: z.enum(["sms", "email", "form"]),
  enabled: z.boolean(),
  dripEnabled: z.boolean(),
  dripStepsDays: z.array(z.number().int().positive()).max(10),
});

const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  source: z.string().optional(),
  inquiry: z.string().nullable().optional(),
  /** When true, generate + "send" the first outreach immediately. */
  autoContact: z.boolean().optional(),
});

export async function leadFollowUpRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/lead-follow-up/config",
    { preHandler: authenticate },
    async (request) => getLeadFollowUpConfig(request.auth!.organizationId),
  );

  app.put(
    "/lead-follow-up/config",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = configSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      return saveLeadFollowUpConfig(
        request.auth!.organizationId,
        parsed.data as LeadFollowUpConfig,
      );
    },
  );

  app.get("/leads", { preHandler: authenticate }, async (request) => {
    return prisma.lead.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  });

  app.get<{ Params: { id: string } }>(
    "/leads/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const lead = await prisma.lead.findFirst({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (!lead) return reply.code(404).send({ error: "Not found" });
      return lead;
    },
  );

  // Create a lead from the dashboard; optionally fire the first outreach.
  app.post("/leads", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const d = parsed.data;
    const lead = await createLead({
      organizationId: request.auth!.organizationId,
      name: d.name,
      phone: d.phone,
      email: d.email,
      source: d.source ?? "manual",
      channel: d.phone ? "sms" : d.email ? "email" : "form",
      inquiry: d.inquiry,
    });
    if (d.autoContact) {
      const outcome = await runLeadFollowUp(lead.id, null);
      return reply.code(201).send({ lead: await getLead(lead.id), outcome });
    }
    return reply.code(201).send({ lead });
  });

  // Manually run the drip cycle now (also runs automatically on a schedule).
  app.post(
    "/lead-follow-up/run-drips",
    { preHandler: requireEntitlement("lead_follow_up") },
    async (request) => {
      const sent = await runDripForOrg(request.auth!.organizationId, { forceSimulate: true });
      return { sent };
    },
  );

  // Simulate a back-and-forth from the dashboard (no real SMS/email sent).
  const simSchema = z.object({
    leadId: z.string().optional(),
    message: z.string().optional(),
    // For the very first turn, you can seed a new lead inline.
    seed: createLeadSchema.omit({ autoContact: true }).optional(),
  });

  app.post(
    "/lead-follow-up/simulate",
    { preHandler: requireEntitlement("lead_follow_up") },
    async (request, reply) => {
      const parsed = simSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const organizationId = request.auth!.organizationId;
      let leadId = parsed.data.leadId;

      if (!leadId) {
        const seed = parsed.data.seed;
        if (!seed) return reply.code(400).send({ error: "seed or leadId required" });
        const lead = await createLead({
          organizationId,
          name: seed.name,
          phone: seed.phone,
          email: seed.email,
          source: seed.source ?? "simulator",
          channel: seed.phone ? "sms" : seed.email ? "email" : "form",
          inquiry: seed.inquiry,
        });
        leadId = lead.id;
      } else {
        const existing = await getLead(leadId);
        if (!existing || existing.organizationId !== organizationId) {
          return reply.code(404).send({ error: "Lead not found" });
        }
      }

      const outcome = await runLeadFollowUp(leadId, parsed.data.message ?? null, {
        forceSimulate: true,
      });
      return { leadId, ...outcome, lead: await getLead(leadId) };
    },
  );

  // Public intake webhook (e.g. a website contact form) → create + auto-contact.
  app.post<{ Params: { orgId: string } }>(
    "/webhooks/leads/:orgId",
    async (request, reply) => {
      const parsed = createLeadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const org = await prisma.organization.findUnique({
        where: { id: request.params.orgId },
      });
      if (!org) return reply.code(404).send({ error: "Unknown organization" });

      const d = parsed.data;
      const lead = await createLead({
        organizationId: org.id,
        name: d.name,
        phone: d.phone,
        email: d.email,
        source: d.source ?? "web_form",
        channel: d.phone ? "sms" : d.email ? "email" : "form",
        inquiry: d.inquiry,
      });
      // Capture the lead regardless, but only auto-contact if the plan includes it.
      if (await isEntitled(org.id, "lead_follow_up")) {
        await runLeadFollowUp(lead.id, null);
      }
      return reply.code(201).send({ ok: true, leadId: lead.id });
    },
  );

  // Inbound SMS from a lead (Twilio Messaging webhook) → AI replies via SMS.
  app.post<{ Querystring: { orgId?: string }; Body: { From?: string; Body?: string } }>(
    "/webhooks/twilio/sms",
    async (request, reply) => {
      const from = request.body?.From;
      const text = (request.body?.Body ?? "").trim();
      const twiml = new twilio.twiml.MessagingResponse();

      if (!from || !text || !request.query.orgId) {
        return reply.type("text/xml").send(twiml.toString());
      }
      if (!(await isEntitled(request.query.orgId, "lead_follow_up"))) {
        return reply.type("text/xml").send(twiml.toString());
      }

      let lead = await findLeadByPhone(request.query.orgId, from);
      if (!lead) {
        lead = await createLead({
          organizationId: request.query.orgId,
          name: from,
          phone: from,
          source: "inbound_sms",
          channel: "sms",
        });
      }

      const outcome = await runLeadFollowUp(lead.id, text, { forceSimulate: true });
      // Reply inline via TwiML rather than a separate outbound API call.
      twiml.message(outcome.reply);
      return reply.type("text/xml").send(twiml.toString());
    },
  );
}
