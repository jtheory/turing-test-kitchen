// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChatExhibit } from "./ChatExhibit";
import { LiveProvider } from "../lib/live";
import type { RecordedExample } from "../lib/types";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const MODEL = "meta-llama/llama-3.1-8b-instruct";

function goLive() {
  localStorage.setItem("ttk:live", JSON.stringify({ baseUrl: "https://provider.test/api", apiKey: "sk-test" }));
  // Test stand-in replies, numbered so each turn is distinguishable.
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    const n = JSON.parse(init.body).messages.filter((m: { role: string }) => m.role === "user").length;
    const json = { choices: [{ message: { role: "assistant", content: `TEST-REPLY-${n}` } }] };
    return { ok: true, status: 200, text: async () => JSON.stringify(json) };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const ui = (fallback?: RecordedExample) =>
  render(
    <LiveProvider>
      <ChatExhibit mode="transcript" model={MODEL} fallback={fallback} />
    </LiveProvider>,
  );

async function say(text: string, n: number) {
  fireEvent.change(screen.getByLabelText("Your message"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findAllByText(`TEST-REPLY-${n}`);
}

describe("ChatExhibit (layer 2)", () => {
  it("re-sends the whole chat with each new message", async () => {
    const fetchMock = goLive();
    ui();
    await say("Hi my name is John", 1);
    await say("What's my name?", 2);
    const second = JSON.parse((fetchMock.mock.calls[1] as unknown as [string, { body: string }])[1].body);
    expect(second.messages).toEqual([
      { role: "user", content: "Hi my name is John" },
      { role: "assistant", content: "TEST-REPLY-1" },
      { role: "user", content: "What's my name?" },
    ]);
    expect(screen.getByText("Message 2 of 2")).toBeTruthy();
  });

  it("previews what will be sent while typing, before anything is sent", () => {
    const fetchMock = goLive();
    ui();
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "Hello there" } });
    expect(screen.getByText(/Preview: this is what will be sent/)).toBeTruthy();
    expect(screen.getAllByText("Hello there").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains a faded part when it's tapped, and keeps it shown", async () => {
    goLive();
    ui();
    await say("Hi my name is John", 1);
    const added = document.querySelector(".seg-added") as HTMLElement;
    fireEvent.click(added);
    expect(screen.getByText("Added by the format.")).toBeTruthy();
    fireEvent.click(added); // a second tap must not hide it again
    expect(screen.getByText("Added by the format.")).toBeTruthy();
  });

  it("says plainly that nothing is saved, and New chat clears it", async () => {
    goLive();
    ui();
    expect(screen.getByText(/isn't saved anywhere/)).toBeTruthy();
    await say("Hi my name is John", 1);
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.queryByText("TEST-REPLY-1")).toBeNull();
  });

  it("puts the message back in the box if the request fails", async () => {
    localStorage.setItem("ttk:live", JSON.stringify({ baseUrl: "https://provider.test/api", apiKey: "sk-test" }));
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 402, text: async () => '{"error":"no credits"}' }));
    ui();
    fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/HTTP 402/)).toBeTruthy();
    expect((screen.getByLabelText("Your message") as HTMLTextAreaElement).value).toBe("Hi");
  });

  it("falls back to a recorded conversation, clearly labelled, when live is off", () => {
    const settings = { max_tokens: 10 };
    const fallback: RecordedExample = {
      id: "t",
      section: "memory",
      mode: "transcript",
      title: "t",
      model: "anthropic/claude-sonnet-5.5",
      provider: "test",
      captured_at: "2026-10-15T00:00:00Z",
      settings,
      turns: [
        {
          request: { kind: "chat", path: "/v1/chat/completions", body: { model: "anthropic/claude-sonnet-5.5", messages: [{ role: "user", content: "FIXTURE-Q" }], ...settings } },
          response: { choices: [{ message: { role: "assistant", content: "FIXTURE-A" } }] },
        },
      ],
    };
    ui(fallback);
    expect(screen.getByText(/Live replies are off right now/)).toBeTruthy();
    expect(screen.getAllByText("FIXTURE-A").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Your message")).toBeNull();
  });
});
