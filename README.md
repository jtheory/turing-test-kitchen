# Turing Test Kitchen

**See how a chatbot is put together, one layer at a time.**

Turing Test Kitchen is an educational web app for non-technical people. It starts with a strong chat model sent a single message and nothing else. Then it adds, one ingredient at a time, what a chat app wraps around it (memory, hidden instructions, a persona, notes about you, human-like tricks) until the result reads like a person.

At every step you can see **exactly what text goes into the model and what comes out**. Nothing is hidden.

## Who it's for

People who use chatbots but don't build them, and who wonder what's really going on when a chatbot says it remembers them, has feelings, or wants something. Engineers are welcome too, but the app is written for everyone else.

## What you'll see

1. **The bare model**: a strong chat model sent one message and nothing else.
2. **Memory is re-sending**: the app re-sends the whole conversation each turn.
3. **Hidden instructions**: the long note the app puts before your first word.
4. **Persona**: one hidden sentence changes the whole personality.
5. **Randomness**: why the same question gets different answers.
6. **Long-term memory**: how notes about you get slipped into the text.
7. **Tools and lookups**: "it looked it up" means text pasted into the prompt.
8. **Human-like finish**: typing delays, short replies, pretending not to know things.

Plus **Under the hood**: the hidden formatting step between your message and the model, shown for real with open models.

## Principles

- **Clarity first.** Plain language, no jargon without an explanation.
- **Show, don't tell.** Every claim is backed by something you can inspect.
- **Honest about limits.** The app shows that human-like text on its own is not evidence of an inner life, because you can watch it being produced. It does not claim to settle whether AI systems could ever matter morally. That is an open question.
- **Free to use.** No accounts, no payment.

## Status

Milestone M1 (skeleton and inspector) in progress: layer 1 (the bare model, live in development builds), layer 2 (memory), the "Under the hood" aside, the inspector and the mobile layout are built. Recorded examples still need capturing from real models; see [examples/README.md](examples/README.md). Plan and decisions: [PLAN.md](PLAN.md).

## Development

```sh
npm install
npm run dev        # local site
npm test           # unit and component tests
npm run typecheck
npm run build      # static site in dist/
npm run capture    # record examples; see examples/README.md
npm run models     # refresh data/openrouter/models.json and show your key's limit
```

**Live model while developing:** in `npm run dev`, the "Live model" button in the header takes an OpenAI-compatible provider address (default OpenRouter), your API key, a chat model (default `anthropic/claude-sonnet-5.5`) and optionally a base model for the "Under the hood" page. They're kept in your browser's localStorage and the key is sent only to that provider. Production builds leave this out entirely.

Code map:

- `src/lib/assemble.ts`: `assemble(config, conversation) -> request`, the single source of what the model receives. Modes: `single` (bare model), `transcript` (memory), `document` and `template` (under the hood).
- `src/components/Inspector.tsx`: shows that request and the raw response, readable or byte-exact.
- `src/lib/send.ts`: sends an assembled request (shared by the site and the capture script).
- `src/lib/live.tsx`, `src/components/LivePanel.tsx`: the development-only live model settings.
- `src/lib/storage.ts`: guarded localStorage helpers for everything the site remembers.
- `src/lib/templates.ts`, `src/data/chat-templates.json`: real chat templates for the "Under the hood" page.
- `scripts/models.ts`: snapshot of OpenRouter's model list (prices, context, parameters, likely base models). Commit the snapshot so model choices can be reviewed from the repo. `--endpoints <id,…>` also saves which hosts serve given models.
- `scripts/specs.ts`, `scripts/capture.ts`: what to record, and the script that records it.
- `src/content/layers.ts`: the plain-language copy for each layer.

## License

TBD.
