import { assemble, responseText } from "../lib/assemble";
import { useLive } from "../lib/live";
import { modelLabel } from "../lib/models";
import { DEFAULT_OPEN_MODEL } from "../lib/openModels";
import { useStoredState } from "../lib/storage";
import type { ModelRequest, Settings } from "../lib/types";
import { useLiveRun, type Run } from "../lib/useLiveRun";
import { Inspector } from "./Inspector";
import { LiveControls } from "./LiveControls";

const SETTINGS: Settings = { max_tokens: 300 };

/**
 * Layer 1: one message, nothing else added, sent to two models side by side:
 * a strong closed model (format secret) and a small open one (format published,
 * so we can show exactly what it reads).
 */
export function BareModel() {
  const live = useLive();
  const [message, setMessage] = useStoredState("bare.message", "Hi my name is John");
  const closed = useLiveRun();
  const open = useLiveRun();

  const closedModel = live.settings.chatModel.trim() || "(chat model)";
  const conversation = { messages: [{ role: "user" as const, content: message }] };
  const closedPreview = assemble({ mode: "single", model: closedModel, settings: SETTINGS }, conversation);
  const openPreview = assemble({ mode: "single", model: DEFAULT_OPEN_MODEL, settings: SETTINGS }, conversation);

  const pending = !!(closed.run?.pending || open.run?.pending);
  const sent = sentText(closed.run) ?? sentText(open.run);
  const edited = sent !== undefined && sent !== message;

  return (
    <section className="playground">
      <h3>Try it: send one message</h3>
      <label className="field">
        <span>Your message</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
      </label>
      <LiveControls
        ready={live.chatReady}
        models={
          <>
            <code>{closedModel}</code> and <code>{DEFAULT_OPEN_MODEL}</code>
          </>
        }
        pending={pending}
        sendAgain={sent !== undefined && !edited}
        onSend={() => {
          if (!message.trim()) return;
          closed.go(closedPreview);
          open.go(openPreview);
        }}
        onStop={() => {
          closed.stop();
          open.stop();
        }}
      />
      {edited && <p className="muted small">You've edited your message since; send again to see the new version.</p>}

      <ModelCard
        title={modelLabel(closedModel)}
        kind="A large model whose input format is secret"
        run={closed.run}
        preview={closedPreview}
      />
      <ModelCard
        title={modelLabel(DEFAULT_OPEN_MODEL)}
        kind="A small open model whose input format is published, so we can show what it reads"
        run={open.run}
        preview={openPreview}
      />
    </section>
  );
}

function ModelCard({ title, kind, run, preview }: { title: string; kind: string; run?: Run; preview: ModelRequest }) {
  const reply = run?.response === undefined ? undefined : responseText(run.response);
  const request = run?.request ?? preview;
  const sent = sentText(run);
  return (
    <article className="model-card">
      <header>
        <h4>{title}</h4>
        <p className="muted small">{kind}</p>
      </header>
      {reply !== undefined && (
        <ol className="chat" aria-label={`Exchange with ${title}`}>
          <li className="bubble bubble-user">{sent}</li>
          <li className="bubble bubble-assistant">{reply}</li>
        </ol>
      )}
      <Inspector
        request={request}
        response={run?.response}
        failure={run?.failure}
        notSentNote={run?.pending ? "Waiting…" : "Not sent yet."}
      />
    </article>
  );
}

function sentText(run?: Run): string | undefined {
  return run?.request.kind === "chat" ? run.request.body.messages.at(-1)?.content : undefined;
}
