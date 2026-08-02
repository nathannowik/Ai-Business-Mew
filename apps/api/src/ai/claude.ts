import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env.js";

/**
 * Thin wrapper around the Anthropic SDK so the rest of the codebase never
 * touches the client directly. Returns null-safe helpers and centralizes the
 * "AI not configured" behavior.
 */

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!env.aiEnabled) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. AI features are disabled — add it to .env.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return client;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  system: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  tools?: Anthropic.Tool[];
}

export interface ChatResult {
  /** Concatenated text output. */
  text: string;
  /** Any tool calls the model requested this turn. */
  toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  stopReason: string | null;
  raw: Anthropic.Message;
}

/** One request/response turn with Claude, with optional tool use. */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const message = await getClient().messages.create({
    model: opts.model ?? env.aiModel,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    tools: opts.tools,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const toolUses = message.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({
      id: b.id,
      name: b.name,
      input: (b.input ?? {}) as Record<string, unknown>,
    }));

  return { text, toolUses, stopReason: message.stop_reason, raw: message };
}

export { Anthropic };
