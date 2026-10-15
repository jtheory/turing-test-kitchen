import { useId, useState } from "react";
import { DEFAULT_BASE_URL, DEFAULT_CHAT_MODEL, useLive } from "../lib/live";

/** Settings for live model access with your own key. Development builds only. */
export function LivePanel() {
  const { settings, update, chatReady, setPanelOpen } = useLive();
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsNote, setModelsNote] = useState<string>();
  const listId = useId();
  const chosen = models.find((m) => m.id === settings.chatModel.trim());

  async function loadModels() {
    setModelsNote("Loading…");
    try {
      const headers: Record<string, string> = {};
      if (settings.apiKey.trim()) headers.authorization = `Bearer ${settings.apiKey.trim()}`;
      const res = await fetch(settings.baseUrl.trim().replace(/\/+$/, "") + "/v1/models", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data?: ModelInfo[] };
      const list = (json.data ?? []).sort((a, b) => a.id.localeCompare(b.id));
      setModels(list);
      setModelsNote(`${list.length} models loaded. Clear the field and start typing to search them.`);
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
        <span className="row">
          <input
            list={listId}
            value={settings.chatModel}
            placeholder={DEFAULT_CHAT_MODEL}
            onChange={(e) => update({ chatModel: e.target.value })}
            spellCheck={false}
          />
          <button type="button" onClick={loadModels}>
            {models.length ? "Reload list" : "Load list"}
          </button>
        </span>
      </label>
      <datalist id={listId}>
        {models.map((m) => (
          <option key={m.id} value={m.id} label={m.name} />
        ))}
      </datalist>
      {chosen && (
        <p className="muted small">
          {chosen.name ?? chosen.id}: ${perM(chosen.pricing?.prompt)} per million tokens read, $
          {perM(chosen.pricing?.completion)} per million written.
        </p>
      )}
      {modelsNote && <p className="muted small">{modelsNote}</p>}

      {settings.apiKey && (
        <button className="link danger" onClick={() => update({ apiKey: "" })}>
          Forget key
        </button>
      )}
    </section>
  );
}

interface ModelInfo {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
}

/** OpenRouter prices are USD per token, as strings. */
function perM(v?: string): string {
  const n = Number(v);
  return v === undefined || isNaN(n) ? "?" : String(Math.round(n * 1e6 * 1000) / 1000);
}
