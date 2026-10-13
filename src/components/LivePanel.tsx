import { useId, useState } from "react";
import { DEFAULT_BASE_URL, useLive } from "../lib/live";

/** Settings for live model access with your own key. Development builds only. */
export function LivePanel() {
  const { settings, update, ready, setPanelOpen } = useLive();
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
        <span className={`status ${ready ? "status-on" : ""}`}>{ready ? "Ready" : "Not set up"}</span>
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
        <span>Base model for layer 1 (not a chat or instruct model)</span>
        <span className="row">
          <input
            list={listId}
            value={settings.baseModel}
            placeholder="e.g. a model id ending in -base"
            onChange={(e) => update({ baseModel: e.target.value })}
            spellCheck={false}
          />
          <button type="button" onClick={loadModels}>
            Load list
          </button>
        </span>
        <datalist id={listId}>
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>
      {modelsNote && <p className="muted small">{modelsNote}</p>}

      {settings.apiKey && (
        <button className="link danger" onClick={() => update({ apiKey: "" })}>
          Forget key
        </button>
      )}
    </section>
  );
}

/** A guess from the name only; providers don't label base models consistently. */
export function looksBase(label: string): boolean {
  return /(^|[-_/.(\s])base($|[-_.:)\s])/i.test(label) && !/instruct|chat/i.test(label);
}
