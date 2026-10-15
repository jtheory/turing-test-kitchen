// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BareModel } from "./BareModel";
import { DocumentPlayground } from "./UnderTheHood";
import { LiveProvider } from "../lib/live";
import { looksBase } from "../lib/models";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function store(settings: Record<string, string>) {
  localStorage.setItem("ttk:live", JSON.stringify({ baseUrl: "https://provider.test/api", apiKey: "sk-test", ...settings }));
}

function stubFetch(json: unknown, status = 200) {
  const fetchMock = vi.fn(async () => ({ ok: status < 400, status, text: async () => JSON.stringify(json) }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const withLive = (el: React.ReactNode) => render(<LiveProvider>{el}</LiveProvider>);

describe("BareModel (layer 1)", () => {
  it("starts with John and offers setup when no key is stored", () => {
    withLive(<BareModel />);
    expect(screen.getByDisplayValue("Hi my name is John")).toBeTruthy();
    expect(screen.getByRole("button", { name: "set up a live model" })).toBeTruthy();
  });

  it("sends the one message to Sonnet 5.5 and Llama, and shows what Llama reads (test stand-in replies)", async () => {
    store({});
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      const model = JSON.parse(init.body).model as string;
      const json = { choices: [{ message: { role: "assistant", content: `TEST-REPLY from ${model}` } }] };
      return { ok: true, status: 200, text: async () => JSON.stringify(json) };
    });
    vi.stubGlobal("fetch", fetchMock);
    withLive(<BareModel />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect((await screen.findAllByText("TEST-REPLY from anthropic/claude-sonnet-5.5")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("TEST-REPLY from meta-llama/llama-3.1-8b-instruct")).length).toBeGreaterThan(0);

    const bodies = fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(init.body)]);
    expect(bodies).toEqual([
      ["https://provider.test/api/v1/chat/completions", { model: "anthropic/claude-sonnet-5.5", messages: [{ role: "user", content: "Hi my name is John" }], max_tokens: 300 }],
      ["https://provider.test/api/v1/chat/completions", { model: "meta-llama/llama-3.1-8b-instruct", messages: [{ role: "user", content: "Hi my name is John" }], max_tokens: 300 }],
    ]);
    // Only the open model gets the "what the model reads" view.
    expect(screen.getAllByText("What the model reads")).toHaveLength(1);
    expect(screen.getAllByText(/Today Date: 26 Jul 2024/).length).toBeGreaterThan(0);
  });

  it("shows the provider's exact error body", async () => {
    store({});
    stubFetch({ error: "Insufficient credits" }, 402);
    withLive(<BareModel />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect((await screen.findAllByText(/HTTP 402/)).length).toBe(2);
    expect(screen.getAllByText('{"error":"Insufficient credits"}').length).toBe(2);
  });

  it("remembers the message across reloads", () => {
    withLive(<BareModel />);
    fireEvent.change(screen.getByDisplayValue("Hi my name is John"), { target: { value: "Hello?" } });
    cleanup();
    withLive(<BareModel />);
    expect(screen.getByDisplayValue("Hello?")).toBeTruthy();
  });
});

describe("DocumentPlayground (under the hood)", () => {
  it("shows the exact request but never sends it", () => {
    store({});
    const fetchMock = stubFetch({});
    withLive(<DocumentPlayground />);
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
    expect(screen.getAllByText("Hi my name is John").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("looksBase", () => {
  it("spots base labels and ignores chat models", () => {
    expect(looksBase("Meta: Llama 3.1 405B (base)")).toBe(true);
    expect(looksBase("qwen/qwen3-8b-base")).toBe(true);
    expect(looksBase("some/model-base-instruct")).toBe(false);
    expect(looksBase("database-helper")).toBe(false);
  });
});
