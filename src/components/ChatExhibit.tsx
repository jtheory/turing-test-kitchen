import { useEffect, useRef, useState } from "react";
import { assemble, responseText, responseUsage, serializeBody } from "../lib/assemble";
import { liveAvailable, useLive } from "../lib/live";
import { modelLabel } from "../lib/models";
import { modelView } from "../lib/modelView";
import { send } from "../lib/send";
import type { ChatMessage, ModelRequest, RecordedExample, Settings } from "../lib/types";
import { describeFailure } from "../lib/useLiveRun";
import { ModelViewDisplay } from "./ModelViewDisplay";

interface Turn {
  request: ModelRequest;
  response?: unknown;
  failure?: { summary: string; raw?: string };
}

const SETTINGS: Settings = { max_tokens: 300 };

/**
 * The core exhibit: a chat ("What you see") next to everything the model is
 * actually sent ("What the model gets"). Live by default; a recorded real
 * conversation when live replies aren't available.
 */
export function ChatExhibit({
  mode,
  model,
  fallback,
}: {
  mode: "single" | "transcript";
  model: string;
  fallback?: RecordedExample;
}) {
  const live = useLive();
  const isLive = live.chatReady;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [shown, setShown] = useState<number>(); // which turn the model view shows; undefined = latest
  const [pane, setPane] = useState<"chat" | "model">("chat");
  const [unseen, setUnseen] = useState(false);
  const abortRef = useRef<AbortController>(undefined);
  const chatEnd = useRef<HTMLLIElement>(null);

  // Recorded fallback: the same exhibit, read-only.
  const recorded = !isLive && fallback ? fromRecorded(fallback) : undefined;
  const allTurns = recorded?.turns ?? turns;
  const allMessages = recorded?.messages ?? messages;

  useEffect(() => {
    chatEnd.current?.scrollIntoView?.({ block: "nearest" });
  }, [allMessages.length, pending]);

  const index = shown ?? allTurns.length - 1;
  const turn = allTurns[index];
  const previewing = !recorded && draft.trim() !== "" && !pending;
  const previewRequest = previewing
    ? assemble({ mode, model, settings: SETTINGS }, { messages: [...messages, { role: "user", content: draft }] })
    : undefined;
  const viewRequest = previewRequest ?? turn?.request;
  const reply = !previewRequest && turn?.response !== undefined ? responseText(turn.response) : undefined;

  async function submit() {
    const content = draft.trim();
    if (!content || pending) return;
    const next = [...messages, { role: "user" as const, content }];
    const request = assemble({ mode, model, settings: SETTINGS }, { messages: next });
    setMessages(next);
    setDraft("");
    setShown(undefined);
    setPending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await send(request, live.settings, fetch, controller.signal);
      const text = responseText(response) ?? "";
      setTurns((t) => [...t, { request, response }]);
      setMessages((m) => [...m, { role: "assistant", content: text }]);
      if (pane === "chat") setUnseen(true);
    } catch (e) {
      const failure = controller.signal.aborted ? { summary: "Stopped before a reply came back." } : describeFailure(e);
      setTurns((t) => [...t, { request, failure }]);
      // Take the unanswered message back out of the chat, and back into the box.
      setMessages(messages);
      setDraft(content);
    } finally {
      setPending(false);
    }
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([]);
    setTurns([]);
    setDraft("");
    setShown(undefined);
  }

  const lastFailure = !recorded ? turns.at(-1)?.failure : undefined;

  return (
    <section className="exhibit" aria-label="Chat and what the model gets">
      {recorded && (
        <p className="exhibit-banner" role="status">
          Live replies are off right now, so here's a recorded real conversation instead: {modelLabel(fallback!.model)},{" "}
          {new Date(fallback!.captured_at).toLocaleDateString(undefined, { dateStyle: "medium" })}.
          {liveAvailable && (
            <>
              {" "}
              <button className="link" onClick={() => live.setPanelOpen(true)}>
                Set up a live model
              </button>
            </>
          )}
        </p>
      )}

      <div className="exhibit-switch" role="tablist" aria-label="View">
        <button role="tab" aria-selected={pane === "chat"} onClick={() => setPane("chat")}>
          What you see
        </button>
        <button
          role="tab"
          aria-selected={pane === "model"}
          onClick={() => {
            setPane("model");
            setUnseen(false);
          }}
        >
          What the model gets{unseen && <span className="dot dot-on" aria-label="(updated)" />}
        </button>
      </div>

      <div className="exhibit-panes" data-pane={pane}>
        <div className="pane pane-chat">
          <h4 className="pane-title">What you see</h4>
          <ol className="chat" aria-label="Conversation" aria-live="polite">
            {allMessages.length === 0 && <li className="chat-empty muted">Say something to start.</li>}
            {allMessages.map((m, i) => (
              <li key={i} className={`bubble bubble-${m.role === "user" ? "user" : "assistant"}`}>
                {m.content}
              </li>
            ))}
            {pending && <li className="bubble bubble-assistant bubble-typing">…</li>}
            <li ref={chatEnd} aria-hidden="true" />
          </ol>

          {!recorded && (
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <textarea
                aria-label="Your message"
                value={draft}
                rows={2}
                placeholder={messages.length ? "Reply…" : "Try: Hi, my name is John"}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
              {pending ? (
                <button type="button" onClick={() => abortRef.current?.abort()}>
                  Stop
                </button>
              ) : (
                <button className="primary" type="submit" disabled={!draft.trim()}>
                  Send
                </button>
              )}
            </form>
          )}
          {lastFailure && <p className="error small">{lastFailure.summary}</p>}

          <p className="pane-foot muted small">
            {recorded ? "A recorded conversation." : "This chat isn't saved anywhere. Reload the page and it's gone."}
            {!recorded && messages.length > 0 && (
              <>
                {" "}
                <button className="link" onClick={newChat}>
                  New chat
                </button>
              </>
            )}
          </p>
        </div>

        <div className="pane pane-model">
          <div className="pane-head">
            <h4 className="pane-title">What the model gets</h4>
            {!previewRequest && allTurns.length > 1 && (
              <span className="stepper" aria-label="Which message">
                <button aria-label="Earlier message" disabled={index === 0} onClick={() => setShown(index - 1)}>
                  ‹
                </button>
                <span className="small">
                  Message {index + 1} of {allTurns.length}
                </span>
                <button
                  aria-label="Later message"
                  disabled={index >= allTurns.length - 1}
                  onClick={() => setShown(index + 1 >= allTurns.length - 1 ? undefined : index + 1)}
                >
                  ›
                </button>
              </span>
            )}
          </div>
          {viewRequest ? (
            <>
              {previewRequest && <p className="small muted">Preview: this is what will be sent when you press Send.</p>}
              <ModelViewDisplay view={modelView(viewRequest, reply)} preview={!!previewRequest} />
            </>
          ) : (
            <p className="muted">Nothing sent yet. Start typing and you'll see exactly what the model will get.</p>
          )}
        </div>
      </div>

      {turn && !previewRequest && <Details turn={turn} />}
    </section>
  );
}

