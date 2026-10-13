// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DocumentPlayground } from "./Layers";
import { LiveProvider } from "../lib/live";
import { looksBase } from "./LivePanel";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setUpLive() {
  localStorage.setItem(
    "ttk:live",
    JSON.stringify({ baseUrl: "https://provider.test/api", apiKey: "sk-test", baseModel: "some/base-model" }),
  );
}

const ui = () =>
  render(
    <LiveProvider>
      <DocumentPlayground />
    </LiveProvider>,
  );

describe("DocumentPlayground", () => {
  it("starts with John and offers setup when no key is stored", () => {
    ui();
    expect(screen.getByDisplayValue("Hi my name is John")).toBeTruthy();
    expect(screen.getByRole("button", { name: "set up a live model" })).toBeTruthy();
  });

  it("sends the text and shows the continuation (test stand-in reply)", async () => {
    setUpLive();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ choices: [{ text: "TEST-CONTINUATION" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect((await screen.findAllByText("TEST-CONTINUATION")).length).toBeGreaterThan(0);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe("https://provider.test/api/v1/completions");
    expect(JSON.parse(init.body)).toMatchObject({ model: "some/base-model", prompt: "Hi my name is John" });
    expect(screen.getByRole("button", { name: "Send again" })).toBeTruthy();
  });

  it("shows the provider's exact error body", async () => {
    setUpLive();
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 402, text: async () => '{"error":"Insufficient credits"}' }));
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/HTTP 402/)).toBeTruthy();
    expect(screen.getByText('{"error":"Insufficient credits"}')).toBeTruthy();
  });

  it("remembers the document across reloads", () => {
    ui();
    fireEvent.change(screen.getByDisplayValue("Hi my name is John"), { target: { value: "Dear diary" } });
    cleanup();
    ui();
    expect(screen.getByDisplayValue("Dear diary")).toBeTruthy();
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
