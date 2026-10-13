import { liveAvailable, useLive } from "../lib/live";
import type { Run } from "../lib/useLiveRun";

/** Send / Stop / setup prompt, shared by every live box. */
export function LiveControls({
  ready,
  model,
  run,
  edited,
  onSend,
  onStop,
  setupLabel = "set up a live model",
}: {
  ready: boolean;
  model: string;
  run?: Run;
  edited: boolean;
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
        {run?.pending ? (
          <button onClick={onStop}>Stop</button>
        ) : (
          <button className="primary" onClick={onSend}>
            {run && !edited ? "Send again" : "Send"}
          </button>
        )}
        <span className="muted small">
          Live: <code>{model}</code>
        </span>
      </div>
      {run?.pending && (
        <p className="muted" role="status">
          Waiting for the model…
        </p>
      )}
    </>
  );
}
