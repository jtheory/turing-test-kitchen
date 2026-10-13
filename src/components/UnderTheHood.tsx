import { useMemo, useState } from "react";
import { assemble, responseText } from "../lib/assemble";
import { useLive } from "../lib/live";
import { useStoredState } from "../lib/storage";
import { chatTemplates, specialTokens, templateSource } from "../lib/templates";
import type { ChatMessage, Role, Settings } from "../lib/types";
import { useLiveRun } from "../lib/useLiveRun";
import { Inspector } from "./Inspector";
import { LiveControls } from "./LiveControls";
import { RecordedExamples } from "./RecordedExamples";

/** The aside: the formatting step, and the base model underneath the chat training. */
export function UnderTheHood() {
  return (
    <>
      <h2>The hidden formatting step</h2>
      <p>
        Your messages aren't handed to the model as a list of chat bubbles. They're stitched into one long piece of
        text, with special markers that say who is speaking. The model then continues that text, and its "turn" ends
        when it writes the end-of-message marker.
      </p>
      <p>
        For models like Claude, this format isn't public, so no one outside the company can show it to you. For
        open models it is. Below is the real thing for three of them.
      </p>
      <ChatFormatting />

      <h2>Underneath the chat training</h2>
      <p>
        Before chat training, a model does only one thing: continue text. Give it the start of a document and it
        writes more of that document. It doesn't reply to you, because there is no "you" in the text.
      </p>
      <DocumentPlayground />
      <RecordedExamples section="under-the-hood" />
    </>
  );
}

const DOCUMENT_SETTINGS: Settings = { max_tokens: 120, temperature: 0.8 };

/** Type the start of a document and, with a base model set up, send it. */
export function DocumentPlayground() {
  const live = useLive();
  const [doc, setDoc] = useStoredState("hood.document", "Hi my name is John");
  const { run, go, stop } = useLiveRun();

  const model = live.settings.baseModel.trim() || "(base model)";
  const preview = assemble({ mode: "document", model, settings: DOCUMENT_SETTINGS }, { document: doc });
  const edited = run !== undefined && run.request.kind === "completion" && run.request.body.prompt !== doc;
  const generated = run?.response === undefined ? undefined : responseText(run.response);

  return (
    <section className="playground">
      <h3>Try it: write the start of a document</h3>
      <label className="field">
        <span>Text sent to the model</span>
        <textarea value={doc} onChange={(e) => setDoc(e.target.value)} rows={3} />
      </label>
      <LiveControls
        ready={live.baseReady}
        model={model}
        run={run}
        edited={edited}
        onSend={() => go(preview)}
        onStop={stop}
        setupLabel="set a base model"
      />

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
        request={run?.request ?? preview}
        response={run?.response}
        failure={run?.failure}
        notSentNote={run?.pending ? "Waiting…" : "Not sent yet."}
      />
    </section>
  );
}

const startingChat: ChatMessage[] = [
  { role: "user", content: "Hi my name is John" },
  { role: "assistant", content: "Nice to meet you, John!" },
  { role: "user", content: "What's my name?" },
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
      { mode: "template", model: templateId, templateId, settings: { max_tokens: 200 } },
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
      <p className="muted small">Edit any line, including the assistant's. Nothing is sent to a model here; this is only the formatting step.</p>
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
        req && <Inspector request={req} tokens={tokens} notSentNote="Not sent: this only shows the formatting step." />
      )}
      <p className="source">
        Formats are the models' real chat templates, taken from the{" "}
        <a href={`${templateSource.repo}/blob/${templateSource.commit}/${templateSource.path}`}>huggingface.js test fixtures</a>{" "}
        and rendered with <code>@huggingface/jinja</code>.
      </p>
    </section>
  );
}
