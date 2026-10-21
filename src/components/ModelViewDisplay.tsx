import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { explanations, type ModelView, type Segment } from "../lib/modelView";

/**
 * "What the model gets": every part of the input, with everything except the
 * visitor's newest words faded. Pointing at or tapping a faded part makes it
 * legible and explains it.
 */
export function ModelViewDisplay({ view, preview }: { view: ModelView; preview?: boolean }) {
  const [active, setActive] = useState<number>();
  const explainId = useId();
  const textRef = useRef<HTMLPreElement>(null);
  const signature = view.segments.map((s) => s.text.length).join(",");

  // A new request: clear the explanation and show the newest part (the end).
  useEffect(() => {
    setActive(undefined);
    const el = textRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [signature]);
  const current = active === undefined ? undefined : view.segments[active];

  const props = (i: number, s: Segment) =>
    s.kind === "own"
      ? {}
      : {
          role: "button" as const,
          tabIndex: 0,
          "aria-describedby": explainId,
          "aria-pressed": active === i,
          // Hover only for real mice: a tap also fires pointer events, and must not toggle twice.
          onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setActive(i),
          onFocus: () => setActive(i),
          onClick: () => setActive(i),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActive(i);
            } else if (e.key === "Escape") setActive(undefined);
          },
        };

  const cls = (i: number, s: Segment) =>
    `seg seg-${s.kind}${active !== undefined && view.segments[active]?.kind === s.kind ? " is-lit" : ""}${active === i ? " is-active" : ""}`;

  return (
    <div className={`model-view${preview ? " is-preview" : ""}`}>
      {view.form === "text" ? (
        <pre className="mv-text" aria-label="The text the model reads" ref={textRef}>
          {view.segments.map((s, i) => (
            <span key={i} className={cls(i, s)} {...props(i, s)}>
              {s.kind === "markup" ? breakable(s.text) : s.text}
            </span>
          ))}
        </pre>
      ) : (
        <ol className="mv-messages" aria-label="The messages sent to the model">
          {view.segments.map((s, i) => (
            <li key={i} className={cls(i, s)} {...props(i, s)}>
              <span className="mv-role">{s.role}</span>
              <span className="mv-content">{s.text}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mv-explain" id={explainId} aria-live="polite">
        {current ? (
          <>
            <strong>{explanations[current.kind].label}.</strong> {explanations[current.kind].text}
          </>
        ) : (
          <span className="muted">Point at or tap any faded part to see what it is.</span>
        )}
      </p>
    </div>
  );
}

/** Let long runs of markers wrap between markers rather than mid-marker. */
function breakable(text: string): ReactNode {
  return text.split(/(?<=\|>|>)/).map((part, i) => (
    <Fragment key={i}>
      {part}
      <wbr />
    </Fragment>
  ));
}
