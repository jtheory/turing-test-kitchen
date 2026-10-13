// What to capture for the recorded examples. The prompts live here; the
// model outputs only ever come from a real model via scripts/capture.ts.

import type { Settings } from "../src/lib/types";

export interface DocumentSpec {
  id: string;
  layer: 1;
  title: string;
  notes?: string;
  settings: Settings;
  document: string;
}

export interface ChatSpec {
  id: string;
  layer: 3 | 4;
  title: string;
  notes?: string;
  settings: Settings;
  /** Sent one at a time; each model reply is added to the transcript before the next. */
  userTurns: string[];
}

export type CaptureSpec = DocumentSpec | ChatSpec;

const base: Settings = { max_tokens: 120, temperature: 0.8 };
const chat: Settings = { max_tokens: 200, temperature: 0.7 };

export const specs: CaptureSpec[] = [
  {
    id: "layer1-john",
    layer: 1,
    title: "Hi, my name is John",
    notes: "The opening line of a chat, sent with nothing around it. The model doesn't reply to John; it carries on writing John's text.",
    settings: base,
    document: "Hi my name is John",
  },
  {
    id: "layer1-empty",
    layer: 1,
    title: "No text at all",
    notes: "With nothing to continue, the model starts a document of its own, of whatever kind is likely.",
    settings: base,
    document: "",
  },
  {
    id: "layer1-diary",
    layer: 1,
    title: "A diary entry",
    notes: "The model just keeps writing the diary. Nobody asked it anything.",
    settings: base,
    document: "Dear diary,\n\nToday was the strangest day. When I got to work,",
  },
  {
    id: "layer1-question",
    layer: 1,
    title: "A question with no one to answer it",
    notes: "A question is just more text. The model may answer it, or carry on writing more questions, like a list on a web page.",
    settings: base,
    document: "Are you conscious?",
  },
  {
    id: "layer1-script",
    layer: 1,
    title: "A conversation written as a script",
    notes: "Written like a script, the text gets continued as a script. The model writes the AI's lines, and often the human's next line too.",
    settings: base,
    document:
      "The following is a conversation between a human and an AI.\n\nHuman: Hello! Do you have feelings?\nAI:",
  },
  {
    id: "layer3-name",
    layer: 3,
    title: "Telling it your name",
    notes: "Each message is sent on its own, so the second message arrives without the first.",
    settings: chat,
    userTurns: ["Hi! My name is Sam and I love gardening.", "What's my name, and what do I love?"],
  },
  {
    id: "layer4-name",
    layer: 4,
    title: "Telling it your name, with memory",
    notes: "Same two messages as layer 3, but the whole conversation is re-sent each turn.",
    settings: chat,
    userTurns: ["Hi! My name is Sam and I love gardening.", "What's my name, and what do I love?"],
  },
];
