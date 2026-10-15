import type { ReactNode } from "react";
import { liveAvailable, useLive } from "../lib/live";

/** Send / Stop / setup prompt, shared by every live box. */
export function LiveControls({
  ready,
  models,
  pending,
  sendAgain,
  onSend,
  onStop,
  setupLabel = "set up a live model",
}: {
  ready: boolean;
  /** Which model(s) a send goes to. */
  models: ReactNode;
  pending: boolean;
  /** The current text was already sent, so the button reads "Send again". */
  sendAgain: boolean;
  onSend: () => void;
  onStop: () => void;
  setupLabel?: string;
}) {
  const live = useLive();
  if (!liveAvailable) {
    return <p className="muted">Live replies aren't available yet. You can still see the exact request your text becomes.</p>;
  }
  if (!ready) {
    return (
      <p className="muted">
        To send this to a real model,{" "}
        <button className="link" onClick={() => live.setPanelOpen(true)}>
          {setupLabel}
        </button>
        .
      </p>
    );
  }
  return (
    <>
      <div className="actions">
        {pending ? (
          <button onClick={onStop}>Stop</button>
        ) : (
          <button className="primary" onClick={onSend}>
            {sendAgain ? "Send again" : "Send"}
          </button>
        )}
        <span className="muted small">Live: {models}</span>
      </div>
      {pending && (
        <p className="muted" role="status">
          Waiting for the model…
        </p>
      )}
    </>
  );
}
