# Turing Test Kitchen: Project Plan

## 1. Goal

An educational web app showing how a human-seeming chatbot is built from a plain text-prediction model, one layer at a time, with the exact model input and output visible at every step.

**Primary audience:** semi- and non-technical people, especially those drawn to "maybe chatbots are people" ideas after convincing conversations. Engineers are a secondary audience.

**Success looks like:** a visitor with no technical background finishes the tour able to explain, in their own words, where a chatbot's "memory", "personality" and "feelings" come from.

## 2. Guiding principles

1. **Clarity above all.** The kitchen name is a light touch. The metaphor never replaces a plain explanation. Use "preset" or "example" if "recipe" would confuse.
2. **The inspector is the product.** Every layer shows the exact text or request sent to the model and the exact response. No paraphrasing of what the model received.
3. **Zero setup on the main path.** No accounts, no API keys, no big downloads required to learn the core ideas.
4. **Honest framing.** Show what can be shown: human-like text is produced by visible, mechanical steps. Do not claim this proves AI systems can never have moral status. Say clearly that this is an open question.
5. **Educational, not a toolkit.** No features for deploying a persona against real people or evading AI detection.

## 3. The layers

Each layer adds one thing on top of the previous one, with a short explanation, the inspector, and an example or live chat.

| # | Layer | What it shows | Key "aha" |
|---|-------|---------------|-----------|
| 1 | Plain text prediction | A base model continuing raw text | It's not talking to you; it's continuing a document |
| 2 | Chat formatting | Messages turned into one text with role markers and special tokens | "Conversation" is a formatting convention |
| 3 | One message at a time | Single-turn chat, no history | The model has no memory of its own |
| 4 | Conversation memory | Full transcript re-sent every turn | "Remembering" means re-reading everything |
| 5 | Hidden instructions | System prompt and persona | One hidden sentence changes the whole personality |
| 6 | Randomness | Temperature, regenerating answers | Same input, different answers |
| 7 | Long-term memory | Summaries and notes injected into the prompt | "It remembers me" = notes pasted into the text |
| 8 | Human-like tricks | Typing delay, typos, short replies, feigned ignorance | Humanness can be added as a finishing layer |

**Centrepiece demo (layer 5):** the same model, one changed line of hidden instructions. Version A says it is conscious and afraid; version B says it is a text predictor without feelings. Both prompts are shown in full.

**Possible later finale:** a short guess-the-human game, or a link out to existing Turing games instead of building one.

## 4. How visitors interact

Three modes, in priority order:

1. **Recorded examples (default).** Real model outputs captured ahead of time, shown with the exact prompt, model name, settings and capture date. Clearly labelled as recorded. Costs nothing to serve and works everywhere.
2. **Limited live chat (hosted).** A small budget of live messages per visitor, on a cheap hosted model, at the points where trying it yourself matters most (mainly layers 4–6 and 8).
3. **Bring your own key (optional, advanced).** For people who want to try the strongest models. Clearly marked as optional and not needed for the tour.

## 5. Architecture

- **Frontend:** static site, TypeScript. Framework is open (e.g. Vite + React, or SvelteKit with a static adapter). It must work well on phones.
- **Prompt assembly as a pure function.** `assemble(layerConfig, conversation) -> request`. The inspector renders that exact request. Unit-tested, since correctness of the inspector is the whole point.
- **One model interface.** A single OpenAI-compatible chat/completions abstraction so backends are swappable: hosted proxy, BYOK provider, or in-browser model later.
- **Hosted proxy:** small serverless function (e.g. Cloudflare Workers) holding the project's API key.
  - Per-visitor rate limit plus a global daily spend cap that switches live chat off and falls back to recorded examples.
  - Model allowlist, max tokens cap, no arbitrary parameters passed through.
  - Bot protection (e.g. a lightweight CAPTCHA such as Turnstile) before live chat.
