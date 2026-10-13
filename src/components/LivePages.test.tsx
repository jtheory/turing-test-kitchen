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

  it("defaults to Sonnet 5.5 and sends only the one message (test stand-in reply)", async () => {
    store({});
    const fetchMock = stubFetch({ choices: [{ message: { role: "assistant", content: "TEST-REPLY" } }] });
    withLive(<BareModel />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect((await screen.findAllByText("TEST-REPLY")).length).toBeGreaterThan(0);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe("https://provider.test/api/v1/chat/completions");
    expect(JSON.parse(init.body)).toEqual({
      model: "anthropic/claude-sonnet-5.5",
      messages: [{ role: "user", content: "Hi my name is John" }],
      max_tokens: 300,
    });
  });

  it("shows the provider's exact error body", async () => {
    store({});
    stubFetch({ error: "Insufficient credits" }, 402);
    withLive(<BareModel />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/HTTP 402/)).toBeTruthy();
    expect(screen.getByText('{"error":"Insufficient credits"}')).toBeTruthy();
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
  it("needs a base model, not just a key", () => {
    store({});
    withLive(<DocumentPlayground />);
    expect(screen.getByRole("button", { name: "set a base model" })).toBeTruthy();
  });

  it("sends the text to /v1/completions and shows the continuation (test stand-in reply)", async () => {
    store({ baseModel: "some/base-model" });
    const fetchMock = stubFetch({ choices: [{ text: "TEST-CONTINUATION" }] });
    withLive(<DocumentPlayground />);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect((await screen.findAllByText("TEST-CONTINUATION")).length).toBeGreaterThan(0);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe("https://provider.test/api/v1/completions");
    expect(JSON.parse(init.body)).toMatchObject({ model: "some/base-model", prompt: "Hi my name is John" });
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
