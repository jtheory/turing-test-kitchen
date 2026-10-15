import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useStoredState } from "./storage";

/**
 * Live model access with the developer's own key ("bring your own key").
 * Development builds only for now: the key is stored in this browser's
 * localStorage and sent only to the provider URL below.
 */
export const liveAvailable = import.meta.env.DEV;

export const DEFAULT_BASE_URL = "https://openrouter.ai/api";
export const DEFAULT_CHAT_MODEL = "anthropic/claude-sonnet-5.5";

export interface LiveSettings {
  baseUrl: string;
  apiKey: string;
  /** Chat model for the tour. */
  chatModel: string;
}

const defaults: LiveSettings = { baseUrl: DEFAULT_BASE_URL, apiKey: "", chatModel: DEFAULT_CHAT_MODEL };

interface LiveContext {
  settings: LiveSettings;
  update: (patch: Partial<LiveSettings>) => void;
  /** A key and a chat model are set. */
  chatReady: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const Ctx = createContext<LiveContext | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [stored, setSettings] = useStoredState<Partial<LiveSettings>>("live", defaults);
  // Fill in fields added since the settings were first saved.
  const settings: LiveSettings = {
    baseUrl: stored.baseUrl ?? defaults.baseUrl,
    apiKey: stored.apiKey ?? defaults.apiKey,
    chatModel: stored.chatModel ?? defaults.chatModel,
  };
  const [panelOpen, setPanelOpen] = useState(false);
  const value = useMemo<LiveContext>(
    () => ({
      settings,
      update: (patch) => setSettings({ ...settings, ...patch }),
      chatReady: hasEndpoint(settings) && !!settings.chatModel.trim(),
      panelOpen,
      setPanelOpen,
    }),
    [stored, setSettings, panelOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLive outside LiveProvider");
  return c;
}

function hasEndpoint(s: LiveSettings): boolean {
  return liveAvailable && !!s.apiKey.trim() && !!s.baseUrl.trim();
}
