# Turing Test Kitchen

**See how a chatbot is put together, one layer at a time.**

Turing Test Kitchen is an educational web app for non-technical people. It starts with a bare language model that only predicts the next words in a piece of text. Then it adds one ingredient at a time (chat formatting, memory, hidden instructions, a persona, human-like tricks) until the result reads like a person.

At every step you can see **exactly what text goes into the model and what comes out**. Nothing is hidden.

## Who it's for

People who use chatbots but don't build them, and who wonder what's really going on when a chatbot says it remembers them, has feelings, or wants something. Engineers are welcome too, but the app is written for everyone else.

## What you'll see

1. **Plain text prediction**: a model that just continues text, with no "conversation" at all.
2. **Chat formatting**: how a conversation is turned into one long piece of text.
3. **One message at a time**: the model on its own has no memory.
4. **Memory**: the app re-sends the whole conversation each turn.
5. **Hidden instructions**: a short note the user never sees shapes the whole personality.
6. **Randomness**: why the same question gets different answers.
7. **Long-term memory**: how notes about you get slipped into the text.
8. **Human-like tricks**: typing delays, typos, short replies, pretending not to know things.

## Principles

- **Clarity first.** Plain language, no jargon without an explanation.
- **Show, don't tell.** Every claim is backed by something you can inspect.
- **Honest about limits.** The app shows that human-like text on its own is not evidence of an inner life, because you can watch it being produced. It does not claim to settle whether AI systems could ever matter morally. That is an open question.
- **Free to use.** No accounts, no payment.

## Status

Milestone M1 (skeleton and inspector) in progress: layers 1–4, the inspector and the mobile layout are built. Recorded examples still need capturing from real models; see [examples/README.md](examples/README.md). Plan and decisions: [PLAN.md](PLAN.md).

## Development

```sh
npm install
npm run dev        # local site
npm test           # unit and component tests
npm run typecheck
npm run build      # static site in dist/
npm run capture    # record examples; see examples/README.md
```

Code map:

- `src/lib/assemble.ts`: `assemble(layerConfig, conversation) -> request`, the single source of what the model receives.
- `src/components/Inspector.tsx`: shows that request and the raw response, readable or byte-exact.
- `src/lib/templates.ts`, `src/data/chat-templates.json`: real chat templates for layer 2.
- `scripts/specs.ts`, `scripts/capture.ts`: what to record, and the script that records it.
- `src/content/layers.ts`: the plain-language copy for each layer.

## License

TBD.
