import { useCallback, useState } from "react";

// Everything this site keeps lives in this browser's localStorage, under one
// prefix. Storage can be missing or blocked (private windows, previews), so
// every access is guarded and the site works without it.

const PREFIX = "ttk:";

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not available: keep working in memory only.
  }
}

/** Like useState, but survives a reload. */
export function useStoredState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, initial));
  const set = useCallback(
    (v: T) => {
      setValue(v);
      writeStored(key, v);
    },
    [key],
  );
  return [value, set];
}
