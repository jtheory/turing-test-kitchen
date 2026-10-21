// Persona bake-off: run every candidate model through the same judge-style
// conversations, then write blind transcripts to score.
//
//   npm run bakeoff                      # everything in scripts/bakeoff/config.ts
//   npm run bakeoff -- --dry-run         # show what would run, and how many requests
//   npm run bakeoff -- --only gemma --only mistral --convo small-talk
//
// Writes data/bakeoff/<timestamp>/: blind.md (read first), key.md, results.json.
// Reads CAPTURE_API_KEY from .env. Goes to OpenRouter unless --base-url is given.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { assignLetters, blindReport, keyReport, runConversation, type RunResult } from "./bakeoffLib";
import { candidates, conversations, persona } from "./bakeoff/config";

try {
  process.loadEnvFile();
} catch {
  // No .env: use the shell environment.
}

const { values } = parseArgs({
  options: {
    only: { type: "string", multiple: true },
    convo: { type: "string", multiple: true },
    "dry-run": { type: "boolean", default: false },
    "base-url": { type: "string", default: "https://openrouter.ai/api" },
    timeout: { type: "string", default: "180" },
    concurrency: { type: "string", default: "4" },
  },
});

const chosen = candidates.filter((c) => !values.only || values.only.some((o) => c.model.includes(o)));
const convos = conversations.filter((c) => !values.convo || values.convo.includes(c.id));
const jobs = chosen.flatMap((c) => c.variants.map((v) => ({ model: c.model, variant: v })));
const runs = jobs.flatMap((j) => convos.map((convo) => ({ ...j, convo })));
const requests = runs.reduce((n, r) => n + r.convo.turns.length, 0);

console.log(`${jobs.length} bots × ${convos.length} conversations = ${runs.length} runs, ${requests} requests.`);
for (const j of jobs) console.log(`  ${j.model} (${j.variant.label})`);
if (values["dry-run"]) process.exit(0);

const apiKey = process.env.CAPTURE_API_KEY;
if (!apiKey) {
  console.error("No CAPTURE_API_KEY in .env.");
  process.exit(1);
}

const timeoutMs = Number(values.timeout) * 1000;
const fetchWithTimeout: typeof fetch = (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
const ep = { baseUrl: values["base-url"]!, apiKey };

// Run a few conversations at once; each conversation's turns stay in order.
const results: RunResult[] = [];
let next = 0;
let done = 0;
async function worker() {
  while (next < runs.length) {
    const r = runs[next++];
    const result = await runConversation(r.model, r.variant, r.convo, persona, ep, fetchWithTimeout);
    results.push(result);
    done++;
    const failed = result.turns.some((t) => t.error) ? "  (had an error)" : "";
    console.log(`[${done}/${runs.length}] ${r.model} (${r.variant.label}) · ${r.convo.id}${failed}`);
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(values.concurrency)) }, worker));

const contestants = assignLetters(jobs.map((j) => ({ model: j.model, variant: j.variant.label })));
const dir = join("data", "bakeoff", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "blind.md"), blindReport(results, contestants, persona, convos.map((c) => c.id)) + "\n");
writeFileSync(join(dir, "key.md"), keyReport(results, contestants) + "\n");
writeFileSync(join(dir, "results.json"), JSON.stringify({ persona, contestants, results }, null, 1) + "\n");

const cost = results.flatMap((r) => r.turns).reduce((s, t) => s + (t.costUsd ?? 0), 0);
const errors = results.flatMap((r) => r.turns).filter((t) => t.error).length;
console.log(`\nDone. Total cost $${cost.toFixed(4)}${errors ? `, ${errors} failed turns (see key.md)` : ""}.`);
console.log(`Read ${join(dir, "blind.md")} first, then ${join(dir, "key.md")}.`);
