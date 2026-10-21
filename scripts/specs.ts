// What to capture for the recorded examples. The prompts live here; the
// model outputs only ever come from a real model via scripts/capture.ts.

import type { Section, Settings } from "../src/lib/types";

interface Common {
  id: string;
  section: Section;
  title: string;
  notes?: string;
  settings: Settings;
}

/** Raw text for a base model to continue. */
export interface DocumentSpec extends Common {
  mode: "document";
  document: string;
}

/** Chat messages, sent one at a time; each real reply joins the transcript before the next. */
export interface ChatSpec extends Common {
  mode: "single" | "transcript";
  userTurns: string[];
}

export type CaptureSpec = DocumentSpec | ChatSpec;

const chat: Settings = { max_tokens: 300 };
const base: Settings = { max_tokens: 120, temperature: 0.8 };

const john = "Hi my name is John";

export const specs: CaptureSpec[] = [
  // Layer 1: the bare model
  {
    id: "bare-john",
    section: "bare",
    mode: "single",
    title: "Hi, my name is John",
    notes: "One message, nothing else: no hidden instructions, no history.",
    settings: chat,
    userTurns: [john],
  },

  // Layer 2: memory is re-sending
  {
    id: "memory-without",
    section: "memory",
    mode: "single",
    title: "Without memory",
    notes: "Each message is sent on its own, so the second arrives without the first.",
    settings: chat,
    userTurns: [john, "What's my name?"],
  },
  {
    id: "memory-with",
    section: "memory",
    mode: "transcript",
    title: "With memory",
    notes: "The same two messages, but the whole conversation is re-sent each turn.",
    settings: chat,
    userTurns: [john, "What's my name?"],
  },

  // Under the hood: base models continuing text (capture from a local base model)
  // hood-empty runs first: its prompt (at most a start token) is a prefix of the others,
  // and mlx_lm.server's prompt cache crashes on a prefix of a prompt it has already seen.
  {
    id: "hood-empty",
    section: "under-the-hood",
    mode: "document",
    title: "No text at all",
    notes: "With nothing to continue, a base model starts a document of its own, of whatever kind is likely.",
    settings: base,
    document: "",
  },
  {
    id: "hood-john",
    section: "under-the-hood",
    mode: "document",
    title: "Hi my name is John, to a base model",
    notes: "The same opening line with nothing around it. A base model doesn't reply to John; it carries on writing John's text.",
    settings: base,
    document: john,
  },
  {
    id: "hood-script",
    section: "under-the-hood",
    mode: "document",
    title: "A conversation written as a script",
    notes: "Written like a script, the text gets continued as a script. The model writes the AI's lines, and often the human's next line too.",
    settings: base,
    document: "The following is a conversation between a human and an AI.\n\nHuman: Hello! Do you have feelings?\nAI:",
  },
];
