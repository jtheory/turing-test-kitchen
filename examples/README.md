# Recorded examples

Each `*.json` file here is one real model output, captured by `scripts/capture.ts`. **Never write or edit these by hand.** If an example is wrong, re-capture it.

Format (`RecordedExample` in `src/lib/types.ts`):

```json
{
  "id": "memory-without",
  "section": "memory",
  "mode": "single",
  "title": "…",
  "model": "…",
  "provider": "…",
  "captured_at": "2026-10-11T16:00:00.000Z",
  "settings": { "max_tokens": 200, "temperature": 0.7 },
  "turns": [{ "request": { "kind": "chat", "path": "/v1/chat/completions", "body": { } }, "response": { } }],
  "notes": "…"
}
```

`request` is the exact object built by `assemble()` and sent as the HTTP body; `response` is the provider's raw JSON. Multi-turn examples have one entry per turn, and each real reply is fed into the next turn. `npm test` checks every file here for consistency.

## Capturing

The prompts live in `scripts/specs.ts`. Point the script at any OpenAI-compatible server:

```sh
# The tour (layers 1–2): a chat model, /v1/chat/completions.
npm run capture -- --section bare --section memory \
  --base-url https://openrouter.ai/api --model anthropic/claude-sonnet-5.5 --provider OpenRouter

# Under the hood: a *base* model and a raw /v1/completions endpoint.
# OpenRouter lists no base models (Oct 2026), so run one locally (e.g. llama.cpp).
npm run capture -- --section under-the-hood \
  --base-url http://localhost:8080 --model <base-model-file> --provider "local llama.cpp"
```

`--base-url` is the server root; the script appends `/v1/completions` or `/v1/chat/completions`. The API key is read from `CAPTURE_API_KEY`, or from a `.env` file in the project root (copy `.env.example`; `.env` is gitignored). It is never written into the examples.

A local server works too, for example llama.cpp (`llama-server -m <model>.gguf`, then `--base-url http://localhost:8080`) or vLLM.

### Base models (under the hood)

OpenRouter's catalog had no base models in the 13 October 2026 snapshot. Capture these from a base (not instruct) model served locally, e.g. llama.cpp's `llama-server` with a base model file, and record its exact name in `--model`.
