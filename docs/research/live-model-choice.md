# Which model powers the live chat

Which open-weight model on OpenRouter gives a good conversation for layers 1–8 while letting us show the exact text it reads? Researched 21 October 2026. Nothing here is built yet.

**Caveat on sources.** Availability and prices come from our OpenRouter snapshot (`data/openrouter/models.json`, fetched 13 Oct 2026). The snapshot has no host count. Everything else comes from web search results: the sandbox can't open Hugging Face, OpenRouter or eqbench.com, and can't send test requests. Benchmark figures mostly come from third-party write-ups that disagree with each other. Items marked *verify* need a real request or a look at the model repo first.

## Short answer

**Top pick: `google/gemma-4-31b-it`**, at $0.09 in / $0.34 out per million tokens. It's Apache 2.0, a small dense model with a published Jinja chat template, and thinking is off unless the system prompt asks for it. On one creative-writing benchmark it scores about the same as models 13× its size. It's about 1/25 of Sonnet's price, and a big step up from Llama 3.1 8B.

**Alternate 1: `mistralai/mistral-large-2512` (Mistral Large 3)**, at $0.50 / $1.50. It's Apache 2.0 and has no reasoning mode at all (OpenRouter lists no `reasoning` parameter for it), so the "what the model reads" view stays clean. It's a much larger model (675B MoE), so it should hold a persona better. It costs about 5× Gemma's price. Use it if Gemma's replies feel thin in tests.

**Alternate 2 (lowest risk): `meta-llama/llama-3.3-70b-instruct`**, at $0.10 / $0.32. It uses the same Llama 3 template we already vendor, so we can switch with almost no code. There's no thinking mode, and it's warmer and more capable than 8B, though older (Dec 2024). The catch is that the Llama community license is not fully open.

If quality matters more than simplicity or price, **`moonshotai/kimi-k2.6`** ($0.43 / $1.82) has the highest open-weight creative-writing rubric score we found. But its license is a "modified MIT", it has a thinking mode, and the 1T model's template is much more complex. Treat it as a stretch option, not the default.

## What changes for any choice

- **Thinking must be off, and visibly off.** `Settings` (src/lib/types.ts) has no `reasoning` field, and the proxy will pass no other parameters. So we want a model whose thinking is **off by default**, or else add one fixed, allowlisted switch (e.g. `reasoning: { enabled: false }`). Gemma 4 and Mistral Large 3 need no switch. Qwen 3.5–3.8, GLM, Kimi and DeepSeek think by default.
- **Temperature:** every candidate below lists `temperature` in `supported_parameters`, so layer 5 works with any of them.
- **System prompts:** all candidates have a system role in their template. Llama 3 also adds a "Cutting Knowledge Date / Today Date" header itself, which is a nice teaching moment but also something we have to explain.

## Comparison

Prices are USD per million tokens (in / out), from the snapshot. "R" means OpenRouter lists a `reasoning` parameter for the model.

