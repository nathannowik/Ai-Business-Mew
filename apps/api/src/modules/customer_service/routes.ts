import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ChatTurn, CustomerServiceConfig } from "@mew/shared";
import { prisma } from "../../db.js";
import { env } from "../../env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { runSupportChat } from "./agent.js";
import {
  appendChatTurns,
  getChatTurns,
  getCustomerServiceConfig,
  getOrCreateSession,
  saveCustomerServiceConfig,
} from "./service.js";

const configSchema = z.object({
  businessName: z.string().min(1),
  greeting: z.string().min(1),
  instructions: z.string(),
  enabled: z.boolean(),
});

export async function customerServiceRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/customer-service/config",
    { preHandler: authenticate },
    async (request) => getCustomerServiceConfig(request.auth!.organizationId),
  );

  app.put(
    "/customer-service/config",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = configSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      return saveCustomerServiceConfig(
        request.auth!.organizationId,
        parsed.data as CustomerServiceConfig,
      );
    },
  );

  app.get(
    "/customer-service/sessions",
    { preHandler: authenticate },
    async (request) => {
      return prisma.chatSession.findMany({
        where: { organizationId: request.auth!.organizationId },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
    },
  );

  // --- Public chat endpoint (used by the website widget; no auth) ---
  const chatSchema = z.object({
    sessionId: z.string().optional(),
    message: z.string().min(1),
  });

  app.post<{ Params: { orgId: string } }>(
    "/public/chat/:orgId",
    async (request, reply) => {
      const parsed = chatSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const org = await prisma.organization.findUnique({
        where: { id: request.params.orgId },
      });
      if (!org) return reply.code(404).send({ error: "Unknown organization" });

      const config = await getCustomerServiceConfig(org.id);
      if (!config.enabled) {
        return reply.code(403).send({ error: "Chat is not enabled" });
      }

      const session = await getOrCreateSession(org.id, parsed.data.sessionId);
      const history = getChatTurns(session);

      const reply_ = await runSupportChat(
        org.id,
        config,
        history,
        parsed.data.message,
      );

      const now = new Date().toISOString();
      const turns: ChatTurn[] = [
        { role: "user", text: parsed.data.message, at: now },
        { role: "assistant", text: reply_, at: new Date().toISOString() },
      ];
      await appendChatTurns(session.id, turns);

      return { sessionId: session.id, reply: reply_ };
    },
  );

  // Public greeting so the widget can show it before the first message.
  app.get<{ Params: { orgId: string } }>(
    "/public/chat/:orgId/greeting",
    async (request, reply) => {
      const config = await getCustomerServiceConfig(request.params.orgId);
      if (!config.enabled) return reply.code(403).send({ error: "disabled" });
      return { greeting: config.greeting, businessName: config.businessName };
    },
  );

  // Embeddable widget script. Clients paste one <script> tag on their site.
  app.get("/widget.js", async (_request, reply) => {
    reply.type("application/javascript");
    return WIDGET_JS.replace("__API_BASE__", env.publicApiUrl);
  });
}

// A self-contained floating chat widget. Reads the org id from its script src
// query (?org=...). No external dependencies.
const WIDGET_JS = `(function(){
  var API="__API_BASE__";
  var s=document.currentScript;
  var org=(s&&s.src.split("org=")[1]||"").split("&")[0];
  if(!org){console.error("[mew-widget] missing ?org= in script src");return;}
  var sessionId=null, open=false;
  var btn=document.createElement("div");
  btn.innerHTML="\\u{1F4AC}";
  btn.style.cssText="position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#4f46e5;color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:99999";
  var panel=document.createElement("div");
  panel.style.cssText="position:fixed;bottom:88px;right:20px;width:340px;max-width:90vw;height:460px;max-height:70vh;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:system-ui,sans-serif";
  panel.innerHTML='<div style="background:#4f46e5;color:#fff;padding:14px 16px;font-weight:600">Chat with us</div><div id="mew-msgs" style="flex:1;overflow-y:auto;padding:12px;font-size:14px"></div><div style="display:flex;border-top:1px solid #eee"><input id="mew-in" placeholder="Type a message..." style="flex:1;border:0;padding:12px;font-size:14px;outline:none"/><button id="mew-send" style="border:0;background:#4f46e5;color:#fff;padding:0 16px;cursor:pointer">Send</button></div>';
  document.body.appendChild(btn);document.body.appendChild(panel);
  var msgs=panel.querySelector("#mew-msgs");
  function add(role,text){var d=document.createElement("div");d.style.cssText="margin:6px 0;display:flex;"+(role==="user"?"justify-content:flex-end":"justify-content:flex-start");var b=document.createElement("div");b.textContent=text;b.style.cssText="max-width:80%;padding:8px 12px;border-radius:14px;"+(role==="user"?"background:#4f46e5;color:#fff":"background:#f1f5f9;color:#0f172a");d.appendChild(b);msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;}
  btn.onclick=function(){open=!open;panel.style.display=open?"flex":"none";if(open&&!sessionId){fetch(API+"/public/chat/"+org+"/greeting").then(function(r){return r.json()}).then(function(g){if(g.greeting)add("assistant",g.greeting)}).catch(function(){});}};
  function send(){var i=panel.querySelector("#mew-in");var t=i.value.trim();if(!t)return;i.value="";add("user",t);fetch(API+"/public/chat/"+org,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:sessionId,message:t})}).then(function(r){return r.json()}).then(function(d){sessionId=d.sessionId;add("assistant",d.reply||"...")}).catch(function(){add("assistant","Sorry, something went wrong.")});}
  panel.querySelector("#mew-send").onclick=send;
  panel.querySelector("#mew-in").addEventListener("keydown",function(e){if(e.key==="Enter")send();});
})();`;
