// Capture real model outputs into examples/<id>.json.
//
//   CAPTURE_API_KEY=... npm run capture -- --layer 1 \
//     --base-url https://api.example.com --model some/base-model --provider "Example"
//
// Options: --spec <id> (repeatable) or --layer <n>, --base-url, --model,
// --provider. The key is read from CAPTURE_API_KEY (or from a .env file in the
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
    layer: { type: "string", multiple: true },
    "base-url": { type: "string" },
    model: { type: "string" },
    provider: { type: "string" },
    out: { type: "string", default: "examples" },
  },
});

const baseUrl = values["base-url"];
const { model, provider } = values;
if (!baseUrl || !model || !provider) {
  console.error("Required: --base-url, --model, --provider. Pick specs with --spec <id> or --layer <n>.");
  console.error("Specs:\n" + specs.map((s) => `  ${s.id} (layer ${s.layer})`).join("\n"));
  process.exit(1);
}

const chosen = specs.filter(
  (s) => values.spec?.includes(s.id) || values.layer?.includes(String(s.layer)),
);
if (chosen.length === 0) {
  console.error("No specs selected.");
  process.exit(1);
}

mkdirSync(values.out!, { recursive: true });
for (const spec of chosen) {
  const example = await capture(spec, { baseUrl, model, provider, apiKey: process.env.CAPTURE_API_KEY }, fetch);
  const file = join(values.out!, `${spec.id}.json`);
  writeFileSync(file, JSON.stringify(example, null, 2) + "\n");
  console.log(`wrote ${file}`);
}