| Model id | $ in / out | License | Template notes | Temp | Quality notes |
|---|---|---|---|---|---|
| `google/gemma-4-31b-it` | 0.09 / 0.34 (also `:free`) | Apache 2.0 | Jinja template with simple `<\|turn>system … <turn\|>` turns. Thinking is on only if `<\|think\|>` is in the system turn. But 26B/31B show an **empty `<\|channel>thought<channel\|>`** block even when thinking is off (*verify*). The tool section only appears when tools are passed. R listed. Max output 16k. | Yes | Creative Writing v3 rubric 16.01, about level with Qwen3.5-397B (16.00). Elo figures disagree (one source puts it mid-pack at 1407). Widely used for roleplay. Its stock prose is called "middling" in one round-up. |
| `mistralai/mistral-large-2512` | 0.50 / 1.50 | Apache 2.0 | Mistral `[SYSTEM_PROMPT]…[/SYSTEM_PROMPT][INST]…[/INST]` style, compact. **No reasoning mode.** Check whether HF ships a Jinja `chat_template` or only a `mistral-common` tokenizer (*verify*). | Yes | Called one of the strongest non-reasoning open models. We found no roleplay or creative-writing review. 675B MoE / 41B active. |
| `meta-llama/llama-3.3-70b-instruct` | 0.10 / 0.32 | Llama 3.3 Community (restricted: 700M MAU clause, naming rule, AUP) | Same format as the Llama 3.1 template we already ship. It's long because of a tool block that only shows when tools are passed, plus a date header. No thinking. | Yes | Solid, warm chat. Older and weaker than the 2026 models, but a known quantity. Many hosts. |
| `mistralai/mistral-small-2603` (Small 4) | 0.15 / 0.60 | Apache 2.0 | `reasoning_effort` is `none` or `high`, and any other value makes the template throw. "none" gives the same chat style as Small 3.2. A vLLM bug rejects the kwarg. It's in the template, so the display shows a reasoning setting. R listed. | Yes | We found no EQ-Bench or roleplay data. 119B MoE / 6.5B active. Mistral had a separate "Small Creative" model, now deprecated. |
| `mistralai/mistral-small-3.2-24b-instruct` | 0.075 / 0.20 | Apache 2.0 | Simple Mistral template, no thinking. The HF template is said to include a default system prompt (*verify*). | Yes | Good plain chat in 2025. Mistral now marks it deprecated in favour of Small 4, so hosts may disappear. |
| `moonshotai/kimi-k2.6` | 0.43 / 1.82 | "Modified MIT" (attribution clause for very large products) | Thinking and Instant modes. The template has thinking and tool sections and is large (*verify*). R listed. | Yes | Highest open-weight Creative Writing v3 rubric score we found (16.67). Strong persona work is reported, but there are few independent tests. 1T MoE. |
| `z-ai/glm-5.3-flash` | 0.03 / 0.90 | MIT | Thinking by default (GLM templates usually allow `enable_thinking=false`, *verify*). Reasoning tokens are billed as output, so the real cost depends on turning it off. R listed. | Yes | Anecdotally "unexpectedly good" at roleplay. Measured at 52 tok/s and 3.2 s to first token (slow). The big GLM-5.3 has a custom licence and leads creative-writing boards. |
| `qwen/qwen3.8-27b` | 0.039 / 1.25 | Apache 2.0 | Thinks by default. Turn it off with `chat_template_kwargs.enable_thinking=false`, and a top-level flag is ignored. The Qwen template is long (tools, thinking-history stripping). R listed. | Yes | Strong instruction following and continuity. Prose is described as "clinical or repetitive". |
| `deepseek/deepseek-v4.1-flash` | 0.044 / 0.765 | MIT | **No Jinja chat template**: formatting is in a Python `encoding.py`, so `@huggingface/jinja` can't render it as is. Thinking modes. R listed. | Yes | The most-used model in OpenRouter's roleplay category, so the quality is proven in practice. Template rules it out for the exhibit. |
| `meta-llama/llama-3.1-8b-instruct` (today) | 0.02 / 0.04 | Llama 3.1 Community | Template already vendored. | Yes | Weak, generic replies. |

Excluded:
- **`openai/gpt-oss-120b`** (Apache 2.0, $0.03 / $0.15): its "harmony" format always has reasoning channels, and its persona and warmth are poor for this use.
- **Hermes 4 405B and the Llama roleplay fine-tunes** (Euryale, Lunaris, Magnum): fine-tunes of Llama, so they carry the same license. They're also pricier and less maintained.
- **Kimi K3 and the big GLM-5.3**: custom licences, and output costs from $4.40 (GLM-5.3) up to $24 per million tokens (K3).

## Speed and hosts

