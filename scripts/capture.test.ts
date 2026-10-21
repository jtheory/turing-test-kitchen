import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { capture, type FetchLike } from "./captureLib";
import { specs } from "./specs";
import { validateExample } from "../src/lib/examples";
import type { RecordedExample } from "../src/lib/types";

// A stand-in server so the capture logic can be tested offline. Its replies
// are test data only and are never written to examples/.
function fakeServer() {
  const calls: Array<{ url: string; body: unknown; headers: Record<string, string> }> = [];
  const fetchFn: FetchLike = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    const reply = `reply ${calls.length}`;
    const json = url.endsWith("/v1/completions")
      ? { choices: [{ text: reply }] }
      : { choices: [{ message: { role: "assistant", content: reply } }] };
    return { ok: true, status: 200, text: async () => JSON.stringify(json) };
  };
  return { calls, fetchFn };
}

const ep = { baseUrl: "http://test/", model: "test-model", provider: "test", apiKey: "k" };
const spec = (id: string) => specs.find((s) => s.id === id)!;

describe("capture", () => {
  it("sends documents to the completions endpoint", async () => {
    const { calls, fetchFn } = fakeServer();
    const ex = await capture(spec("hood-script"), ep, fetchFn, () => new Date("2026-01-01T00:00:00Z"));
    expect(calls[0].url).toBe("http://test/v1/completions");
    expect(calls[0].headers.authorization).toBe("Bearer k");
    expect(ex.turns[0].request.body).toEqual(calls[0].body);
    expect(ex.captured_at).toBe("2026-01-01T00:00:00.000Z");
    expect(ex.id).toBe("hood-script--test-model");
    expect(validateExample(ex, "hood-script--test-model")).toEqual([]);
  });

  it("puts the start token before documents and says so in the notes", async () => {
    const { calls, fetchFn } = fakeServer();
    const ex = await capture(spec("hood-empty"), { ...ep, startToken: "<|begin_of_text|>" }, fetchFn);
    expect((calls[0].body as { prompt: string }).prompt).toBe("<|begin_of_text|>");
    expect(ex.notes).toContain("<|begin_of_text|>");
    expect(validateExample(ex)).toEqual([]);
  });

  it("single mode sends each message alone", async () => {
    const { calls, fetchFn } = fakeServer();
    const ex = await capture(spec("memory-without"), ep, fetchFn);
    expect(calls).toHaveLength(2);
    expect((calls[1].body as { messages: unknown[] }).messages).toHaveLength(1);
    expect(validateExample(ex)).toEqual([]);
  });

  it("transcript mode feeds each real reply back into the transcript", async () => {
    const { calls, fetchFn } = fakeServer();
    await capture(spec("memory-with"), ep, fetchFn);
    expect((calls[1].body as { messages: unknown[] }).messages).toEqual([
      { role: "user", content: (spec("memory-with") as { userTurns: string[] }).userTurns[0] },
      { role: "assistant", content: "reply 1" },
      { role: "user", content: (spec("memory-with") as { userTurns: string[] }).userTurns[1] },
    ]);
  });

  it("never stores the API key", async () => {
    const { fetchFn } = fakeServer();
    const ex = await capture(spec("memory-with"), { ...ep, apiKey: "secret-key-123" }, fetchFn);
    expect(JSON.stringify(ex)).not.toContain("secret-key-123");
  });

  it("fails loudly on HTTP errors", async () => {
    const fetchFn: FetchLike = async () => ({ ok: false, status: 401, text: async () => "bad key" });
    await expect(capture(spec("hood-script"), ep, fetchFn)).rejects.toThrow("HTTP 401");
  });
});

describe("exampleId", () => {
  it("adds a slug of the model name", async () => {
    const { exampleId } = await import("./captureLib");
    expect(exampleId("bare-john", "anthropic/claude-sonnet-5.5")).toBe("bare-john--claude-sonnet-5.5");
    expect(exampleId("bare-john", "meta-llama/llama-3.1-8b-instruct")).toBe("bare-john--llama-3.1-8b-instruct");
  });
});

describe("recorded examples on disk", () => {
  const dir = join(import.meta.dirname, "..", "examples");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  it.each(files.length ? files : ["(none yet)"])("%s is valid", (file) => {
    if (file === "(none yet)") return;
    const ex = JSON.parse(readFileSync(join(dir, file), "utf8")) as RecordedExample;
    expect(validateExample(ex, file.replace(/\.json$/, ""))).toEqual([]);
  });
});
