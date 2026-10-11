import { useMemo, useState } from "react";
import { specs, type CaptureSpec } from "../../scripts/specs";
import { assemble } from "../lib/assemble";
import { examplesForLayer } from "../lib/examples";
import { chatTemplates, specialTokens, templateSource } from "../lib/templates";
import type { ChatMessage, Role } from "../lib/types";
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

/** Layer 1 extra: type a document and see exactly what would be sent. */
export function DocumentPlayground() {
  const [doc, setDoc] = useState("Once upon a time, a robot");
  const req = assemble({ layer: 1, model: "(base model)", settings: { max_tokens: 120, temperature: 0.8 } }, { document: doc });
  return (
    <section className="playground">
      <h3>Write your own start of a document</h3>
      <p className="muted">
        Live text prediction comes in a later version. For now you can see the exact request your text becomes.
      </p>
      <label className="field">
        <span>Document</span>
        <textarea value={doc} onChange={(e) => setDoc(e.target.value)} rows={3} />
      </label>
      <Inspector request={req} notSentNote="Not sent: live text prediction isn't available yet." />
    </section>
  );
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
