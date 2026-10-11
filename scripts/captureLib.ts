import { assemble, responseText } from "../src/lib/assemble";
import type { ChatMessage, ModelRequest, RecordedExample, RecordedTurn } from "../src/lib/types";
import type { CaptureSpec } from "./specs";

export interface Endpoint {
  /** OpenAI-compatible base URL without the /v1 path, e.g. http://localhost:8080 */
  baseUrl: string;
  apiKey?: string;
  model: string;
  provider: string;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

/** Send one assembled request exactly as the inspector shows it. */
export async function send(req: ModelRequest, ep: Endpoint, fetchFn: FetchLike): Promise<unknown> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (ep.apiKey) headers.authorization = `Bearer ${ep.apiKey}`;
  const res = await fetchFn(ep.baseUrl.replace(/\/+$/, "") + req.path, {
    method: "POST",
    headers,
    body: JSON.stringify(req.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${req.path}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

/** Run one spec against a real model and return the recorded example. */
export async function capture(
  spec: CaptureSpec,
  ep: Endpoint,
  fetchFn: FetchLike,
  now: () => Date = () => new Date(),
): Promise<RecordedExample> {
  const turns: RecordedTurn[] = [];
  if (spec.layer === 1) {
    const request = assemble({ layer: 1, model: ep.model, settings: spec.settings }, { document: spec.document });
    turns.push({ request, response: await send(request, ep, fetchFn) });
  } else {
    const messages: ChatMessage[] = [];
    for (const content of spec.userTurns) {
      messages.push({ role: "user", content });
      const request = assemble({ layer: spec.layer, model: ep.model, settings: spec.settings }, { messages });
      const response = await send(request, ep, fetchFn);
      const reply = responseText(response);
      if (reply === undefined) throw new Error(`No reply text in response for ${spec.id}`);
      turns.push({ request, response });
      messages.push({ role: "assistant", content: reply });
    }
  }
  return {
    id: spec.id,
    layer: spec.layer,
    title: spec.title,
    model: ep.model,
    provider: ep.provider,
    captured_at: now().toISOString(),
    settings: spec.settings,
    turns,
    ...(spec.notes ? { notes: spec.notes } : {}),
  };
}
