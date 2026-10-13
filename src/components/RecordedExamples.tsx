import { specs, type CaptureSpec } from "../../scripts/specs";
import { assemble } from "../lib/assemble";
import { examplesFor } from "../lib/examples";
import type { Section } from "../lib/types";
import { Inspector } from "./Inspector";
import { RecordedExampleView } from "./RecordedExampleView";

/** Recorded examples for a section, or an honest note that none are captured yet. */
export function RecordedExamples({ section }: { section: Section }) {
  const list = examplesFor(section);
  if (list.length > 0) return <>{list.map((e) => <RecordedExampleView key={e.id} example={e} />)}</>;
  const planned = specs.filter((s) => s.section === section);
  if (planned.length === 0) return null;
  return (
    <div className="empty">
      <p>
        <strong>No recorded examples yet.</strong> Examples on this site are always real model outputs, captured with{" "}
        <code>npm run capture</code>, never written by hand. These are waiting to be captured, with the exact first
        request each one will send:
      </p>
      {planned.map((s) => (
        <PlannedSpec key={s.id} spec={s} />
      ))}
    </div>
  );
}

function PlannedSpec({ spec }: { spec: CaptureSpec }) {
  const model = spec.mode === "document" ? "(base model chosen at capture)" : "(chat model chosen at capture)";
  const req =
    spec.mode === "document"
      ? assemble({ mode: "document", model, settings: spec.settings }, { document: spec.document })
      : assemble(
          { mode: spec.mode, model, settings: spec.settings },
          { messages: [{ role: "user", content: spec.userTurns[0] }] },
        );
  return (
    <article className="example planned">
      <header>
        <h3>{spec.title}</h3>
        <p className="badge badge-pending">Not captured yet</p>
        {spec.notes && <p>{spec.notes}</p>}
        {spec.mode !== "document" && spec.userTurns.length > 1 && (
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
