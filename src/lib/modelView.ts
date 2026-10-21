import { openModelFor } from "./openModels";
import { renderChatTemplate, specialTokens } from "./templates";
import type { ChatMessage, ModelRequest } from "./types";

/**
 * What a part of the model's input is, so the display can mute, colour and
 * explain it. The visitor's newest message is the only part at full strength.
 */
export type SegmentKind =
  | "own" // the visitor's newest message
  | "history" // earlier messages in this chat, re-sent by the app
  | "markup" // role markers and special tokens: structure, not content
  | "added" // text the model's format adds by itself (e.g. a date)
  | "reply"; // the model's reply, continuing the text

export interface Segment {
  kind: SegmentKind;
  text: string;
  /** For chat-list views: who the message is from. */
  role?: ChatMessage["role"];
}

export interface ModelView {
  /** "text": the exact text an open model reads. "messages": the request as sent, for models whose format is secret. */
  form: "text" | "messages";
  segments: Segment[];
}

/** Build the model's view of a request, plus its reply if there is one. */
export function modelView(request: ModelRequest, reply?: string): ModelView {
  if (request.kind === "completion") {
    return { form: "text", segments: withReply([{ kind: "own", text: request.body.prompt }], reply) };
  }
  const messages = request.body.messages;
  const open = openModelFor(request.body.model);
  if (open) {
    const segments = splitTemplate(open.templateId, messages, messages.at(-1)?.role === "user");
    return { form: "text", segments: withReply(segments, reply) };
  }
  const segments: Segment[] = messages.map((m, i) => ({
    kind: i === messages.length - 1 && m.role === "user" ? "own" : "history",
    text: m.content,
    role: m.role,
  }));
  return { form: "messages", segments: withReply(segments, reply) };
}

function withReply(segments: Segment[], reply?: string): Segment[] {
  return reply === undefined ? segments : [...segments, { kind: "reply", text: reply, role: "assistant" }];
}

/**
 * Attribute every character of a model's input text. The template is rendered
 * once with a unique placeholder in place of each message, so message
 * positions are exact even if a message repeats the format's own words. The
 * pieces between placeholders are the format's text: special tokens, role names
 * and whitespace are "markup"; anything else it wrote is "added".
 */
export function splitTemplate(templateId: string, messages: ChatMessage[], addGenerationPrompt: boolean): Segment[] {
  const tokens = specialTokens(templateId);
  const marks = messages.map((_, i) => `\u0001${i}\u0002`);
  const skeleton = renderChatTemplate(
    templateId,
    messages.map((m, i) => ({ ...m, content: marks[i] })),
    addGenerationPrompt,
  );
  const out: Segment[] = [];
  let rest = skeleton;
  messages.forEach((m, i) => {
    const at = rest.indexOf(marks[i]);
    if (at < 0) return;
    pushGap(out, rest.slice(0, at), tokens);
    // Templates may trim message text (Llama 3.1 does); show what the model actually reads.
    const real = renderChatTemplate(templateId, [m], false).includes(m.content) ? m.content : m.content.trim();
    const own = i === messages.length - 1 && m.role === "user";
    if (real) out.push({ kind: own ? "own" : "history", text: real, role: m.role });
    rest = rest.slice(at + marks[i].length);
  });
  pushGap(out, rest, tokens);
  return merge(out);
}

const ROLE_WORD = /^(\s*(system|user|assistant)\s*|\s+)$/;

function pushGap(out: Segment[], gap: string, tokens: string[]) {
  if (!gap) return;
  const sorted = [...tokens].sort((a, b) => b.length - a.length).map(escape);
  const parts = sorted.length ? gap.split(new RegExp(`(${sorted.join("|")})`)) : [gap];
  parts.forEach((part, i) => {
    if (!part) return;
    const isToken = i % 2 === 1;
    if (isToken || ROLE_WORD.test(part)) out.push({ kind: "markup", text: part });
    else {
      // Keep surrounding line breaks as markup so "added" is just the words.
      const lead = part.match(/^\s*/)![0];
      const trail = part.slice(lead.length).match(/\s*$/)![0];
      const core = part.slice(lead.length, part.length - trail.length);
      if (lead) out.push({ kind: "markup", text: lead });
      out.push({ kind: "added", text: core });
      if (trail) out.push({ kind: "markup", text: trail });
    }
  });
}

/** Join neighbouring segments of the same kind (and role). */
function merge(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of segments) {
    const last = out.at(-1);
    if (last && last.kind === s.kind && last.role === s.role && s.kind === "markup") last.text += s.text;
    else out.push({ ...s });
  }
  return out;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Plain explanations shown when a part is hovered or tapped. */
export const explanations: Record<SegmentKind, { label: string; text: string }> = {
  own: { label: "Your newest message", text: "What you just typed, exactly as you typed it." },
  history: {
    label: "Earlier in this chat, sent again",
    text: "The model doesn't remember any of this. The app sends the whole conversation again with every new message, and the model reads it all from the start.",
  },
  markup: {
    label: "Formatting markers",
    text: "Markers that say where each message starts and ends, and who wrote it. The model was trained on text laid out this way, so it needs them to read the conversation.",
  },
  added: {
    label: "Added by the format",
    text: "Text this model's format puts in by itself. You never typed it, and the app didn't choose it.",
  },
  reply: {
    label: "The model's reply",
    text: "The model writes its reply as a continuation of all the text above, one small piece at a time, and stops at an end marker.",
  },
};
