import type { FastifyInstance } from "fastify";
import twilio from "twilio";
import { env } from "../../env.js";
import { prisma } from "../../db.js";
import { isEntitled } from "../../billing/service.js";
import { runReceptionistTurn } from "./agent.js";
import {
  endCall,
  getReceptionistConfig,
  startCall,
} from "./service.js";

const { VoiceResponse } = twilio.twiml;

interface TwilioVoiceBody {
  CallSid?: string;
  From?: string;
  To?: string;
  SpeechResult?: string;
}

/** Resolve which organization owns the number the caller dialed. */
async function resolveOrganizationId(
  toNumber: string | undefined,
  orgIdParam: string | undefined,
): Promise<string | null> {
  if (orgIdParam) return orgIdParam;
  if (!toNumber) return null;
  const integration = await prisma.integration.findFirst({
    where: {
      provider: "twilio",
      config: { path: ["phoneNumber"], equals: toNumber },
    },
  });
  return integration?.organizationId ?? null;
}

function gatherUrl(callId: string): string {
  return `${env.publicApiUrl}/webhooks/twilio/voice/turn?callId=${callId}`;
}

export async function registerTwilioWebhooks(app: FastifyInstance): Promise<void> {
  // Incoming call → greet and start gathering speech.
  app.post<{ Querystring: { orgId?: string }; Body: TwilioVoiceBody }>(
    "/webhooks/twilio/voice/incoming",
    async (request, reply) => {
      const body = request.body ?? {};
      const organizationId = await resolveOrganizationId(
        body.To,
        request.query.orgId,
      );
      const twiml = new VoiceResponse();

      if (!organizationId) {
        twiml.say("This number is not configured. Goodbye.");
        twiml.hangup();
        return reply.type("text/xml").send(twiml.toString());
      }

      const config = await getReceptionistConfig(organizationId);
      if (!config.enabled || !(await isEntitled(organizationId, "receptionist"))) {
        twiml.say("Sorry, we cannot take your call right now. Goodbye.");
        twiml.hangup();
        return reply.type("text/xml").send(twiml.toString());
      }

      const call = await startCall({
        organizationId,
        fromNumber: body.From ?? "unknown",
        toNumber: body.To ?? env.twilio.phoneNumber,
        externalId: body.CallSid,
      });

      const gather = twiml.gather({
        input: ["speech"],
        action: gatherUrl(call.id),
        method: "POST",
        speechTimeout: "auto",
      });
      gather.say(config.greeting);
      // If they say nothing, re-prompt.
      twiml.redirect(gatherUrl(call.id));

      return reply.type("text/xml").send(twiml.toString());
    },
  );

  // Each conversational turn.
  app.post<{ Querystring: { callId: string }; Body: TwilioVoiceBody }>(
    "/webhooks/twilio/voice/turn",
    async (request, reply) => {
      const { callId } = request.query;
      const speech = (request.body?.SpeechResult ?? "").trim();
      const twiml = new VoiceResponse();

      if (!speech) {
        const gather = twiml.gather({
          input: ["speech"],
          action: gatherUrl(callId),
          method: "POST",
          speechTimeout: "auto",
        });
        gather.say("Are you still there? How can I help?");
        twiml.hangup();
        return reply.type("text/xml").send(twiml.toString());
      }

      const { reply: text, action } = await runReceptionistTurn(callId, speech);
      twiml.say(text);

      if (action.type === "transfer") {
        await endCall(callId, "transferred");
        twiml.dial(action.number);
      } else if (action.type === "hangup") {
        await endCall(callId, "completed");
        twiml.hangup();
      } else {
        const gather = twiml.gather({
          input: ["speech"],
          action: gatherUrl(callId),
          method: "POST",
          speechTimeout: "auto",
        });
        // Keep listening for the caller's next utterance.
        gather.pause({ length: 1 });
      }

      return reply.type("text/xml").send(twiml.toString());
    },
  );
}
