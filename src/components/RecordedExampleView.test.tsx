// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RecordedExampleView } from "./RecordedExampleView";
import type { RecordedExample } from "../lib/types";

afterEach(cleanup);

// Test fixture only: obviously fake text, never shipped as an example.
const settings = { max_tokens: 10, temperature: 0 };
const fixture: RecordedExample = {
  id: "test",
  layer: 4,
  title: "Fixture",
  model: "fixture-model",
  provider: "test",
  captured_at: "2026-01-01T00:00:00Z",
  settings,
  turns: [
    {
      request: { kind: "chat", path: "/v1/chat/completions", body: { model: "fixture-model", messages: [{ role: "user", content: "FIRST" }], ...settings } },
      response: { choices: [{ message: { role: "assistant", content: "REPLY-ONE" } }] },
    },
    {
      request: {
        kind: "chat",
        path: "/v1/chat/completions",
        body: {
          model: "fixture-model",
          messages: [
            { role: "user", content: "FIRST" },
            { role: "assistant", content: "REPLY-ONE" },
            { role: "user", content: "SECOND" },
          ],
          ...settings,
        },
      },
      response: { choices: [{ message: { role: "assistant", content: "REPLY-TWO" } }] },
    },
  ],
};

describe("RecordedExampleView", () => {
  it("steps through turns and shows the exact request for each", () => {
    render(<RecordedExampleView example={fixture} />);
    expect(screen.queryByText("SECOND")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Turn 2" }));
    expect(screen.getAllByText("SECOND").length).toBeGreaterThan(0);
    expect(screen.getAllByText("REPLY-TWO").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Exact data" }));
    expect(screen.getByText(/"messages":\[\{"role":"user","content":"FIRST"\}/)).toBeTruthy();
  });

  it("labels the example as recorded with model, provider and date", () => {
    render(<RecordedExampleView example={fixture} />);
    expect(screen.getByText(/Recorded · fixture-model via test/)).toBeTruthy();
  });
});
