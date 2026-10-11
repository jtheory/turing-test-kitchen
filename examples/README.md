# Recorded examples

Each `*.json` file here is one real model output, captured by `scripts/capture.ts`. **Never write or edit these by hand.** If an example is wrong, re-capture it.

Format (`RecordedExample` in `src/lib/types.ts`):

```json
{
  "id": "layer3-name",
  "layer": 3,
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
# Layer 1 needs a *base* model and a raw /v1/completions endpoint.
CAPTURE_API_KEY=... npm run capture -- --layer 1 \
  --base-url https://provider.example --model <base-model-id> --provider "<Provider>"

# Layers 3–4 need a chat model and /v1/chat/completions.
CAPTURE_API_KEY=... npm run capture -- --layer 3 --layer 4 ...   # or --spec <id>
```

`--base-url` is the server root; the script appends `/v1/completions` or `/v1/chat/completions`. The API key is read from `CAPTURE_API_KEY` and never written to disk.

A local server works too, for example llama.cpp (`llama-server -m <model>.gguf`, then `--base-url http://localhost:8080`) or vLLM.

### Layer 1: base model source

See "Decisions" in `PLAN.md`. Recommended: capture from an open-weight base model (not an instruct/chat version), and record the exact model name. Good candidates:

- **Large hosted base model**, for the most fluent text: Llama 3.1 405B Base has been offered on a raw completions endpoint by Hyperbolic and through OpenRouter. Check it's still listed before relying on it.
- **Small open base model run locally** (e.g. SmolLM2 or Qwen base checkpoints via llama.cpp or vLLM): reproducible and immune to deprecation.

Capturing from both shows that "bigger" changes fluency, not the nature of the thing.
