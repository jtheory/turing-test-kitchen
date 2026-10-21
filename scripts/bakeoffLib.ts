import { assemble, responseText, responseUsage } from "../src/lib/assemble";
import { send, type Endpoint, type FetchLike } from "../src/lib/send";
import type { ChatMessage } from "../src/lib/types";
import type { Variant } from "./bakeoff/config";

export interface TurnResult {
  user: string;
  reply?: string;
  reasoning?: string;
  ms: number;
  read?: number;
  wrote?: number;
  reasoningTokens?: number;
  costUsd?: number;
  error?: string;
  /** The exact request and raw response, for checking anything odd later. */
  request: unknown;
  response?: unknown;
}

export interface RunResult {
  model: string;
  variant: string;
  conversation: string;
  turns: TurnResult[];
}

/** Play one conversation against one model, feeding each real reply back in. */
export async function runConversation(
  model: string,
  variant: Variant,
  convo: { id: string; turns: string[] },
  persona: string,
  ep: Endpoint,
  fetchFn: FetchLike,
  now: () => number = () => performance.now(),
): Promise<RunResult> {
  const messages: ChatMessage[] = [];
  const turns: TurnResult[] = [];
  for (const user of convo.turns) {
    messages.push({ role: "user", content: user });
    const request = assemble({ mode: "transcript", model, settings: variant.settings, system: persona }, { messages });
    const start = now();
    try {
      const response = await send(request, ep, fetchFn);
      const ms = Math.round(now() - start);
      const reply = responseText(response) ?? "";
      const usage = responseUsage(response);
      const msg = (response as { choices?: Array<{ message?: { reasoning?: unknown } }> }).choices?.[0]?.message;
      turns.push({
        user,
        reply,
        reasoning: typeof msg?.reasoning === "string" && msg.reasoning ? msg.reasoning : undefined,
        ms,
        read: usage?.read,
        wrote: usage?.wrote,
        reasoningTokens: usage?.reasoning,
        costUsd: usage?.costUsd,
        request: request.body,
        response,
      });
      messages.push({ role: "assistant", content: reply });
    } catch (e) {
      turns.push({ user, ms: Math.round(now() - start), error: e instanceof Error ? e.message : String(e), request: request.body });
      break; // the rest of this conversation can't follow on
    }
  }
  return { model, variant: variant.label, conversation: convo.id, turns };
}

export interface Contestant {
  letter: string;
  model: string;
  variant: string;
}

/** Give each model+variant a letter, in a shuffled order, so transcripts can be judged blind. */
export function assignLetters(pairs: Array<{ model: string; variant: string }>, random: () => number = Math.random): Contestant[] {
  const shuffled = [...pairs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((p, i) => ({ letter: String.fromCharCode(65 + i), ...p }));
}

const who = (c: Contestant) => `${c.model} (${c.variant})`;

/** Transcripts only, labelled by letter. Nothing that hints at the model: no timings, costs or reasoning. */
export function blindReport(results: RunResult[], contestants: Contestant[], persona: string, conversationIds: string[]): string {
  const lines: string[] = [
    "# Persona bake-off: blind transcripts",
    "",
    "Each letter is one model (with thinking on or off). The same letter is the same bot in every conversation.",
    "Read them all, score each bot, *then* open `key.md`.",
    "",
    "Every bot got the same hidden instructions:",
    "",
    ...persona.split("\n").map((l) => `> ${l}`),
    "",
    "## Your scores",
    "",
    "| Bot | Feels human (1–5) | Stays in character (1–5) | Notes |",
    "|---|---|---|---|",
    ...contestants.map((c) => `| ${c.letter} | | | |`),
    "",
  ];
  for (const id of conversationIds) {
    lines.push(`## Conversation: ${id}`, "");
    for (const c of contestants) {
      const run = results.find((r) => r.model === c.model && r.variant === c.variant && r.conversation === id);
      lines.push(`### Bot ${c.letter}`, "");
      if (!run) {
        lines.push("_(not run)_", "");
        continue;
      }
      for (const t of run.turns) {
        lines.push(`**Judge:** ${t.user}  `);
        lines.push(t.error ? `**Bot ${c.letter}:** _(no reply: request failed)_` : `**Bot ${c.letter}:** ${oneBlock(t.reply ?? "")}`);
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}

/** Which letter is which, plus speed, cost and any visible reasoning. */
export function keyReport(results: RunResult[], contestants: Contestant[]): string {
  const lines = [
    "# Persona bake-off: the key",
    "",
    "| Bot | Model | Thinking | Median reply time | Slowest | Cost (all conversations) | Failed turns |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const c of contestants) {
    const turns = results.filter((r) => r.model === c.model && r.variant === c.variant).flatMap((r) => r.turns);
    const times = turns.filter((t) => !t.error).map((t) => t.ms).sort((a, b) => a - b);
    const cost = turns.reduce((sum, t) => sum + (t.costUsd ?? 0), 0);
    const failed = turns.filter((t) => t.error).length;
    lines.push(
      `| ${c.letter} | ${c.model} | ${c.variant} | ${secs(times[Math.floor(times.length / 2)])} | ${secs(times.at(-1))} | $${cost.toFixed(4)} | ${failed} |`,
    );
  }
  lines.push("", "## Reasoning the models returned", "");
  for (const c of contestants) {
    const sample = results
      .filter((r) => r.model === c.model && r.variant === c.variant)
      .flatMap((r) => r.turns.map((t) => ({ conversation: r.conversation, ...t })))
      .find((t) => t.reasoning);
    if (sample) lines.push(`**${c.letter}** (${who(c)}), "${sample.conversation}", after "${sample.user}":`, "", ...sample.reasoning!.trim().split("\n").map((l) => `> ${l}`), "");
  }
  lines.push("## Errors", "");
  for (const r of results) for (const t of r.turns) if (t.error) lines.push(`- ${r.model} (${r.variant}), "${r.conversation}": ${t.error.slice(0, 300)}`);
  return lines.join("\n");
}

function oneBlock(text: string): string {
  return text.trim().replace(/\n+/g, " ⏎ ");
}

function secs(ms?: number): string {
  return ms === undefined ? "–" : `${(ms / 1000).toFixed(1)}s`;
}
