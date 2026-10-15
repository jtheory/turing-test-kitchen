import { useState } from "react";
import { responseText, responseUsage, serializeBody, type Usage } from "../lib/assemble";
import type { ModelRequest } from "../lib/types";
import { modelReads } from "../lib/openModels";
import { TextView } from "./TextView";

interface Props {
  request: ModelRequest;
  /** Raw response JSON; omit when the request was not sent. */
  response?: unknown;
  tokens?: string[];
  /** Shown when there is no response. */
  notSentNote?: string;
  /** The request failed: a plain summary, and the provider's raw error body if there was one. */
  failure?: { summary: string; raw?: string };
}

/** The exact request sent to the model and the exact response that came back. */
export function Inspector({ request, response, tokens, notSentNote, failure }: Props) {
  const [view, setView] = useState<"readable" | "exact">("readable");
  const { model, ...rest } = request.body;
  const settings = Object.entries(rest).filter(([k]) => k !== "prompt" && k !== "messages");
  const out = response === undefined ? undefined : responseText(response);
  const usage = response === undefined ? undefined : responseUsage(response);
  const reads = modelReads(request);

  return (
    <section className="inspector" aria-label="Inspector">
      <div className="inspector-head">
        <h4>Inspector</h4>
        <div className="toggle" role="group" aria-label="Inspector view">
          <button aria-pressed={view === "readable"} onClick={() => setView("readable")}>
            Readable
          </button>
          <button aria-pressed={view === "exact"} onClick={() => setView("exact")}>
            Exact data
          </button>
        </div>
      </div>

      <h5>Sent</h5>
      {request.kind === "chat" && !reads && (
        <p className="meta">
          Exactly what this site sends. The provider reformats it before the model reads it, in a format that isn't
          public. <a href="#/under-the-hood">How?</a>
        </p>
      )}
      {reads && (
        <p className="meta">Exactly what this site sends. The model never sees it in this form: see below.</p>
      )}
      {view === "readable" ? (
        <>
          <p className="meta">
            <code>POST {request.path}</code> · model <code>{model}</code>
            {settings.map(([k, v]) => (
              <span key={k}>
                {" "}
                · {k} <code>{JSON.stringify(v)}</code>
              </span>
            ))}
          </p>
          {request.kind === "completion" ? (
            <TextView text={request.body.prompt} tokens={tokens} label="Text sent to the model" />
          ) : (
            <ol className="messages">
              {request.body.messages.map((m, i) => (
                <li key={i} className={`msg msg-${m.role}`}>
                  <span className="role">{m.role}</span>
                  <TextView text={m.content} />
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <>
          <p className="meta">
            The exact request body, byte for byte, sent to <code>{request.path}</code>:
          </p>
          <pre className="json">{serializeBody(request)}</pre>
        </>
      )}

      {reads && view === "readable" && (
        <>
          <h5>What the model reads</h5>
          <p className="meta">
            Before the model sees your message, it's turned into one piece of text using this model's published chat
            template. <mark className="token">Highlighted</mark> parts are special markers. Everything else that you
            didn't type was added too. The model's reply continues this text.
          </p>
          <TextView text={reads.text} tokens={reads.tokens} label="Text the model reads" />
          <p className="meta">
            Rendered here from the model's published template. The host should produce the same text, though it may
            fill in details like the date differently.
          </p>
        </>
      )}

      <h5>Came back</h5>
      {failure ? (
        <>
          <p className="error">{failure.summary}</p>
          {failure.raw !== undefined && <pre className="json">{failure.raw}</pre>}
        </>
      ) : response === undefined ? (
        <p className="muted">{notSentNote ?? "Not sent."}</p>
      ) : view === "readable" ? (
        out === undefined ? (
          <p className="muted">No text in this response. Switch to "Exact data" to see it.</p>
        ) : (
          <>
            <TextView text={out} tokens={tokens} label="Text the model produced" />
            {usage && <UsageLine usage={usage} />}
          </>
        )
      ) : (
        <pre className="json">{JSON.stringify(response, null, 2)}</pre>
      )}
    </section>
  );
}

function UsageLine({ usage }: { usage: Usage }) {
  const { read, wrote, reasoning, costUsd } = usage;
  if (read === undefined && wrote === undefined) return null;
  return (
    <p className="meta usage">
      The model read <strong>{read ?? "?"}</strong> tokens and wrote <strong>{wrote ?? "?"}</strong>
      {reasoning ? (
        <>
          , including <strong>{reasoning}</strong> of hidden reasoning before the reply
        </>
      ) : null}
      .{costUsd !== undefined && <> Cost: ${costUsd.toFixed(5).replace(/0+$/, "")}.</>}
    </p>
  );
}
