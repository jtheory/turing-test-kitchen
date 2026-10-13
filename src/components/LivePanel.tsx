import { useId, useState } from "react";
import { DEFAULT_BASE_URL, DEFAULT_CHAT_MODEL, useLive } from "../lib/live";
import { looksBase } from "../lib/models";

/** Settings for live model access with your own key. Development builds only. */
export function LivePanel() {
  const { settings, update, chatReady, setPanelOpen } = useLive();
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsNote, setModelsNote] = useState<string>();
  const listId = useId();

  async function loadModels() {
    setModelsNote("Loading…");
    try {
      const headers: Record<string, string> = {};
      if (settings.apiKey.trim()) headers.authorization = `Bearer ${settings.apiKey.trim()}`;
      const res = await fetch(settings.baseUrl.trim().replace(/\/+$/, "") + "/v1/models", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data?: Array<{ id: string; name?: string }> };
      const list = json.data ?? [];
      setModels(list.map((m) => m.id).sort());
      const base = list.filter((m) => looksBase(m.id) || looksBase(m.name ?? "")).map((m) => m.id);
      setModelsNote(
        `${list.length} models. ` +
          (base.length
            ? `Labelled as base: ${base.join(", ")}.`
            : "None are labelled as base models. Labels vary, so check a model's page before ruling it out."),
      );
    } catch (e) {
      setModelsNote(`Couldn't load the model list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <section className="live-panel" aria-label="Live model settings">
      <div className="live-panel-head">
        <h2>Live model</h2>
        <span className={`status ${chatReady ? "status-on" : ""}`}>{chatReady ? "Ready" : "Not set up"}</span>
        <button className="link" onClick={() => setPanelOpen(false)}>
          Close
        </button>
      </div>
      <p className="muted">
        Development only. Your key is kept in this browser's local storage and sent only to the provider address
        below.
      </p>

      <label className="field">
        <span>Provider address (OpenAI-compatible)</span>
        <input
          type="url"
          value={settings.baseUrl}
          placeholder={DEFAULT_BASE_URL}
          onChange={(e) => update({ baseUrl: e.target.value })}
          spellCheck={false}
        />
      </label>

      <label className="field">
        <span>API key</span>
        <span className="row">
          <input
            type={showKey ? "text" : "password"}
            value={settings.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShowKey(!showKey)} aria-pressed={showKey}>
            {showKey ? "Hide" : "Show"}
          </button>
        </span>
      </label>

      <label className="field">
        <span>Chat model for the tour</span>
        <input
          list={listId}
          value={settings.chatModel}
          placeholder={DEFAULT_CHAT_MODEL}
          onChange={(e) => update({ chatModel: e.target.value })}
          spellCheck={false}
        />
      </label>

      <label className="field">
        <span>Base model for "Under the hood" (optional; not a chat or instruct model)</span>
        <span className="row">
          <input
            list={listId}
            value={settings.baseModel}
            placeholder="none set"
            onChange={(e) => update({ baseModel: e.target.value })}
            spellCheck={false}
          />
          <button type="button" onClick={loadModels}>
            Load list
          </button>
        </span>
      </label>
      <datalist id={listId}>
        {models.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {modelsNote && <p className="muted small">{modelsNote}</p>}

      {settings.apiKey && (
        <button className="link danger" onClick={() => update({ apiKey: "" })}>
          Forget key
        </button>
      )}
    </section>
  );
}