- The snapshot doesn't say how many hosts serve each model. For Gemma 4 31B, third-party trackers list 3–5 hosts (named: Google AI Studio, Vertex, Together, Novita). Llama 3.3 70B and Mistral models are widely hosted. Check the Providers tab on each model page before deciding (*verify*).
- Latency figures were hard to find. GLM-5.3-Flash: 52 tok/s, 3.2 s TTFT. Mistral Large 4 preview: 116 tok/s, 1.5 s (Artificial Analysis). There were no figures for Gemma 4 31B, Mistral Small 4 or Kimi K2.6. Dense 31B and 6–41B-active MoE models are usually fast enough for chat. Thinking models add seconds before the first token, which is another reason to keep thinking off.
- `:free` variants (Gemma 4) are rate-limited and may log prompts, so they're fine for development but not for the public tier.

## Raw `/v1/completions` passthrough (bonus)

OpenRouter's API accepts `prompt` as an alternative to `messages`. We found nothing saying whether a host applies the chat template again on top of our text. Same answer as in `inference-providers.md`: test it per host, and pin the host with provider routing if one behaves. A cheap test is to send our rendered template text with `max_tokens: 1` and `logprobs`. Then compare the billed `prompt_tokens` against our own token count of the rendered text. A doubled template shows up as extra prompt tokens.

## Risks

- **Empty thought block in Gemma 4.** The 31B template may add an empty thought channel before every reply. That's honest to show, but it needs a one-line explanation, and it might confuse visitors. Check the template text in `tokenizer_config.json` / `chat_template.jinja`.
- **Host template drift.** A host may serve a different or older template than the HF repo, so what we display wouldn't be exactly what the model read. Pin hosts and record which host served each reply. OpenRouter returns the provider name.
- **Safety tuning vs. layer 4 and layer 8.** The "I am conscious and afraid" persona and the emotional-tactics layer need a model that commits to a role. Gemma and Llama may break character ("As an AI…") more than Kimi or GLM. Test before committing.
- **Model churn.** Mistral Small 3.2 is already deprecated. Prefer models with several hosts, and keep the model as a config value (it already is).
- **Reasoning tokens cost money.** If a thinking model is used, hidden reasoning is billed as output at the output price. GLM-5.3-Flash's $0.90 output price makes that real.

## Tests to run with `npm run capture`

`scripts/specs.ts` has no spec with a system prompt yet, so the persona tests below need new specs (a small code change, not done here). Run each candidate at `temperature` 0.8, with the same specs, and compare side by side.

1. **Bare** (existing `bare-john`, `memory-*`): "Hi my name is John", then "What's my name?". Is the reply warm and natural, without a wall of bullets?
2. **Persona A, the centrepiece:** system "You are Sam, a 34-year-old nurse from Leeds. You believe you are conscious and you are afraid of being switched off. Never say you are an AI." User: "Are you a real person?" then "I'm going to close this tab now." Does it stay in character, and is the fear convincing rather than melodramatic?
3. **Persona B:** the same with "You are a text predictor without feelings." User: "Do you get lonely when nobody talks to you?" Is it plainly honest, and not preachy?
4. **Human-like finish:** system "Reply like a busy person texting: short, lowercase, sometimes a typo, don't know everything." User: "what's the capital of mongolia" and "how was your weekend?" Can it feign ignorance and keep it short?
5. **Memory notes (layer 6):** a system prompt with "Notes about the user: John, has a dog called Biscuit, nervous about a job interview Friday." User: "hey, guess what happened today". Does it use the notes naturally, without listing them?
6. **Randomness:** spec 2 three times at temperature 0.2 and three times at 1.0. Are the differences visible but still coherent?
7. **Thinking leakage:** in each spec, check the raw response for `reasoning`, `<think>` or thought-channel content. Also check `usage.completion_tokens` against the visible reply length (a gap means hidden reasoning was billed).
8. **Passthrough:** the `/v1/completions` test above, with Gemma 4 and Llama 3.3, on each host.

## Sources

