import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get("/leads/export.csv", { preHandler: authenticate }, async (request, reply) => {
    const leads = await prisma.lead.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { createdAt: "desc" },
    });
    const csv = toCsv(
      ["Name", "Phone", "Email", "Status", "Source", "Inquiry", "Created"],
      leads.map((l) => [l.name, l.phone, l.email, l.status, l.source, l.inquiry, l.createdAt.toISOString()]),
    );
    return reply
      .type("text/csv")
      .header("Content-Disposition", 'attachment; filename="leads.csv"')
      .send(csv);
  });

  app.get("/appointments/export.csv", { preHandler: authenticate }, async (request, reply) => {
    const appts = await prisma.appointment.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { startsAt: "asc" },
    });
    const csv = toCsv(
      ["Customer", "Phone", "Starts At", "Duration (min)", "Source", "Notes"],
      appts.map((a) => [a.customerName, a.customerPhone, a.startsAt.toISOString(), a.durationMinutes, a.source, a.notes]),
    );
    return reply
      .type("text/csv")
      .header("Content-Disposition", 'attachment; filename="appointments.csv"')
      .send(csv);
  });
}
