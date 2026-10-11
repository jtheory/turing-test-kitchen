import { Template } from "@huggingface/jinja";
import data from "../data/chat-templates.json";
import type { ChatMessage } from "./types";

export interface ChatTemplate {
  id: string;
  label: string;
  bosToken: string | null;
  eosToken: string | null;
  template: string;
}

export const templateSource = data.source;
export const chatTemplates: ChatTemplate[] = data.templates;

export function getTemplate(id: string): ChatTemplate {
  const t = chatTemplates.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown chat template: ${id}`);
  return t;
}

const compiled = new Map<string, Template>();

/**
 * Render messages with a model's real chat template, the same way
 * `tokenizer.apply_chat_template(messages, add_generation_prompt=...)` does.
 */
export function renderChatTemplate(
  id: string,
  messages: ChatMessage[],
  addGenerationPrompt: boolean,
): string {
  const t = getTemplate(id);
  let tpl = compiled.get(id);
  if (!tpl) {
    tpl = new Template(t.template);
    compiled.set(id, tpl);
  }
  return tpl.render({
    messages,
    bos_token: t.bosToken ?? "",
    eos_token: t.eosToken ?? "",
    add_generation_prompt: addGenerationPrompt,
  });
}

/** Special-token strings for a template, used to highlight them in the inspector. */
export function specialTokens(id: string): string[] {
  const t = getTemplate(id);
  const found = new Set<string>();
  // Tokens look like <|name|>, <s>, </s>, [INST], [/INST].
  for (const m of t.template.matchAll(/<\|[a-z_]+\|>|<\/?s>|\[\/?INST\]/g)) found.add(m[0]);
  if (t.bosToken) found.add(t.bosToken);
  if (t.eosToken) found.add(t.eosToken);
  return [...found];
}