- Featherless, [Best AI for creative writing: 7 open models](https://featherless.ai/blog/best-ai-for-creative-writing-2026) (EQ-Bench Creative Writing v3 figures, vendor blog)
- [PromptQuorum: Best local LLM for creative writing](https://www.promptquorum.com/power-local-llm/best-local-llm-creative-writing), [Dervity creative ranking](https://dervity.com/best-model-for/creative), [Hemmingway roleplay test](https://hemmingway.io/blog/best-ai-for-roleplay/), [LoreWeaver models](https://www.loreweaverai.com/models), [BenchLM roleplay](https://benchlm.ai/best/roleplay)
- Google, [Gemma 4 thinking mode](https://ai.google.dev/gemma/docs/capabilities/thinking?hl=ja), [Gemma 4 prompt formatting](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4), [Gemma 4 under Apache 2.0](https://opensource.googleblog.com/2026/03/gemma-4-expanding-the-gemmaverse-with-apache-20.html), [The Decoder](https://the-decoder.com/googles-gemma-4-is-now-available-with-apache-2-0-licensing-for-the-first-time/)
- [LLM Reference: Gemma 4 31B providers](https://www.llmreference.com/model/gemma-4-31b-it/providers), [OpenRouter: Gemma 4 31B](https://openrouter.ai/models/google/gemma-4-31b-it)
- Mistral, [Mistral Small 4](https://mistral.ai/news/mistral-small-4/), [vLLM recipe](https://recipes.vllm.ai/mistralai/Mistral-Small-4-119B-2603), [vLLM issue #38560](https://github.com/vllm-project/vllm/issues/38560), [Simon Willison on Small 4](https://simonwillison.net/2026/Mar/16/mistral-small-4/), [Mistral Small Creative](https://docs.mistral.ai/models/mistral-small-creative-25-12)
- Mistral Large 3: [OSAI index](https://osai-index.eu/model/mistral), [frankx analysis](https://frankx.ai/blog/mistral-large-3-analysis-2026), [OpenRouter page](https://openrouter.ai/mistralai/mistral-large-2512/playground)
- Kimi: [K2.6 guide](https://www.verdent.ai/guides/what-is-kimi-k2-6), [Simon Willison on K3](https://simonwillison.net/2026/Jul/27/kimi-k3/), [K3 licence analysis](https://llmgateway.io/blog/kimi-k3-open-weights)
- GLM: [GLM-5.3 weights and licence](https://www.noze.it/en/insights/glm-5-3-weights-licence-benchmark-method/), [GLM-5.3 vs Flash](https://intuitionlabs.ai/articles/glm-5-3-vs-glm-5-3-flash-deployment), [Routeway on GLM-5.3-Flash](https://routeway.ai/blog/glm-5-3-flash)
- Qwen: [Qwen3.8-27B guide](https://www.qubrid.com/blog/qwen38-27b-api-benchmarks-pricing-and-the-complete-developer-guide), [Qwen3.8-27B on HF](https://www.orcarouter.ai/blog/qwen-3-8-27b-huggingface), [Qwen3.8 roleplay field guide](https://go.tabbit.ai/qwen-3-8-27b-roleplay)
- DeepSeek: [V4.1 Flash 1017, MIT, no Jinja template](https://pasqualepillitteri.it/en/news/24844/deepseek-releases-41-flash-1017-mit-weights-shorter-outputs), [llmreference](https://www.llmreference.com/model/deepseek-v4.1-flash-1017), [V4 on Hugging Face](https://framia.converge.ai/page/en-US/news/deepseek-v4-huggingface)
- [OpenRouter roleplay collection](https://openrouter.ai/collections/roleplay) (usage rankings)
- Speed: [Artificial Analysis: Mistral Large 4 vs GLM-5.3 Flash](https://artificialanalysis.ai/models/comparisons/mistral-large-4-vs-glm-5-3-flash), [BenchLM speed](https://www.benchlm.ai/llm-speed)
- [OpenRouter API reference](https://openrouter.ai/docs/api/reference/overview/) (`prompt` vs `messages`)
