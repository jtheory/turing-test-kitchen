import { useState } from "react";
import { responseText } from "../lib/assemble";
import type { RecordedExample } from "../lib/types";
import { Inspector } from "./Inspector";

/** A recorded example: a document continuation (layer 1) or a chat stepped turn by turn. */
export function RecordedExampleView({ example }: { example: RecordedExample }) {
  const [turn, setTurn] = useState(0);
  const t = example.turns[turn];
  const captured = new Date(example.captured_at).toLocaleDateString(undefined, { dateStyle: "medium" });

  return (
    <article className="example">
      <header>
        <h3>{example.title}</h3>
        <p className="badge" title="A real model output, captured ahead of time">
          Recorded · {example.model} via {example.provider} · {captured}
        </p>
        {example.notes && <p>{example.notes}</p>}
      </header>

      {t.request.kind === "completion" ? (
        <figure className="continuation">
          <pre className="textview">
            {t.request.body.prompt}
            <span className="generated">{responseText(t.response)}</span>
          </pre>
          <figcaption>
            Plain text: the start of the document. <span className="generated">Highlighted</span>: what the model added.
          </figcaption>
        </figure>
      ) : (
        <>
          <ol className="chat" aria-label="Conversation as the visitor saw it">
            {example.turns.slice(0, turn + 1).flatMap((tt, i) => {
              const msgs = tt.request.kind === "chat" ? tt.request.body.messages : [];
              const user = msgs.at(-1);
              return [
                <li key={`u${i}`} className="bubble bubble-user">{user?.content}</li>,
                <li key={`a${i}`} className="bubble bubble-assistant">{responseText(tt.response)}</li>,
              ];
            })}
          </ol>
          {example.turns.length > 1 && (
            <nav className="stepper" aria-label="Turns">
              {example.turns.map((_, i) => (
                <button key={i} aria-pressed={i === turn} onClick={() => setTurn(i)}>
                  Turn {i + 1}
                </button>
              ))}
            </nav>
          )}
        </>
      )}

      <Inspector request={t.request} response={t.response} />
    </article>
  );
}
