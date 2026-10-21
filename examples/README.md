# Recorded examples

Each `*.json` file here is one real model output, captured by `scripts/capture.ts`. **Never write or edit these by hand.** If an example is wrong, re-capture it.

Format (`RecordedExample` in `src/lib/types.ts`):

```json
{
  "id": "memory-without--claude-sonnet-5.5",
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
# The tour (layers 1–2): chat models, /v1/chat/completions. Run once per model;
# each model gets its own file (<spec id>--<model>.json).
npm run capture -- --section bare --section memory \
  --base-url https://openrouter.ai/api --model anthropic/claude-sonnet-5.5 --provider OpenRouter
npm run capture -- --section bare --section memory \
  --base-url https://openrouter.ai/api --model meta-llama/llama-3.1-8b-instruct --provider OpenRouter

# Under the hood: a *base* model and a raw /v1/completions endpoint.
# OpenRouter lists no base models (Oct 2026), so run one locally (e.g. llama.cpp).
npm run capture -- --section under-the-hood \
  --base-url http://localhost:8080 --model <base-model-file> --provider "local llama.cpp"
```

`--base-url` is the server root; the script appends `/v1/completions` or `/v1/chat/completions`. The API key is read from `CAPTURE_API_KEY`, or from a `.env` file in the project root (copy `.env.example`; `.env` is gitignored). It is never written into the examples.

A local server works too, for example llama.cpp (`llama-server -m <model>.gguf`, then `--base-url http://localhost:8080`) or vLLM.

### Base models (under the hood)

OpenRouter's catalog had no base models in the 13 October 2026 snapshot. Capture these from a base (not instruct) model served locally, e.g. llama.cpp's `llama-server` with a base model file, and record its exact name in `--model`.

#### mlx_lm (Apple silicon)

Start the server in one terminal and leave it running:

```sh
mlx_lm.server --model mlx-community/Meta-Llama-3.1-8B-4bit --port 8080
```

Then capture from a second terminal:

```sh
npm run capture -- --section under-the-hood \
  --base-url http://localhost:8080 --model mlx-community/Meta-Llama-3.1-8B-4bit \
  --provider "local mlx_lm" --start-token "<|begin_of_text|>"
```

`mlx_lm.server` doesn't add the model's start-of-text token to `/v1/completions` prompts (check `usage.prompt_tokens`: "Hi my name is John" is 5 tokens without it and 6 with it). Llama always sees text that begins with that token, and an empty prompt with no tokens at all crashes the server. `--start-token` puts the token at the start of every document. It's then part of the recorded request, so the inspector shows it, and the example's notes say it was added. Use the start token of the model you run (`<|begin_of_text|>` is Llama 3's).

Restart the server before capturing. Its prompt cache can crash on a prompt that's a prefix of one it has already seen (`KeyError: 'cache'`), which is why `hood-empty` runs first. A request that gets no answer fails after `--timeout` seconds (default 120), and the remaining specs still run.

