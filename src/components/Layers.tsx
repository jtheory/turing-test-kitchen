import { useMemo, useRef, useState } from "react";
import { specs, type CaptureSpec } from "../../scripts/specs";
import { assemble, responseText } from "../lib/assemble";
import { liveAvailable, useLive } from "../lib/live";
import { HttpError, send } from "../lib/send";
import { useStoredState } from "../lib/storage";
import { examplesForLayer } from "../lib/examples";
import { chatTemplates, specialTokens, templateSource } from "../lib/templates";
import type { ChatMessage, ModelRequest, Role, Settings } from "../lib/types";
import { Inspector } from "./Inspector";
import { RecordedExampleView } from "./RecordedExampleView";

/** Recorded examples for a layer, or an honest note that none are captured yet. */
export function RecordedExamples({ layer }: { layer: number }) {
  const list = examplesForLayer(layer);
  if (list.length > 0) return <>{list.map((e) => <RecordedExampleView key={e.id} example={e} />)}</>;
  const planned = specs.filter((s) => s.layer === layer);
  return (
    <div className="empty">
      <p>
        <strong>No recorded examples yet.</strong> Examples on this site are always real model outputs, captured
        with <code>npm run capture</code>, never written by hand. These are the prompts waiting to be captured, with
        the exact first request each one will send:
      </p>
      {planned.map((s) => (
        <PlannedSpec key={s.id} spec={s} />
      ))}
    </div>
  );
}

function PlannedSpec({ spec }: { spec: CaptureSpec }) {
  const model = spec.layer === 1 ? "(base model chosen at capture)" : "(chat model chosen at capture)";
  const req =
    spec.layer === 1
      ? assemble({ layer: 1, model, settings: spec.settings }, { document: spec.document })
      : assemble({ layer: spec.layer, model, settings: spec.settings }, { messages: [{ role: "user", content: spec.userTurns[0] }] });
  return (
    <article className="example planned">
      <header>
        <h3>{spec.title}</h3>
        <p className="badge badge-pending">Not captured yet</p>
        {spec.notes && <p>{spec.notes}</p>}
        {spec.layer !== 1 && (
          <ol className="planned-turns" aria-label="Messages to send">
            {spec.userTurns.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ol>
        )}
      </header>
      <Inspector request={req} notSentNote="Nothing yet. This example hasn't been captured." />
    </article>
  );
}

/** Layer 1: type the start of a document and, with a live model set up, send it. */
export function DocumentPlayground() {
  const live = useLive();
  const [doc, setDoc] = useStoredState("layer1.document", "Hi my name is John");
  const [run, setRun] = useState<Run>();
  const abortRef = useRef<AbortController>(undefined);

  const model = live.settings.baseModel.trim() || "(base model)";
  const preview = assemble({ layer: 1, model, settings: LAYER1_SETTINGS }, { document: doc });
  const shown = run ?? { request: preview };
  const edited = run !== undefined && run.request.kind === "completion" && run.request.body.prompt !== doc;

  async function go() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const request = preview;
    setRun({ request, pending: true });
    try {
      const response = await send(request, live.settings, fetch, controller.signal);
      setRun({ request, response });
    } catch (e) {
      if (controller.signal.aborted) setRun({ request, failure: { summary: "Stopped before a reply came back." } });
      else setRun({ request, failure: describeFailure(e) });
    }
  }

  const generated = shown.response === undefined ? undefined : responseText(shown.response);

  return (
    <section className="playground">
      <h3>Try it: write the start of a document</h3>
      <label className="field">
        <span>Text sent to the model</span>
        <textarea value={doc} onChange={(e) => setDoc(e.target.value)} rows={3} />
      </label>

      {live.ready ? (
        <div className="actions">
          {run?.pending ? (
            <button onClick={() => abortRef.current?.abort()}>Stop</button>
          ) : (
            <button className="primary" onClick={go}>
              {run && !edited ? "Send again" : "Send"}
            </button>
          )}
          <span className="muted small">
            Live: <code>{model}</code>
          </span>
        </div>
      ) : liveAvailable ? (
        <p className="muted">
          To send this to a real base model, <button className="link" onClick={() => live.setPanelOpen(true)}>set up a live model</button>.
        </p>
      ) : (
        <p className="muted">Live text prediction isn't available yet. You can still see the exact request your text becomes.</p>
      )}

      {run?.pending && <p className="muted" role="status">Waiting for the model…</p>}

      {generated !== undefined && run?.request.kind === "completion" && (
        <figure className="continuation">
          <pre className="textview">
            {run.request.body.prompt}
            <span className="generated">{generated}</span>
          </pre>
          <figcaption>
            Plain text: what was sent. <span className="generated">Highlighted</span>: what the model added.
            {edited && " You've edited the text since; send again to see the new version."}
          </figcaption>
        </figure>
      )}

      <Inspector
        request={shown.request}
        response={shown.response}
        failure={shown.failure}
        notSentNote={run?.pending ? "Waiting…" : "Not sent yet."}
      />
    </section>
  );
}

