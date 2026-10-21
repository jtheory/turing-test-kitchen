// Capture real model outputs into examples/<id>.json.
//
//   npm run capture -- --section memory \
//     --base-url https://openrouter.ai/api --model anthropic/claude-sonnet-5.5 --provider OpenRouter
//
// Options: --spec <id> or --section <bare|memory|under-the-hood> (both
// repeatable), --base-url, --model, --provider, --timeout <seconds per request, default 120>,
// --start-token <text> (put before every document, for servers that don't add the model's start token). The key is read from CAPTURE_API_KEY (or from a .env file in the
// project root) and never written to the examples.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { capture } from "./captureLib";
import { specs } from "./specs";

// Load .env if present. It is gitignored; see .env.example.
try {
  process.loadEnvFile();
} catch {
  // No .env: use the shell environment.
}

const { values } = parseArgs({
  options: {
    spec: { type: "string", multiple: true },
    section: { type: "string", multiple: true },
    "base-url": { type: "string" },
    model: { type: "string" },
    provider: { type: "string" },
    out: { type: "string", default: "examples" },
    timeout: { type: "string", default: "120" },
    "start-token": { type: "string" },
  },
});

const baseUrl = values["base-url"];
const { model, provider } = values;
if (!baseUrl || !model || !provider) {
  console.error("Required: --base-url, --model, --provider. Pick specs with --spec <id> or --section <name>.");
  console.error("Specs:\n" + specs.map((s) => `  ${s.id} (${s.section}, ${s.mode})`).join("\n"));
  process.exit(1);
}

const chosen = specs.filter(
  (s) => values.spec?.includes(s.id) || values.section?.includes(s.section),
);
if (chosen.length === 0) {
  console.error("No specs selected.");
  process.exit(1);
}

// A stuck server (e.g. one that crashed on a request without answering) fails that spec instead of hanging.
const timeoutMs = Number(values.timeout) * 1000;
const fetchWithTimeout: typeof fetch = (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

mkdirSync(values.out!, { recursive: true });
const failed: string[] = [];
for (const spec of chosen) {
  console.log(`capturing ${spec.id}…`);
  try {
    const example = await capture(spec, { baseUrl, model, provider, apiKey: process.env.CAPTURE_API_KEY, startToken: values["start-token"] }, fetchWithTimeout);
    const file = join(values.out!, `${example.id}.json`);
    writeFileSync(file, JSON.stringify(example, null, 2) + "\n");
    console.log(`wrote ${file}`);
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? `no response after ${values.timeout}s` : String(err);
    console.error(`failed ${spec.id}: ${reason}`);
    failed.push(spec.id);
  }
}
if (failed.length > 0) {
  console.error(`\n${failed.length} of ${chosen.length} failed: ${failed.join(", ")}`);
  process.exit(1);
}
