// Shared types for prompt assembly, the inspector and recorded examples.

export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

/** Generation settings we allow. Nothing else is passed to a model. */
export interface Settings {
  max_tokens: number;
  /** Not every model accepts this (OpenRouter lists no temperature for Claude 5.5 models). */
  temperature?: number;
  top_p?: number;
  seed?: number;
  stop?: string[];
}

/** Raw text continuation: OpenAI-compatible POST /v1/completions. */
export interface CompletionRequest {
  kind: "completion";
  path: "/v1/completions";
  body: { model: string; prompt: string } & Settings;
}

/** Chat messages: OpenAI-compatible POST /v1/chat/completions. */
export interface ChatRequest {
  kind: "chat";
  path: "/v1/chat/completions";
  body: { model: string; messages: ChatMessage[] } & Settings;
}

export type ModelRequest = CompletionRequest | ChatRequest;

/**
 * How a request is built from what the visitor has typed. Pages pick a mode;
 * several pages can share one.
 *
 * - single: only the newest user message, nothing else (the bare model)
 * - transcript: the whole conversation, re-sent every turn (memory)
 * - document: raw text for a base model to continue (under the hood)
 * - template: messages rendered with an open model's real chat template (under the hood)
 */
export type Mode = "single" | "transcript" | "document" | "template";

export type AssembleConfig =
  | { mode: "single" | "transcript" | "document"; model: string; settings: Settings }
  | { mode: "template"; model: string; templateId: string; settings: Settings };

/**
 * What the visitor has typed so far. For "document" it is a single string;
 * for every other mode it is a list of chat messages.
 */
export type Conversation = { document: string } | { messages: ChatMessage[] };

/** Where an example appears on the site. */
export type Section = "bare" | "memory" | "under-the-hood";

/** One request/response pair, stored exactly as sent and received. */
export interface RecordedTurn {
  request: ModelRequest;
  /** The provider's raw JSON response body, unmodified. */
  response: unknown;
}

/** A recorded example (examples/*.json). Captured by scripts/capture.ts, never hand-written. */
export interface RecordedExample {
  id: string;
  section: Section;
  mode: Mode;
  title: string;
  model: string;
  /** Who served the model, e.g. a provider name or "local llama.cpp". */
  provider: string;
  /** ISO 8601 timestamp of the capture. */
  captured_at: string;
  settings: Settings;
  /** Multi-turn examples have one entry per turn. */
  turns: RecordedTurn[];
  notes?: string;
}
