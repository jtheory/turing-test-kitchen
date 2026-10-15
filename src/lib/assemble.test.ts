import { describe, expect, it } from "vitest";
import { assemble, responseText, responseUsage, serializeBody } from "./assemble";
import { chatTemplates, renderChatTemplate, specialTokens } from "./templates";
import type { ChatMessage, Settings } from "./types";

const settings: Settings = { max_tokens: 64, temperature: 0.7 };

const chat: ChatMessage[] = [
  { role: "user", content: "My name is Sam." },
  { role: "assistant", content: "Nice to meet you, Sam!" },
  { role: "user", content: "What's my name?" },
];

describe("assemble: document (base model continuation)", () => {
  it("sends the document verbatim as a completion prompt", () => {
    const doc = "Dear diary,\n  today I ";
    const req = assemble({ mode: "document", model: "base-model", settings }, { document: doc });
    expect(req).toEqual({
      kind: "completion",
      path: "/v1/completions",
      body: { model: "base-model", prompt: doc, max_tokens: 64, temperature: 0.7 },
    });
  });

  it("rejects chat messages", () => {
    expect(() => assemble({ mode: "document", model: "m", settings }, { messages: chat })).toThrow();
  });
});

describe("assemble: template (open-model chat formatting)", () => {
  it("renders Qwen 2.5's template, including its default hidden system message", () => {
    const req = assemble(
      { mode: "template", model: "m", templateId: "Qwen/Qwen2.5-7B-Instruct", settings },
      { messages: [{ role: "user", content: "Hi!" }] },
    );
    expect(req.kind).toBe("completion");
    expect(req.kind === "completion" && req.body.prompt).toBe(
      "<|im_start|>system\nYou are Qwen, created by Alibaba Cloud. You are a helpful assistant.<|im_end|>\n" +
        "<|im_start|>user\nHi!<|im_end|>\n" +
        "<|im_start|>assistant\n",
    );
  });

  it("renders Llama 3.1's template, which adds dates the user never typed", () => {
    const text = renderChatTemplate("meta-llama/Llama-3.1-8B-Instruct", [{ role: "user", content: "Hi!" }], true);
    expect(text).toBe(
      "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n" +
        "Cutting Knowledge Date: December 2023\nToday Date: 26 Jul 2024\n\n<|eot_id|>" +
        "<|start_header_id|>user<|end_header_id|>\n\nHi!<|eot_id|>" +
        "<|start_header_id|>assistant<|end_header_id|>\n\n",
    );
  });

  it("adds the assistant cue only when the last message is from the user", () => {
    const id = "Qwen/Qwen2.5-7B-Instruct";
    const withCue = renderChatTemplate(id, chat, true);
    expect(withCue.endsWith("<|im_start|>assistant\n")).toBe(true);
    const req = assemble({ mode: "template", model: "m", templateId: id, settings }, { messages: chat.slice(0, 2) });
    expect(req.kind === "completion" && req.body.prompt.endsWith("Nice to meet you, Sam!<|im_end|>\n")).toBe(true);
  });

  it("renders every vendored template without error", () => {
    for (const t of chatTemplates) {
      const text = renderChatTemplate(t.id, chat, true);
      expect(text).toContain("What's my name?");
      expect(specialTokens(t.id).some((tok) => text.includes(tok))).toBe(true);
    }
  });
});

describe("assemble: single (the bare model)", () => {
  it("sends only the newest user message", () => {
    const req = assemble({ mode: "single", model: "chat-model", settings }, { messages: chat });
    expect(req).toEqual({
      kind: "chat",
      path: "/v1/chat/completions",
      body: { model: "chat-model", messages: [{ role: "user", content: "What's my name?" }], ...settings },
    });
  });
});

describe("assemble: transcript (memory)", () => {
  it("re-sends the full transcript", () => {
    const req = assemble({ mode: "transcript", model: "chat-model", settings }, { messages: chat });
    expect(req.kind === "chat" && req.body.messages).toEqual(chat);
  });

  it("does not share message objects with the caller", () => {
    const req = assemble({ mode: "transcript", model: "chat-model", settings }, { messages: chat });
    expect(req.kind === "chat" && req.body.messages[0]).not.toBe(chat[0]);
  });

  it("carries no fields beyond model, input and allowed settings", () => {
    const req = assemble({ mode: "transcript", model: "m", settings: { ...settings, seed: 1 } }, { messages: chat });
    expect(Object.keys(req.body).sort()).toEqual(["max_tokens", "messages", "model", "seed", "temperature"]);
  });
});

describe("helpers", () => {
  it("serializes the exact request body", () => {
    const req = assemble({ mode: "document", model: "m", settings }, { document: "a" });
    expect(serializeBody(req)).toBe('{"model":"m","prompt":"a","max_tokens":64,"temperature":0.7}');
  });

  it("extracts text from completion and chat responses", () => {
    expect(responseText({ choices: [{ text: " hi" }] })).toBe(" hi");
    expect(responseText({ choices: [{ message: { role: "assistant", content: "yo" } }] })).toBe("yo");
    expect(responseText({})).toBeUndefined();
  });
});

describe("assemble: settings", () => {
  it("leaves out temperature when a page doesn't set it", () => {
    const req = assemble({ mode: "single", model: "m", settings: { max_tokens: 50 } }, { messages: chat });
    expect(Object.keys(req.body).sort()).toEqual(["max_tokens", "messages", "model"]);
  });
});

describe("responseUsage", () => {
  it("reads token counts, hidden reasoning and OpenRouter's cost", () => {
    const response = {
      usage: { prompt_tokens: 43, completion_tokens: 47, cost: 0.000556, completion_tokens_details: { reasoning_tokens: 16 } },
    };
    expect(responseUsage(response)).toEqual({ read: 43, wrote: 47, reasoning: 16, costUsd: 0.000556 });
    expect(responseUsage({})).toBeUndefined();
  });
});
