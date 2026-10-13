import { describe, expect, it } from "vitest";
import { snapshot, summarize } from "./modelsLib";

// Shaped like OpenRouter's /models response; values are test data.
const raw = [
  { id: "z/chat-model", name: "Z: Chat", created: 1700000000, context_length: 8192, pricing: { prompt: "0.0000001", completion: "0.0000004" } },
  { id: "meta-llama/llama-3.1-405b", name: "Meta: Llama 3.1 405B (base)", pricing: { prompt: "0.000004", completion: "0.000004" } },
  { id: "a/free", name: "A: Free", pricing: { prompt: "0", completion: "0" }, supported_parameters: ["top_p", "max_tokens"] },
];

describe("models snapshot", () => {
  it("sorts by id, converts prices to USD per million tokens, and flags base models by name", () => {
    const s = snapshot(raw, new Date("2026-10-13T00:00:00Z"));
    expect(s.models.map((m) => m.id)).toEqual(["a/free", "meta-llama/llama-3.1-405b", "z/chat-model"]);
    const chat = s.models[2];
    expect(chat.usd_per_mtok).toEqual({ prompt: 0.1, completion: 0.4 });
    expect(chat.created).toBe("2023-11-14");
    expect(s.models[1].looks_base).toBe(true);
    expect(s.models[0].supported_parameters).toEqual(["max_tokens", "top_p"]);
  });

  it("summarizes base models and cheapest paid models", () => {
    const text = summarize(snapshot(raw, new Date()).models);
    expect(text).toContain("Labelled as base models (1)");
    expect(text).toContain("z/chat-model");
    expect(text).not.toMatch(/Cheapest[\s\S]*a\/free/);
  });
});
