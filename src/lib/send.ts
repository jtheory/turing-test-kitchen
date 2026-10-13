import type { ModelRequest } from "./types";

export interface Endpoint {
  /** OpenAI-compatible root without /v1, e.g. https://openrouter.ai/api or http://localhost:8080 */
  baseUrl: string;
  apiKey?: string;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/** The provider answered with an error. `body` is its raw response text. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
  }
}

export function endpointUrl(ep: Endpoint, req: ModelRequest): string {
  return ep.baseUrl.trim().replace(/\/+$/, "") + req.path;
}

/** Send one assembled request exactly as the inspector shows it, and return the raw JSON response. */
export async function send(
  req: ModelRequest,
  ep: Endpoint,
  fetchFn: FetchLike,
  signal?: AbortSignal,
): Promise<unknown> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (ep.apiKey) headers.authorization = `Bearer ${ep.apiKey.trim()}`;
  const res = await fetchFn(endpointUrl(ep, req), { method: "POST", headers, body: JSON.stringify(req.body), signal });
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, text);
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(res.status, text);
  }
}
