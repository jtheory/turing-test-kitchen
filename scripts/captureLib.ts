import { assemble, responseText } from "../src/lib/assemble";
import { send, type Endpoint, type FetchLike } from "../src/lib/send";
import type { ChatMessage, RecordedExample, RecordedTurn } from "../src/lib/types";
import type { CaptureSpec } from "./specs";

export type { FetchLike };

export interface CaptureEndpoint extends Endpoint {
  model: string;
  provider: string;
  /**
   * Text put before every document, e.g. "<|begin_of_text|>" for Llama 3 on a server
   * that doesn't add the model's start token itself (mlx_lm.server). It is part of the
   * recorded request, so the inspector shows it.
   */
  startToken?: string;
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
    const request = assemble({ mode: "document", model: ep.model, settings: spec.settings }, {
      document: (ep.startToken ?? "") + spec.document,
    });
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
    ...(notes(spec, ep) ? { notes: notes(spec, ep) } : {}),
  };
}

function notes(spec: CaptureSpec, ep: CaptureEndpoint): string | undefined {
  if (spec.mode !== "document" || !ep.startToken) return spec.notes;
  const added = `The text starts with ${ep.startToken}, the model's hidden start-of-text marker. This server doesn't add it, so it was added to the text.`;
  return spec.notes ? `${spec.notes} ${added}` : added;
}

/** One file per prompt and model, e.g. "bare-john--llama-3.1-8b-instruct". */
export function exampleId(specId: string, model: string): string {
  const slug = (model.split("/").pop() ?? model).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
  return `${specId}--${slug}`;
}
