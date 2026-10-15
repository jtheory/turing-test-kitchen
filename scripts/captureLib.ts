import { assemble, responseText } from "../src/lib/assemble";
import { send, type Endpoint, type FetchLike } from "../src/lib/send";
import type { ChatMessage, RecordedExample, RecordedTurn } from "../src/lib/types";
import type { CaptureSpec } from "./specs";

export type { FetchLike };

export interface CaptureEndpoint extends Endpoint {
  model: string;
  provider: string;
}

/** Run one spec against a real model and return the recorded example. */
export async function capture(
  spec: CaptureSpec,
  ep: CaptureEndpoint,
  fetchFn: FetchLike,
  now: () => Date = () => new Date(),
): Promise<RecordedExample> {
  const turns: RecordedTurn[] = [];
  if (spec.mode === "document") {
    const request = assemble({ mode: "document", model: ep.model, settings: spec.settings }, { document: spec.document });
    turns.push({ request, response: await send(request, ep, fetchFn) });
  } else {
    const messages: ChatMessage[] = [];
    for (const content of spec.userTurns) {
      messages.push({ role: "user", content });
      const request = assemble({ mode: spec.mode, model: ep.model, settings: spec.settings }, { messages });
      const response = await send(request, ep, fetchFn);
      const reply = responseText(response);
      if (reply === undefined) throw new Error(`No reply text in response for ${spec.id}`);
      turns.push({ request, response });
      messages.push({ role: "assistant", content: reply });
    }
  }
  return {
    id: exampleId(spec.id, ep.model),
    section: spec.section,
    mode: spec.mode,
    title: spec.title,
    model: ep.model,
    provider: ep.provider,
    captured_at: now().toISOString(),
    settings: spec.settings,
    turns,
    ...(spec.notes ? { notes: spec.notes } : {}),
  };
}

/** One file per prompt and model, e.g. "bare-john--llama-3.1-8b-instruct". */
export function exampleId(specId: string, model: string): string {
  const slug = (model.split("/").pop() ?? model).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
  return `${specId}--${slug}`;
}