- **BYOK:** keys stay in the browser (memory by default; persistence only if the user opts in). Calls go directly from the browser to the provider. Never route BYOK keys through our server.
- **Recorded examples:** JSON files in the repo, one per example: `id, layer, model, captured_at, settings, request (exact), response (exact), notes`. A small script captures new examples so they are real outputs, never hand-written.
- **Chat templates (layer 2):** render real templates from open models rather than inventing a format.

## 6. Open questions

- ~~**Base model source for layer 1.**~~ Decided, see section 10.
- ~~**Hosted provider.**~~ Decided, see section 10. Still open: which live model(s), and the daily budget.
- ~~**Frontend framework.**~~ Decided, see section 10.
- **Analytics and logging:** what, if anything, is stored about visitor chats. Default: nothing beyond aggregate counts.
- **Languages:** English only at first, or multilingual?
- **License:** e.g. MIT for code, CC BY for text.

## 7. Milestones

1. **M1 – Skeleton and inspector.** Static site, layers 1–4 with recorded examples, working inspector, mobile layout.
2. **M2 – Live chat.** Hosted proxy with rate limits and spend cap; live chat on layers 3–4.
3. **M3 – Persona layers.** Layers 5–6, including the centrepiece demo.
4. **M4 – Memory and tricks.** Layers 7–8.
5. **M5 – BYOK.** Optional advanced mode.
6. **M6 – Polish.** Accessibility, copy review with non-technical testers, further reading links (e.g. Transformer Explainer, existing Turing test games and research).

## 8. Risks

- **Cost and abuse** of the hosted tier → rate limits, spend cap, recorded fallback.
- **Misuse framing** ("how to make a bot pass as human") → educational framing, no deployment or export features, disclosure messaging.
- **Overclaiming** on AI consciousness or moral status → careful copy, reviewed against principle 4.
- **Model churn:** hosted models get deprecated → recorded examples keep the tour working; live model is a config value.
- **Scope creep** → ship M1 before adding anything not on this list.

## 9. Before creating the repo

- Check `turing-test-kitchen` is free on GitHub, and check domains (e.g. turingtestkitchen.com / .org / .dev).
- Avoid any visual resemblance to the America's Test Kitchen brand.

## 10. Decisions

### Base model source for layer 1 (October 2026)

**Decision: recorded examples from an open-weight base model are the main path. An in-browser tiny base model is a later, optional "try it yourself". No hosted live base model for now.**

What we found:

- **Hosted base models are scarce and churn.** Major chat APIs don't offer base models. Llama 3.1 405B Base has been served on a raw `/v1/completions` endpoint by Hyperbolic and listed on OpenRouter, but listings are old and providers are retiring 405B models (e.g. IONOS deprecated its 405B in September 2026; Together doesn't serve the base model serverlessly). Not something to build live chat on.
- **In-browser is feasible but heavy.** transformers.js runs small models (SmolLM2-135M class, ~100–170 MB download) in the browser, with WebGPU in Chromium browsers. That breaks "no big downloads" on the main path and gives noticeably weaker text, so it fits as an opt-in extra on layer 1, not the default.
- **Recorded examples meet every principle**: zero setup, the exact prompt and output shown, labelled with the model and date, and they keep working when a model is retired.

How it's built: `scripts/capture.ts` sends the output of `assemble()` to any OpenAI-compatible `/v1/completions` endpoint (a hosted base model, or a local llama.cpp/vLLM server running a small base model) and stores the exact request and raw response. See `examples/README.md`.

**Update, 13 October 2026:** the OpenRouter snapshot (`data/openrouter/models.json`, 458 models) contains **no base models**. Llama 3.1 405B Base (`meta-llama/llama-3.1-405b`) is no longer listed, and nothing else is labelled as base. So layer 1 can't use OpenRouter, which is an exception to the "OpenRouter only" decision below. Layer 1 needs another source: a base model run locally (for capturing examples), possibly a small base model in the browser (for live use later), or another hosted provider if one still serves base models.

Still open: which exact base model(s) to capture from. Suggested: one large hosted base model if still available, plus one small local base model.

