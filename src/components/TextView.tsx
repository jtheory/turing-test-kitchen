import { Fragment, type ReactNode } from "react";

/**
 * Show text exactly, with line breaks marked and special tokens highlighted,
 * so nothing (not even a trailing space) is hidden.
 */
export function TextView({ text, tokens = [], label }: { text: string; tokens?: string[]; label?: string }) {
  return (
    <pre className="textview" aria-label={label}>
      {text === "" ? <span className="muted">(empty)</span> : renderWithTokens(text, tokens)}
    </pre>
  );
}

function renderWithTokens(text: string, tokens: string[]): ReactNode[] {
  const sorted = [...tokens].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const parts = sorted.length ? text.split(new RegExp(`(${sorted.join("|")})`)) : [text];
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="token" title="Special token">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{renderWhitespace(part)}</Fragment>
    ),
  );
}

function renderWhitespace(s: string): ReactNode[] {
  return s.split("\n").flatMap((line, i, all) => {
    const out: ReactNode[] = [];
    const trailing = line.match(/ +$/)?.[0] ?? "";
    out.push(line.slice(0, line.length - trailing.length));
    if (trailing) out.push(<span key={`s${i}`} className="ws" title="Trailing space">{"·".repeat(trailing.length)}</span>);
    if (i < all.length - 1) out.push(<span key={`n${i}`} className="ws" title="Line break">↵{"\n"}</span>);
    return out;
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
