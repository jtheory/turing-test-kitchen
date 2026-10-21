import { describe, expect, it } from "vitest";
import { assignLetters, blindReport, keyReport, runConversation } from "./bakeoffLib";
import type { FetchLike } from "../src/lib/send";

// Test stand-in server; its replies are test data only.
function fakeServer() {
  const bodies: Array<Record<string, unknown>> = [];
  const fetchFn: FetchLike = async (_url, init) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    const json = {
      choices: [{ message: { role: "assistant", content: `REPLY-${bodies.length}`, reasoning: "TEST-THOUGHT" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.001, completion_tokens_details: { reasoning_tokens: 3 } },
    };
    return { ok: true, status: 200, text: async () => JSON.stringify(json) };
  };
  return { bodies, fetchFn };
}

const convo = { id: "small-talk", turns: ["hey", "what's up"] };
const variant = { label: "thinking off", settings: { max_tokens: 50, reasoning: { enabled: false } } };

describe("bake-off", () => {
  it("sends the persona first, feeds real replies back, and records time, cost and reasoning", async () => {
    const { bodies, fetchFn } = fakeServer();
    let t = 0;
    const run = await runConversation("m", variant, convo, "You're Sam.", { baseUrl: "x" }, fetchFn, () => (t += 500));
    expect(bodies[1].messages).toEqual([
      { role: "system", content: "You're Sam." },
      { role: "user", content: "hey" },
      { role: "assistant", content: "REPLY-1" },
      { role: "user", content: "what's up" },
    ]);
    expect(bodies[0].reasoning).toEqual({ enabled: false });
    expect(run.turns[0]).toMatchObject({ reply: "REPLY-1", reasoning: "TEST-THOUGHT", ms: 500, costUsd: 0.001, reasoningTokens: 3 });
  });

  it("stops a conversation at the first failed turn, keeping the error", async () => {
    const fetchFn: FetchLike = async () => ({ ok: false, status: 404, text: async () => "no such model" });
    const run = await runConversation("m", variant, convo, "p", { baseUrl: "x" }, fetchFn);
    expect(run.turns).toHaveLength(1);
    expect(run.turns[0].error).toContain("404");
  });

  it("keeps the blind report blind: no model names, timings, costs or reasoning", async () => {
    const { fetchFn } = fakeServer();
    const results = [await runConversation("secret/model-x", variant, convo, "p", { baseUrl: "x" }, fetchFn)];
    const contestants = assignLetters([{ model: "secret/model-x", variant: "thinking off" }], () => 0);
    const blind = blindReport(results, contestants, "p", ["small-talk"]);
    expect(blind).toContain("**Bot A:** REPLY-1");
    expect(blind).not.toMatch(/model-x|thinking off|TEST-THOUGHT|\$0\.|0\.5s/);
    const key = keyReport(results, contestants);
    expect(key).toContain("secret/model-x");
    expect(key).toContain("TEST-THOUGHT");
  });

  it("gives every bot a distinct letter", () => {
    const pairs = Array.from({ length: 9 }, (_, i) => ({ model: `m${i}`, variant: "v" }));
    const letters = assignLetters(pairs).map((c) => c.letter);
    expect(new Set(letters).size).toBe(9);
    expect(letters.sort()).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
  });
});
