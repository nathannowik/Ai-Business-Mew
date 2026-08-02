import type { LeadFollowUpConfig, LeadMessage, LeadStatus } from "@mew/shared";
import { chat, type Anthropic, type ChatMessage } from "../../ai/claude.js";
import { env } from "../../env.js";
import { bookAppointment, getKnowledgeContext } from "../receptionist/service.js";

export interface LeadTurnResult {
  reply: string;
  /** New status the agent decided, if any (qualified / booked / lost). */
  status?: LeadStatus;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "book_appointment",
    description:
      "Book the job once the lead agreed to a specific date and time. Requires their name and a start time.",
    input_schema: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        startsAtISO: { type: "string", description: "ISO 8601 start time." },
        durationMinutes: { type: "number" },
        notes: { type: "string" },
      },
      required: ["customerName", "startsAtISO"],
    },
  },
  {
    name: "mark_qualified",
    description:
      "Mark the lead as qualified once they meet the qualification criteria but aren't booked yet.",
    input_schema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  },
  {
    name: "mark_lost",
    description:
      "Mark the lead as lost/not a fit (e.g. outside service area, not interested).",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
];

interface LeadContext {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  inquiry: string | null;
  channel: string;
}

function buildSystemPrompt(
  lead: LeadContext,
  config: LeadFollowUpConfig,
  knowledge: string,
): string {
  const nowISO = new Date().toISOString();
  const channelHint =
    lead.channel === "email"
      ? "You are writing emails; a slightly longer, friendly-professional tone is fine."
      : "You are texting (SMS); keep messages very short and conversational.";
  return [
    `You are the AI lead follow-up assistant for ${config.businessName}. Your job: respond to new leads instantly, qualify them, and book the job.`,
    channelHint,
    `Lead: name "${lead.name}"${lead.inquiry ? `, inquiry: "${lead.inquiry}"` : ""}.`,
    `The current date and time is ${nowISO}. Resolve relative times against this.`,
    `Qualification criteria: ${config.qualificationCriteria}`,
    config.instructions ? `Business instructions:\n${config.instructions}` : "",
    knowledge
      ? `Use this business information to answer questions; don't invent prices or policies:\n<business_information>\n${knowledge}\n</business_information>`
      : "",
    `Be proactive: acknowledge their inquiry, ask one qualifying question at a time, and steer toward booking a time. Use mark_qualified / mark_lost / book_appointment as the situation warrants.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function toChatMessages(messages: LeadMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.text,
  }));
}

/**
 * Produce the next outbound message for a lead. `incomingText` is null for the
 * very first outreach; otherwise it's what the lead just said. Executes booking
 * via tools and returns a status change if the agent decided one. Does NOT send
 * or persist messages — the orchestrator does that.
 */
export async function runLeadAgent(
  lead: LeadContext,
  config: LeadFollowUpConfig,
  history: LeadMessage[],
  incomingText: string | null,
): Promise<LeadTurnResult> {
  const knowledge = await getKnowledgeContext(lead.organizationId);
  const system = buildSystemPrompt(lead, config, knowledge);

  const working: Anthropic.MessageParam[] = toChatMessages(history).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (incomingText) {
    working.push({ role: "user", content: incomingText });
  } else {
    working.push({
      role: "user",
      content:
        "[A new lead just came in. Write the first outreach message to them now.]",
    });
  }

  let replyText = "";
  let status: LeadStatus | undefined;

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
          content = "Invalid date; ask the lead to restate the time.";
        } else {
          const appt = await bookAppointment({
            organizationId: lead.organizationId,
            customerName: input.customerName,
            customerPhone: lead.phone,
            startsAt,
            durationMinutes: input.durationMinutes,
            notes: input.notes ?? lead.inquiry,
          });
          status = "booked";
          content = `Booked appointment ${appt.id} at ${startsAt.toISOString()}. Confirm it warmly.`;
        }
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content });
      } else if (tool.name === "mark_qualified") {
        if (status !== "booked") status = "qualified";
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: "Noted as qualified. Continue toward booking a time.",
        });
      } else if (tool.name === "mark_lost") {
        if (status !== "booked") status = "lost";
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: "Noted as lost. Send a brief, polite closing message.",
        });
      }
    }
    working.push({ role: "user", content: toolResults });
  }

  if (!replyText) {
    replyText = "Thanks for reaching out! Could you tell me a bit more about what you need?";
  }
  return { reply: replyText, status };
}
