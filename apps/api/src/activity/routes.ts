import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { listActivity, markAllRead, unreadCount } from "./service.js";

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/activity", { preHandler: authenticate }, async (request) => {
    return listActivity(request.auth!.organizationId);
  });

  app.get("/activity/unread-count", { preHandler: authenticate }, async (request) => {
    return { count: await unreadCount(request.auth!.organizationId) };
  });

  app.post("/activity/read", { preHandler: authenticate }, async (request) => {
    await markAllRead(request.auth!.organizationId);
    return { ok: true };
  });
}
