// Plain-language copy for each layer. Keep it short and concrete.

export interface LayerInfo {
  n: number;
  title: string;
  aha: string;
  intro: string[];
  available: boolean;
}

export const layers: LayerInfo[] = [
  {
    n: 1,
    title: "Plain text prediction",
    aha: "It isn't talking to you. It's continuing a document.",
    intro: [
      "Every chatbot starts as a base model: a program trained on a huge amount of text to do one thing, guess which words come next.",
      "Give it the start of a document and it writes more of that document. There is no \"you\" and no \"it\" yet, just text that keeps going.",
      "Below are real outputs from a base model. The inspector shows the exact text it was given and the exact text it produced.",
    ],
    available: true,
  },
  {
    n: 2,
    title: "Chat formatting",
    aha: "A \"conversation\" is a formatting convention.",
    intro: [
      "Chat models are base models given extra training on text laid out as conversations, using special markers that say who is speaking.",
      "When you chat, your messages are stitched into one long text with those markers. The model then continues that text, just as in layer 1. Its \"turn\" ends when it writes the end-of-message marker.",
      "Edit the conversation below and watch the real formats of three open models change. Nothing here is sent to a model; this is only the formatting step.",
    ],
    available: true,
  },
  {
    n: 3,
    title: "One message at a time",
    aha: "The model has no memory of its own.",
    intro: [
      "A model doesn't change while you talk to it. Each request is handled from scratch, and nothing is kept afterwards.",
      "Here, the app sends only your newest message. Watch what happens when the second message refers to the first.",
    ],
    available: true,
  },
  {
    n: 4,
    title: "Conversation memory",
    aha: "\"Remembering\" means re-reading everything.",
    intro: [
      "To make the model seem to remember, the app sends the whole conversation again with every new message.",
      "Same two messages as layer 3. Compare the inspector at each turn: the request grows each time.",
    ],
    available: true,
  },
  { n: 5, title: "Hidden instructions", aha: "One hidden sentence changes the whole personality.", intro: [], available: false },
  { n: 6, title: "Randomness", aha: "Same input, different answers.", intro: [], available: false },
  { n: 7, title: "Long-term memory", aha: "\"It remembers me\" means notes pasted into the text.", intro: [], available: false },
  { n: 8, title: "Human-like tricks", aha: "Humanness can be added as a finishing layer.", intro: [], available: false },
];