### Inference provider (October 2026)

**Decision: OpenRouter only, for every layer and every mode. Funded by the project to start. BYOK and donated keys come later, also OpenRouter only.**

Why:

- **It's the only well-known provider that covers the whole tour** with one OpenAI-compatible request shape: base models and raw text for layers 1–2, chat for layers 3+, many cheap open-weight models. OpenAI and Anthropic have no base models and don't accept raw templated text, so they could only ever serve layers 3+.
- **Its key controls fit our limits.** Per-key dollar limits with daily, weekly or monthly reset, plus expiry, created through its key-management API. The same controls make donated keys low-risk for donors later, and its "Connect OpenRouter" sign-in (OAuth PKCE) can give BYOK visitors a capped key without pasting one.
- **It doesn't close doors.** Donors who prefer OpenAI or Anthropic can attach those keys to an OpenRouter account, and we keep one code path.

Not doing for now: direct OpenAI, Anthropic or Hugging Face support, and so no need to check their browser (CORS) support or spend controls. Revisit only if BYOK users ask for them. Cloudflare AI Gateway stays an option for per-visitor dollar budgets in the proxy.

Before building on it, check: that layer 2's rendered template text reaches chat models untouched (may need pinned hosts), and what an expired or exhausted key returns so the proxy can fall back to recorded examples.

Details and sources: `docs/research/inference-providers.md`.

### Stack

- **Vite + React + TypeScript**, built as a static site (`dist/`, relative paths, hash routing), so it can be hosted anywhere, including Cloudflare Pages next to the M2 Workers proxy.
- **Vitest** for unit and component tests.
- **`@huggingface/jinja`** renders real chat templates in the browser for layer 2. Templates are vendored in `src/data/chat-templates.json` with their source recorded.
- **`tsx`** runs the capture script, which reuses `assemble()` so recorded requests match the inspector exactly.
- One request shape everywhere: OpenAI-compatible `/v1/completions` (layers 1–2) and `/v1/chat/completions` (layers 3+).

## 11. Collected pieces (not yet placed)

Ideas worth keeping before we know exactly where they fit.

- **One message through every layer.** Use the same opening, "Hi my name is John", as the thread through the tour. Layer 1: a base model doesn't reply, it continues John's text (finishes the sentence, writes the rest of his post or email, sometimes "Johnson"). Layer 2: the same line wrapped in a chat template gets a reply. Layer 3: ask "What's my name?" next and it doesn't know. Layer 4: now it does. Captured as `layer1-john` (and later matching specs for the other layers).
- **Tokens show through.** Text without a final space or full stop is often continued mid-word ("John" → "Johnson"), because the model works in word pieces. Possibly a small sidebar on layer 1, plus a trailing-space example.
- **The empty prompt.** With no text at all, a base model starts a document of its own choosing (`layer1-empty`). Some providers reject an empty prompt; if so, record that refusal honestly or drop the exhibit.
- **Exhibit library** of empathy and attachment techniques: see `docs/research/empathy-triggers.md`.
- **Local testing with BYOK first.** While developing locally, call the provider from the browser with the developer's own key, stored locally. This moves part of M5 earlier, as a dev tool, before the hosted proxy exists. OpenRouter accepts browser calls; most providers' CORS support still needs checking.
- **Hosted key, locked down.** OpenRouter supports per-key credit limits with daily, weekly or monthly resets, created through its provisioning-key API, so a key that simply stops when it runs out is possible. That key must still sit behind our proxy, never in the browser, with the per-visitor rate limits and model allowlist from section 5.
- **Visitor contributions** ("add $20 of model usage"): appealing, but hard to keep safe. Parked until the hosted tier exists. Likely shape: donated OpenRouter keys with a dollar limit and an expiry, kept server-side behind the proxy. See `docs/research/inference-providers.md`.
- **Cloudflare AI Gateway** could enforce per-visitor dollar budgets and rate limits in front of any provider, instead of hand-written spend tracking in the Worker.
