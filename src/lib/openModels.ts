import { renderChatTemplate, specialTokens } from "./templates";
import type { ChatMessage, ModelRequest } from "./types";

/**
 * Open chat models whose real chat template we have, so we can show the exact
 * text the model reads. Model id (as the provider names it) → template id.
 */
export const openModels = [
  {
    model: "meta-llama/llama-3.1-8b-instruct",
    templateId: "meta-llama/Llama-3.1-8B-Instruct",
    label: "Llama 3.1 8B Instruct",
  },
] as const;

export const DEFAULT_OPEN_MODEL = openModels[0].model;

export function openModelFor(model: string) {
  return openModels.find((m) => m.model === model);
}

/**
 * For a chat request to an open model: the text that model reads, rendered
 * from its published chat template. Undefined for models whose format isn't public.
 */
export function modelReads(request: ModelRequest): { text: string; tokens: string[] } | undefined {
  if (request.kind !== "chat") return undefined;
  const open = openModelFor(request.body.model);
  if (!open) return undefined;
  const messages: ChatMessage[] = request.body.messages;
  return {
    text: renderChatTemplate(open.templateId, messages, messages.at(-1)?.role === "user"),
    tokens: specialTokens(open.templateId),
  };
}
