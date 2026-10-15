import { renderChatTemplate } from "./templates";
import type { AssembleConfig, ChatMessage, Conversation, ModelRequest, Settings } from "./types";

/**
 * Turn a mode's config and what the visitor has typed into the exact request
 * sent to the model. The inspector renders this object, and the capture
 * script sends it, so what you see is what the model got.
 *
 * Pure: no I/O, no randomness, no hidden defaults.
 */
export function assemble(config: AssembleConfig, conversation: Conversation): ModelRequest {
  switch (config.mode) {
    case "single": {
      const lastUser = messagesOf(conversation).findLast((m) => m.role === "user");
      if (!lastUser) throw new Error("Needs at least one user message");
      return chat(config.model, [copy(lastUser)], config.settings);
    }
    case "transcript":
      return chat(config.model, messagesOf(conversation).map(copy), config.settings);
    case "document":
      return completion(config.model, documentOf(conversation), config.settings);
    case "template": {
      const messages = messagesOf(conversation);
      const prompt = renderChatTemplate(config.templateId, messages, messages.at(-1)?.role === "user");
      return completion(config.model, prompt, config.settings);
    }
  }
}

function chat(model: string, messages: ChatMessage[], settings: Settings): ModelRequest {
  return { kind: "chat", path: "/v1/chat/completions", body: { model, messages, ...settings } };
}

function completion(model: string, prompt: string, settings: Settings): ModelRequest {
  return { kind: "completion", path: "/v1/completions", body: { model, prompt, ...settings } };
}

function documentOf(c: Conversation): string {
  if (!("document" in c)) throw new Error("This mode takes a document, not chat messages");
  return c.document;
}

function messagesOf(c: Conversation): ChatMessage[] {
  if (!("messages" in c)) throw new Error("This mode takes chat messages, not a document");
  return c.messages;
}

function copy(m: ChatMessage): ChatMessage {
  return { role: m.role, content: m.content };
}

/** The exact bytes of the HTTP request body. */
export function serializeBody(req: ModelRequest): string {
  return JSON.stringify(req.body);
}

/** Pull the generated text out of an OpenAI-compatible response, if present. */
export function responseText(response: unknown): string | undefined {
  const choice = (response as { choices?: Array<Record<string, unknown>> })?.choices?.[0];
  if (!choice) return undefined;
  if (typeof choice.text === "string") return choice.text;
  const msg = choice.message as { content?: unknown } | undefined;
  return typeof msg?.content === "string" ? msg.content : undefined;
}

export interface Usage {
  read?: number;
  wrote?: number;
  reasoning?: number;
  costUsd?: number;
}

/** Token counts and cost reported by an OpenAI-compatible response (OpenRouter adds `cost`). */
export function responseUsage(response: unknown): Usage | undefined {
  const u = (response as { usage?: Record<string, unknown> })?.usage;
  if (!u) return undefined;
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  const details = u.completion_tokens_details as Record<string, unknown> | undefined;
  return {
    read: num(u.prompt_tokens),
    wrote: num(u.completion_tokens),
    reasoning: num(details?.reasoning_tokens),
    costUsd: num(u.cost),
  };
}
