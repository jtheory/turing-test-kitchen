import { useRef, useState } from "react";
import { useLive } from "./live";
import { HttpError, send } from "./send";
import type { ModelRequest } from "./types";

export interface Run {
  request: ModelRequest;
  response?: unknown;
  failure?: { summary: string; raw?: string };
  pending?: boolean;
}

/** Send requests with the live settings, one at a time, and keep the latest result. */
export function useLiveRun() {
  const live = useLive();
  const [run, setRun] = useState<Run>();
  const abortRef = useRef<AbortController>(undefined);

  async function go(request: ModelRequest) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRun({ request, pending: true });
    try {
      const response = await send(request, live.settings, fetch, controller.signal);
      setRun({ request, response });
    } catch (e) {
      if (controller.signal.aborted) setRun({ request, failure: { summary: "Stopped before a reply came back." } });
      else setRun({ request, failure: describeFailure(e) });
    }
  }

  return { run, go, stop: () => abortRef.current?.abort() };
}

export function describeFailure(e: unknown): { summary: string; raw?: string } {
  if (e instanceof HttpError) {
    return { summary: `The provider answered with an error (HTTP ${e.status}). Its exact reply:`, raw: e.body };
  }
  return {
    summary:
      "The request didn't get a reply. The address may be wrong, you may be offline, or the provider may not accept requests from a browser.",
    raw: e instanceof Error ? e.message : String(e),
  };
}
