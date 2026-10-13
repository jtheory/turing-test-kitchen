# Which inference provider(s)

Is OpenRouter the right long-term backend, and should donated or visitor keys also work with OpenAI and Anthropic? Researched October 2026. Nothing here is built yet; it's to make sure we start in a good direction.

**Outcome:** OpenRouter only for now, see the decision in `PLAN.md` section 10. The OpenAI, Anthropic and Hugging Face notes below are kept for if BYOK users ask for them later.

**Caveat on sources.** The sandbox could search the web but not open provider sites or send test requests, so several points come from changelogs, mirrors and third-party write-ups. Items marked *verify* need a real request before we rely on them.

## Short answer

**Keep OpenRouter as the default and the only provider the tour depends on.** It's the only well-known option that covers every layer with one request shape, and its key controls fit "capped, expiring, donated keys" almost exactly.

**Add OpenAI and Anthropic later, as optional chat-only providers for layers 3+,** mainly for bring-your-own-key. Both now have real spend caps, so donated keys from them are possible, but they add a second request shape (Anthropic) and only cover half the tour. Don't build donations around them first.

**Keep Cloudflare AI Gateway in mind for the hosted proxy.** It adds per-user dollar budgets and rate limits in front of any provider, including OpenRouter, OpenAI and Anthropic.

## What the tour needs from a provider

| Need | Why |
|------|-----|
| Raw `/v1/completions` on **base** models | Layer 1 |
| Raw `/v1/completions` on **chat** models, text passed through untouched | Layer 2: we render the real chat template ourselves and send the resulting text |
| `/v1/chat/completions` on chat models | Layers 3+ |
| Cheap, good open-weight models | Hosted live chat on a small budget |
| Browser calls (CORS) | BYOK and the dev live panel, without our server seeing keys |
| Per-key dollar cap, ideally with reset and expiry | Public hosted tier and donated keys |
| Widely used by technical people | So donors already have an account |

OpenAI and Anthropic can't meet the first two at all: no base models, and no way to send raw templated text to their chat models. That alone rules them out as the main backend.

## Comparison

| | OpenRouter | OpenAI | Anthropic | HF Inference Providers |
|---|---|---|---|---|
| Layers covered | 1–8 (*verify* layer 2 passthrough) | 3–8 | 3–8 | 3–8 (chat router) |
| Open-weight models | Many, many hosts | No | No | Many |
| Request shape | OpenAI-compatible | OpenAI | Own Messages API (an OpenAI-compatible endpoint also exists) | OpenAI-compatible |
| Browser calls | Yes | Unclear, reports of it breaking (*verify*) | Yes, with the `anthropic-dangerous-direct-browser-access` header | *verify* |
| Per-key $ cap | Yes, with daily/weekly/monthly reset | Per project, hard limit now available | Per workspace, monthly | Not found |
| Key expiry | Yes, `expires_at` | Yes, new project keys (since Sept 2026) | Not found | Not found |
| Keys via API | Yes (management key) | Yes (Admin API) | Not found | No |
| "Connect your account" flow | Yes, OAuth PKCE issues a capped key | No | No | HF OAuth exists, not for billing |

### OpenRouter