const LAYER1_SETTINGS: Settings = { max_tokens: 120, temperature: 0.8 };

interface Run {
  request: ModelRequest;
  response?: unknown;
  failure?: { summary: string; raw?: string };
  pending?: boolean;
}

function describeFailure(e: unknown): { summary: string; raw?: string } {
  if (e instanceof HttpError) {
    return { summary: `The provider answered with an error (HTTP ${e.status}). Its exact reply:`, raw: e.body };
  }
  return {
    summary:
      "The request didn't get a reply. The address may be wrong, you may be offline, or the provider may not accept requests from a browser.",
    raw: e instanceof Error ? e.message : String(e),
  };
}

const startingChat: ChatMessage[] = [
  { role: "user", content: "Hi! My name is Sam." },
  { role: "assistant", content: "Hello Sam! How can I help you today?" },
  { role: "user", content: "Do you have feelings?" },
];

/** Layer 2: edit a conversation and see each model's real chat template render it. */
export function ChatFormatting() {
  const [messages, setMessages] = useState<ChatMessage[]>(startingChat);
  const [templateId, setTemplateId] = useState(chatTemplates[0].id);
  const tokens = useMemo(() => specialTokens(templateId), [templateId]);

  let req;
  let error: string | undefined;
  try {
    req = assemble(
      { layer: 2, model: templateId, templateId, settings: { max_tokens: 200, temperature: 0.7 } },
      { messages },
    );
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const update = (i: number, patch: Partial<ChatMessage>) =>
    setMessages(messages.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <section className="playground">
      <h3>The conversation</h3>
      <ol className="editor">
        {messages.map((m, i) => (
          <li key={i}>
            <select
              aria-label={`Message ${i + 1} speaker`}
              value={m.role}
              onChange={(e) => update(i, { role: e.target.value as Role })}
            >
              <option value="system">system</option>
              <option value="user">user</option>
              <option value="assistant">assistant</option>
            </select>
            <textarea
              aria-label={`Message ${i + 1} text`}
              value={m.content}
              rows={2}
              onChange={(e) => update(i, { content: e.target.value })}
            />
            <button className="link" onClick={() => setMessages(messages.filter((_, j) => j !== i))} aria-label={`Remove message ${i + 1}`}>
              Remove
            </button>
          </li>
        ))}
      </ol>
      <button onClick={() => setMessages([...messages, { role: messages.at(-1)?.role === "user" ? "assistant" : "user", content: "" }])}>
        Add a message
      </button>

      <h3>The same conversation as one text</h3>
      <div className="toggle" role="group" aria-label="Model format">
        {chatTemplates.map((t) => (
          <button key={t.id} aria-pressed={t.id === templateId} onClick={() => setTemplateId(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted">
        Highlighted parts are <mark className="token">special tokens</mark>: markers the model learned during chat
        training. When the last message is from the user, the format ends with the start of an assistant turn, so the
        most likely next text is a reply. Look for text no one typed, like a default system message or a date.
      </p>
      {error ? (
        <p className="error">This model's format rejected the conversation: {error}</p>
      ) : (
        req && <Inspector request={req} tokens={tokens} notSentNote="Not sent: this layer only shows the formatting step." />
      )}
      <p className="source">
        Formats are the models' real chat templates, taken from the{" "}
        <a href={`${templateSource.repo}/blob/${templateSource.commit}/${templateSource.path}`}>huggingface.js test fixtures</a>{" "}
        and rendered with <code>@huggingface/jinja</code>.
      </p>
    </section>
  );
}
