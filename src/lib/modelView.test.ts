import { describe, expect, it } from "vitest";
import { assemble } from "./assemble";
import { modelView } from "./modelView";
import { renderChatTemplate } from "./templates";
import type { ChatMessage } from "./types";

const settings = { max_tokens: 50 };
const chat: ChatMessage[] = [
  { role: "user", content: "Hi my name is John" },
  { role: "assistant", content: "Nice to meet you, John!" },
  { role: "user", content: "What's my name?" },
];

describe("modelView", () => {
  it("splits Llama's text into markup, added, history, own and reply, losing nothing", () => {
    const req = assemble({ mode: "transcript", model: "meta-llama/llama-3.1-8b-instruct", settings }, { messages: chat });
    const view = modelView(req, "Your name is John.");
    expect(view.form).toBe("text");
    const kinds = view.segments.map((s) => s.kind);
    expect(kinds[0]).toBe("markup");
    expect(view.segments.filter((s) => s.kind === "added").map((s) => s.text)).toEqual([
      "Cutting Knowledge Date: December 2023\nToday Date: 26 Jul 2024",
    ]);
    expect(view.segments.filter((s) => s.kind === "history").map((s) => s.text)).toEqual([
      "Hi my name is John",
      "Nice to meet you, John!",
    ]);
    expect(view.segments.filter((s) => s.kind === "own").map((s) => s.text)).toEqual(["What's my name?"]);
    expect(view.segments.at(-1)).toMatchObject({ kind: "reply", text: "Your name is John." });
    // Every character of the rendered text is accounted for, in order.
    expect(view.segments.slice(0, -1).map((s) => s.text).join("")).toBe(
      renderChatTemplate("meta-llama/Llama-3.1-8B-Instruct", chat, true),
    );
  });

  it("markup segments never contain the visitor's words", () => {
    const req = assemble({ mode: "transcript", model: "meta-llama/llama-3.1-8b-instruct", settings }, { messages: chat });
    for (const s of modelView(req).segments.filter((s) => s.kind === "markup")) {
      expect(s.text).not.toMatch(/John|name/);
    }
  });

  it("shows closed models as the message list, newest message as own", () => {
    const req = assemble({ mode: "transcript", model: "anthropic/claude-sonnet-5.5", settings }, { messages: chat });
    const view = modelView(req);
    expect(view.form).toBe("messages");
    expect(view.segments.map((s) => [s.kind, s.role])).toEqual([
      ["history", "user"],
      ["history", "assistant"],
      ["own", "user"],
    ]);
  });

  it("finds the right spot when a message repeats the format's own words", () => {
    const tricky: ChatMessage[] = [{ role: "user", content: "user" }];
    const req = assemble({ mode: "transcript", model: "meta-llama/llama-3.1-8b-instruct", settings }, { messages: tricky });
    const segs = modelView(req).segments;
    const ownAt = segs.findIndex((s) => s.kind === "own");
    // The message comes after the user header, not inside it.
    expect(segs.slice(0, ownAt).map((s) => s.text).join("")).toMatch(/<\|start_header_id\|>user<\|end_header_id\|>\n\n$/);
    expect(segs.map((s) => s.text).join("")).toBe(renderChatTemplate("meta-llama/Llama-3.1-8B-Instruct", tricky, true));
  });

  it("shows trimmed text when the template trims, so nothing shown differs from what's read", () => {
    const spaced: ChatMessage[] = [{ role: "user", content: "  hello  " }];
    const req = assemble({ mode: "transcript", model: "meta-llama/llama-3.1-8b-instruct", settings }, { messages: spaced });
    const segs = modelView(req).segments;
    expect(segs.find((s) => s.kind === "own")?.text).toBe("hello");
    expect(segs.map((s) => s.text).join("")).toBe(renderChatTemplate("meta-llama/Llama-3.1-8B-Instruct", spaced, true));
  });
});
