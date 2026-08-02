import type { CallTurn } from "@mew/shared";
import { chat, type Anthropic, type ChatMessage } from "../../ai/claude.js";
import { env } from "../../env.js";
import {
  appendTurns,
  bookAppointment,
  getCall,
  getKnowledgeContext,
  getReceptionistConfig,
  getTranscript,
} from "./service.js";

/** What the caller-facing channel (Twilio/simulator) should do after a turn. */
export type ReceptionistAction =
  | { type: "speak" }
  | { type: "transfer"; number: string }
  | { type: "hangup" };

export interface TurnResult {
  reply: string;
  action: ReceptionistAction;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "book_appointment",
    description:
      "Book an appointment once you have the customer's name and a specific date and time they agreed to.",
    input_schema: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        startsAtISO: {
          type: "string",
          description: "The appointment start time in ISO 8601 format.",
        },
        durationMinutes: { type: "number" },
        notes: { type: "string", description: "Reason for the visit / any details." },
      },
      required: ["customerName", "startsAtISO"],
    },
  },
  {
    name: "transfer_call",
    description:
      "Transfer the caller to a human when they explicitly ask, or when the request is outside what you can handle.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
  {
    name: "end_call",
    description:
      "Politely end the call when the caller's needs are met and they are ready to hang up.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
];

function buildSystemPrompt(
  config: Awaited<ReturnType<typeof getReceptionistConfig>>,
  knowledge: string,
  callerNumber: string,
): string {
  const nowISO = new Date().toISOString();
  return [
    `You are the AI phone receptionist for ${config.businessName}.`,
    `You are speaking with a caller on the phone (their number is ${callerNumber}). Keep replies short, warm, and natural — one or two sentences, since they are spoken aloud.`,
    `Business hours: ${config.businessHours}.`,
    `The current date and time is ${nowISO}. Resolve relative times like "tomorrow at 3" against this.`,
    config.transferNumber
      ? `If you need to transfer, a human is reachable at ${config.transferNumber}.`
      : `There is no human transfer number configured; if a transfer is requested, take a message and offer a callback instead.`,
    config.instructions ? `Extra instructions from the business:\n${config.instructions}` : "",
    knowledge
      ? `Use the following business information to answer questions. If the answer isn't here, say you'll have someone follow up.\n\n<business_information>\n${knowledge}\n</business_information>`
      : `You have no business knowledge base loaded yet, so for detailed questions offer to take a message.`,
    `Never invent prices, availability, or policies that aren't in your information. Confirm details (name, time) before booking.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function transcriptToMessages(transcript: CallTurn[]): ChatMessage[] {
  return transcript.map((t) => ({
    role: t.role === "caller" ? "user" : "assistant",
    content: t.text,
  }));
}

/**
 * Run one turn of the receptionist conversation.
 * Persists both the caller's utterance and the assistant's reply to the call
 * transcript, executes any tool calls (booking), and returns what the phone
 * channel should do next (speak / transfer / hangup).
 */
export async function runReceptionistTurn(
  callId: string,
  callerText: string,
): Promise<TurnResult> {
  const call = await getCall(callId);
  if (!call) throw new Error(`Call ${callId} not found`);

  const config = await getReceptionistConfig(call.organizationId);
  const knowledge = await getKnowledgeContext(call.organizationId);
  const system = buildSystemPrompt(config, knowledge, call.fromNumber);

  const transcript = getTranscript(call);
  const messages: ChatMessage[] = transcriptToMessages(transcript);
  messages.push({ role: "user", content: callerText });

  // Persist the caller's turn immediately.
  const now = new Date().toISOString();
  await appendTurns(callId, [{ role: "caller", text: callerText, at: now }]);

  let action: ReceptionistAction = { type: "speak" };
  let replyText = "";

  // Tool loop: allow the model to call tools then produce a spoken reply.
  const working: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < 4; i++) {
    const result = await chat({
      system,
      model: env.receptionistModel,
      maxTokens: 512,
      tools: TOOLS,
      messages: working.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
    });

    if (result.text) replyText = result.text;

    if (result.toolUses.length === 0) break;

    // Record the assistant's tool-use block so the follow-up has context.
    working.push({ role: "assistant", content: result.raw.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tool of result.toolUses) {
      if (tool.name === "book_appointment") {
        const input = tool.input as {
          customerName: string;
          startsAtISO: string;
          durationMinutes?: number;
          notes?: string;
        };
        const startsAt = new Date(input.startsAtISO);
        let content: string;
        if (Number.isNaN(startsAt.getTime())) {
          content = "Invalid date; ask the caller to restate the time.";
        } else {
          const appt = await bookAppointment({
            organizationId: call.organizationId,
            customerName: input.customerName,
            customerPhone: call.fromNumber,
            startsAt,
            durationMinutes: input.durationMinutes,
            notes: input.notes,
          });
          content = `Booked appointment ${appt.id} for ${input.customerName} at ${startsAt.toISOString()}.`;
        }
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content });
      } else if (tool.name === "transfer_call") {
        if (config.transferNumber) {
          action = { type: "transfer", number: config.transferNumber };
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: config.transferNumber
            ? "Transfer initiated. Say a brief closing line before the transfer."
            : "No transfer number configured. Offer to take a message instead.",
        });
      } else if (tool.name === "end_call") {
        action = { type: "hangup" };
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: "Say a short, warm goodbye.",
        });
      }
    }

    working.push({ role: "user", content: toolResults });
  }

  if (!replyText) {
    replyText = "I'm sorry, I didn't catch that. Could you say it again?";
  }

  await appendTurns(callId, [
    { role: "assistant", text: replyText, at: new Date().toISOString() },
  ]);

  return { reply: replyText, action };
}
