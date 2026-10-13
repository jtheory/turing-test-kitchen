import { assemble, responseText } from "../lib/assemble";
import { useLive } from "../lib/live";
import { useStoredState } from "../lib/storage";
import type { Settings } from "../lib/types";
import { useLiveRun } from "../lib/useLiveRun";
import { Inspector } from "./Inspector";
import { LiveControls } from "./LiveControls";

const SETTINGS: Settings = { max_tokens: 300 };

/** Layer 1: one message to the chat model, with nothing else added. */
export function BareModel() {
  const live = useLive();
  const [message, setMessage] = useStoredState("bare.message", "Hi my name is John");
  const { run, go, stop } = useLiveRun();

  const model = live.settings.chatModel.trim() || "(chat model)";
  const preview = assemble({ mode: "single", model, settings: SETTINGS }, { messages: [{ role: "user", content: message }] });
  const sent = run?.request.kind === "chat" ? run.request.body.messages[0]?.content : undefined;
  const edited = run !== undefined && sent !== message;
  const reply = run?.response === undefined ? undefined : responseText(run.response);

  return (
    <section className="playground">
      <h3>Try it: send one message</h3>
      <label className="field">
        <span>Your message</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
      </label>
      <LiveControls
        ready={live.chatReady}
        model={model}
        run={run}
        edited={edited}
        onSend={() => message.trim() && go(preview)}
        onStop={stop}
      />

      {reply !== undefined && (
        <ol className="chat" aria-label="The exchange">
          <li className="bubble bubble-user">{sent}</li>
          <li className="bubble bubble-assistant">{reply}</li>
        </ol>
      )}
      {edited && reply !== undefined && (
        <p className="muted small">You've edited your message since; send again to see the new version.</p>
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