function Details({ turn }: { turn: Turn }) {
  const usage = turn.response === undefined ? undefined : responseUsage(turn.response);
  return (
    <details className="exhibit-details">
      <summary>Details</summary>
      <p className="small muted">
        Model <code>{turn.request.body.model}</code>
        {usage?.read !== undefined && (
          <>
            {" "}
            · read {usage.read} and wrote {usage.wrote} tokens (word pieces)
            {usage.reasoning ? `, ${usage.reasoning} of them hidden reasoning` : ""}
          </>
        )}
        {usage?.costUsd !== undefined && <> · cost ${usage.costUsd.toFixed(5).replace(/0+$/, "")}</>}
      </p>
      <h5>Request, exactly as sent</h5>
      <pre className="json">{serializeBody(turn.request)}</pre>
      <h5>Response, exactly as received</h5>
      {turn.failure ? (
        <>
          <p className="error small">{turn.failure.summary}</p>
          {turn.failure.raw !== undefined && <pre className="json">{turn.failure.raw}</pre>}
        </>
      ) : (
        <pre className="json">{JSON.stringify(turn.response, null, 2)}</pre>
      )}
    </details>
  );
}

function fromRecorded(ex: RecordedExample): { turns: Turn[]; messages: ChatMessage[] } {
  const messages: ChatMessage[] = [];
  for (const t of ex.turns) {
    if (t.request.kind === "chat") {
      const user = t.request.body.messages.at(-1);
      if (user) messages.push(user);
    }
    messages.push({ role: "assistant", content: responseText(t.response) ?? "" });
  }
  return { turns: ex.turns, messages };
}
