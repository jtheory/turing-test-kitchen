// Shared types for prompt assembly, the inspector and recorded examples.

export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

/** Generation settings we allow. Nothing else is passed to a model. */
export interface Settings {
  max_tokens: number;
  temperature: number;
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

// Layer configs. Each layer adds one idea on top of the previous one.

/** Layer 1: a base model continues whatever document it is given. */
export interface Layer1Config {
  layer: 1;
  model: string;
  settings: Settings;
}

/** Layer 2: a conversation is rendered into one text with a model's chat template. */
export interface Layer2Config {
  layer: 2;
  model: string;
  /** Id of a template in src/data/chat-templates.json. */
  templateId: string;
  settings: Settings;
}

/** Layer 3: only the newest message is sent. */
export interface Layer3Config {
  layer: 3;
  model: string;
  settings: Settings;
}

/** Layer 4: the whole transcript is re-sent every turn. */
export interface Layer4Config {
  layer: 4;
  model: string;
  settings: Settings;
}

export type LayerConfig = Layer1Config | Layer2Config | Layer3Config | Layer4Config;

/**
 * What the visitor has typed so far. For layer 1 it is a document (a single
 * string); for every other layer it is a list of chat messages.
 */
export type Conversation = { document: string } | { messages: ChatMessage[] };

/** One request/response pair, stored exactly as sent and received. */
export interface RecordedTurn {
  request: ModelRequest;
  /** The provider's raw JSON response body, unmodified. */
  response: unknown;
}

/** A recorded example (examples/*.json). Captured by scripts/capture.ts, never hand-written. */
export interface RecordedExample {
  id: string;
  layer: number;
  title: string;
  model: string;
  /** Who served the model, e.g. a provider name or "local llama.cpp". */
  provider: string;
  /** ISO 8601 timestamp of the capture. */
  captured_at: string;
  settings: Settings;
  /** Multi-turn examples (layers 3–4) have one entry per turn. */
  turns: RecordedTurn[];
  notes?: string;
}
