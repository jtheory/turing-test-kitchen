import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useStoredState } from "./storage";

/**
 * Live model access with the developer's own key ("bring your own key").
 * Development builds only for now: the key is stored in this browser's
 * localStorage and sent only to the provider URL below.
 */
export const liveAvailable = import.meta.env.DEV;

export const DEFAULT_BASE_URL = "https://openrouter.ai/api";

export interface LiveSettings {
  baseUrl: string;
  apiKey: string;
  /** Base (not chat-tuned) model id, used for layer 1. */
  baseModel: string;
}

interface LiveContext {
  settings: LiveSettings;
  update: (patch: Partial<LiveSettings>) => void;
  /** True when a key and a base model are set. */
  ready: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const Ctx = createContext<LiveContext | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useStoredState<LiveSettings>("live", {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: "",
    baseModel: "",
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const value = useMemo<LiveContext>(
    () => ({
      settings,
      update: (patch) => setSettings({ ...settings, ...patch }),
      ready: liveAvailable && !!settings.apiKey.trim() && !!settings.baseModel.trim() && !!settings.baseUrl.trim(),
      panelOpen,
      setPanelOpen,
    }),
    [settings, setSettings, panelOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLive outside LiveProvider");
  return c;
}
