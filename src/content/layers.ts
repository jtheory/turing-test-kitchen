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
    title: "The bare model",
    aha: "It answers, but it knows nothing about you, today's date, or what app it's in.",
    intro: [
      "Here, one message goes to two chat models with nothing else added: no hidden instructions, no earlier conversation, no app wrapped around it.",
      "The first is one of today's strongest models. Its company keeps secret exactly how your message is laid out for it. The second is a small open model whose layout is published, so for that one you can see exactly what it reads.",
      "Chat models are trained to reply like this. What that training amounts to is a real question. Everything on the following pages is added on top of it, and you can watch each piece being added.",
    ],
    available: true,
  },
  {
    n: 2,
    title: "Memory is re-sending",
    aha: "\"Remembering\" means re-reading everything, every turn.",
    intro: [
      "A model doesn't change while you talk to it. Each request is handled from scratch, and nothing is kept afterwards.",
      "So to make it seem to remember, the app sends the whole conversation again with every new message. Try it: tell it your name, then ask for it, and watch what the model gets each time.",
    ],
    available: true,
  },
  { n: 3, title: "Hidden instructions", aha: "The longest part of the conversation is the part you never see.", intro: [], available: false },
  { n: 4, title: "Persona", aha: "One hidden sentence changes the whole personality.", intro: [], available: false },
  { n: 5, title: "Randomness", aha: "Same input, different answers.", intro: [], available: false },
  { n: 6, title: "Long-term memory", aha: "\"It remembers me\" means notes pasted into the text.", intro: [], available: false },
  { n: 7, title: "Tools and lookups", aha: "\"It looked it up\" means text pasted into the prompt.", intro: [], available: false },
  { n: 8, title: "Human-like finish", aha: "Humanness can be added as a finishing layer.", intro: [], available: false },
];
