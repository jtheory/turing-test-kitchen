import { looksBase } from "../src/lib/models";

// OpenRouter's model list is large and changes often. We keep a trimmed,
// stably sorted snapshot so changes show up as small diffs.

export interface RawModel {
  id: string;
  name?: string;
  created?: number;
  context_length?: number;
  pricing?: Record<string, string>;
  architecture?: Record<string, unknown>;
  supported_parameters?: string[];
  top_provider?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface ModelEntry {
  id: string;
  name?: string;
  created?: string;
  context_length?: number;
  /** USD per million tokens, converted from OpenRouter's per-token strings. */
  usd_per_mtok?: { prompt?: number; completion?: number };
  architecture?: Record<string, unknown>;
  supported_parameters?: string[];
  top_provider?: Record<string, unknown>;
  /** Our guess from the id or name. Check the model page before relying on it. */
  looks_base: boolean;
}

export function trimModel(m: RawModel): ModelEntry {
  const perM = (v?: string) => (v === undefined || v === "" || isNaN(Number(v)) ? undefined : round(Number(v) * 1e6));
  const price = m.pricing ? { prompt: perM(m.pricing.prompt), completion: perM(m.pricing.completion) } : undefined;
  return {
    id: m.id,
    name: m.name,
    created: m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : undefined,
    context_length: m.context_length,
    usd_per_mtok: price,
    architecture: m.architecture,
    supported_parameters: m.supported_parameters ? [...m.supported_parameters].sort() : undefined,
    top_provider: m.top_provider,
    looks_base: looksBase(m.id) || looksBase(m.name ?? ""),
  };
}

export function snapshot(raw: RawModel[], fetchedAt: Date) {
  return {
    source: "https://openrouter.ai/api/v1/models",
    fetched_at: fetchedAt.toISOString(),
    count: raw.length,
    models: raw.map(trimModel).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/** A short human summary for the terminal. */
export function summarize(models: ModelEntry[]): string {
  const base = models.filter((m) => m.looks_base);
  const priced = models
    .filter((m) => !m.looks_base && m.usd_per_mtok?.completion !== undefined && m.usd_per_mtok.completion > 0)
    .sort((a, b) => a.usd_per_mtok!.completion! - b.usd_per_mtok!.completion!)
    .slice(0, 10);
  const fmt = (m: ModelEntry) =>
    `  ${m.id}  ($${m.usd_per_mtok?.prompt ?? "?"} in / $${m.usd_per_mtok?.completion ?? "?"} out per M tokens, ctx ${m.context_length ?? "?"})`;
  return [
    `${models.length} models.`,
    `Labelled as base models (${base.length}):`,
    ...(base.length ? base.map(fmt) : ["  none"]),
    `Cheapest 10 other paid models by output price:`,
    ...priced.map(fmt),
  ].join("\n");
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