- Per-key `limit` (USD) with `limit_reset` daily/weekly/monthly, and an optional `expires_at`, all settable when creating a key through the management-key API. Expiry can't be added to an existing key. ([create key](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys), [key audit](https://openrouter.ai/docs/cookbook/administration/api-key-audit))
- **OAuth PKCE**: a visitor clicks "Connect OpenRouter", approves in OpenRouter, and our page receives a key they own, optionally with a `limit`. No pasting keys. Good fit for BYOK and maybe for donations. (*verify* exactly what `limit` caps and the callback URL rules; sources disagree.) ([OAuth reference](https://openrouter.ai/docs/api/api-reference/oauth/create-authorization-code.md))
- **OpenRouter BYOK**: an account can attach its own OpenAI, Anthropic and ~70 other provider keys, and OpenRouter routes to them. So a donor who prefers to pay OpenAI or Anthropic directly could still hand us an OpenRouter key, and we keep one code path. Free up to a usage allowance, then 5%; the allowance has changed twice, so check current terms. By default a failing BYOK key falls back to OpenRouter credit, which is a setting to turn off. ([announcement](https://openrouter.ai/announcements/bring-your-own-api-keys), [fee update](https://openrouter.ai/announcements/1-million-free-byok-requests-per-month), [TrueFoundry, Oct 2026](https://www.truefoundry.com/blog/openrouter-byok-explained-cheaper-often-faster-and-changing))
- Risk: a middleman. If OpenRouter changes terms or a model's hosts disappear, recorded examples keep the tour working, and the one-interface design keeps switching cheap.

### OpenAI

- Project spend limits can now be hard limits (requests get 429 `project_spend_limit_exceeded`), though enforcement isn't instant and can overshoot slightly. Earlier in 2026 they were notification-only, so older advice is wrong. ([spend limits](https://developers.openai.com/api/docs/guides/spend-limits), [forum](https://community.openai.com/t/project-limits-not-being-respected/1300634))
- New project keys can expire, up to 365 days, since 10 Sept 2026. ([guide](https://aicybr.com/blog/openai-api-key-expiration-maximum-lifetime-guide))
- So a donor *can* make a capped, expiring OpenAI key: new project, hard limit, expiring key. That's more steps than OpenRouter.
- Browser calls: sources disagree. The official SDK blocks browser use unless told otherwise, and forum threads describe CORS breaking and being fixed. Test before promising BYOK in the browser. ([forum](https://community.openai.com/t/has-the-cors-policy-changed-responses-api/1372791))

### Anthropic

- Workspace monthly spend limits, applied on top of the organisation limit. Keys belong to one workspace. No key expiry found. ([support](https://support.claude.com/en/articles/9796807-creating-and-managing-workspaces-in-the-claude-console))
- Browser calls work with an explicit opt-in header, intended for BYOK. ([Simon Willison](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access))
- The native Messages API is a different shape (system prompt is a separate field, not a message). The inspector would show that request as-is, which is honest and even a small lesson ("every vendor formats this differently"), but it's a second shape for `assemble()` to produce and test.

### Cloudflare AI Gateway (not a provider, a guardrail)

- Dollar spend limits per time window, scoped by provider, model or custom metadata such as a visitor id (e.g. "$0.05/day per visitor, $5/day total"), plus request rate limits. Applies to BYOK traffic for models with known pricing. ([spend limits](https://developers.cloudflare.com/ai-gateway/features/spend-limits), [changelog](https://developers.cloudflare.com/changelog/post/2026-06-05-spend-limits/))
- We already plan Cloudflare for hosting and the proxy, so this could replace hand-written spend tracking in the Worker. Keep our own allowlist and token caps either way.

### Hugging Face Inference Providers

- Well known, OpenAI-compatible chat router over many hosts, fine-grained tokens. But chat only, and no per-token spend caps found. A reasonable later BYOK option, not a backbone. ([OpenClaw docs](https://docs.openclaw.ai/providers/huggingface))

## Donated keys: the shape that seems safest

1. Accept **OpenRouter keys first**. Ask donors to create a key with a dollar limit and an expiry; that bounds their worst case to an amount they chose.
2. Donated keys are **server-side secrets**, the opposite of visitor BYOK keys (which never touch our server). Say this clearly to donors. They sit behind the same proxy, allowlist, token caps and per-visitor limits as our own key.
3. Use a donated key only after checking its remaining limit and expiry (OpenRouter reports both for the current key), and fall back to recorded examples when the pool is empty.
4. Credit donors only if they opt in.
5. OpenAI and Anthropic donations later, if people ask: they'd serve chat layers only, and need the extra steps above.

## What this means for the code now

- Keep the one OpenAI-compatible interface, but describe each endpoint with what it can do (raw completions or not, chat or not, browser-callable or not), so layers can say "needs a base model" instead of assuming OpenRouter.
- Leave room for a second request shape (Anthropic Messages) in `assemble()` without building it yet.
- Keep `DEFAULT_BASE_URL` as OpenRouter.

## To verify before building on OpenRouter

- **Layer 2 passthrough:** OpenRouter's completions endpoint with a chat model and our own rendered template. Does the text reach the model untouched, or does some host apply its template again? Likely varies by host; may need to pin hosts with provider routing.
- *Later, with BYOK:* **OpenRouter PKCE:** what `limit` caps, allowed callback URLs, and whether we can set an expiry.
- **What an expired or exhausted OpenRouter key returns,** so the proxy can switch keys or fall back cleanly.
