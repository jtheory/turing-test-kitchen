import { renderChatTemplate } from "./templates";
import type { ChatMessage, Conversation, LayerConfig, ModelRequest } from "./types";

/**
 * Turn a layer's config and what the visitor has typed into the exact request
 * sent to the model. The inspector renders this object, and the capture
 * script sends it, so what you see is what the model got.
 *
 * Pure: no I/O, no randomness, no hidden defaults.
 */
export function assemble(config: LayerConfig, conversation: Conversation): ModelRequest {
  switch (config.layer) {
    case 1: {
      return {
        kind: "completion",
        path: "/v1/completions",
        body: { model: config.model, prompt: documentOf(conversation), ...config.settings },
      };
    }
    case 2: {
      const messages = messagesOf(conversation);
      const last = messages.at(-1);
      const prompt = renderChatTemplate(config.templateId, messages, last?.role === "user");
      return {
        kind: "completion",
        path: "/v1/completions",
        body: { model: config.model, prompt, ...config.settings },
      };
    }
    case 3: {
      const lastUser = messagesOf(conversation).findLast((m) => m.role === "user");
      if (!lastUser) throw new Error("Layer 3 needs at least one user message");
      return {
        kind: "chat",
        path: "/v1/chat/completions",
        body: { model: config.model, messages: [copy(lastUser)], ...config.settings },
      };
    }
    case 4: {
      return {
        kind: "chat",
        path: "/v1/chat/completions",
        body: { model: config.model, messages: messagesOf(conversation).map(copy), ...config.settings },
      };
    }
  }
}

function documentOf(c: Conversation): string {
  if (!("document" in c)) throw new Error("Layer 1 takes a document, not chat messages");
  return c.document;
}

function messagesOf(c: Conversation): ChatMessage[] {
  if (!("messages" in c)) throw new Error("This layer takes chat messages, not a document");
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
