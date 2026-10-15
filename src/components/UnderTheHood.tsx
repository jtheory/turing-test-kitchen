import { useMemo, useState } from "react";
import { assemble } from "../lib/assemble";
import { useStoredState } from "../lib/storage";
import { chatTemplates, specialTokens, templateSource } from "../lib/templates";
import type { ChatMessage, Role, Settings } from "../lib/types";
import { Inspector } from "./Inspector";
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

/** Type the start of a document and see the exact request it becomes. Not sent: no hosted base models. */
export function DocumentPlayground() {
  const [doc, setDoc] = useStoredState("hood.document", "Hi my name is John");
  const request = assemble({ mode: "document", model: "(base model)", settings: DOCUMENT_SETTINGS }, { document: doc });

  return (
    <section className="playground">
      <h3>Write the start of a document</h3>
      <label className="field">
        <span>Text for the model to continue</span>
        <textarea value={doc} onChange={(e) => setDoc(e.target.value)} rows={3} />
      </label>
      <p className="muted small">
        Hosted services have stopped offering base models, so this can't be sent live. Examples from a base model run
        on our own computer will appear below.
      </p>
      <Inspector request={request} notSentNote="Not sent." />
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
