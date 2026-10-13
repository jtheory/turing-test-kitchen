// Fetch OpenRouter's current model list into data/openrouter/models.json,
// and print a short summary plus your key's limit and usage.
//
//   npm run models                        # model list + key status
//   npm run models -- --endpoints a/b,c/d # also: which hosts serve these models
//
// Reads CAPTURE_API_KEY from .env. The key is only sent to openrouter.ai and
// nothing about it is written to disk.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { snapshot, summarize, type RawModel } from "./modelsLib";

try {
  process.loadEnvFile();
} catch {
  // No .env: use the shell environment.
}

const API = "https://openrouter.ai/api/v1";
const OUT = join("data", "openrouter");
const key = process.env.CAPTURE_API_KEY?.trim();
const { values } = parseArgs({ options: { endpoints: { type: "string" } } });

async function get(path: string): Promise<unknown> {
  const res = await fetch(API + path, { headers: key ? { authorization: `Bearer ${key}` } : {} });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

mkdirSync(OUT, { recursive: true });

const list = (await get("/models")) as { data: RawModel[] };
const snap = snapshot(list.data, new Date());
writeFileSync(join(OUT, "models.json"), JSON.stringify(snap, null, 1) + "\n");
console.log(summarize(snap.models));
console.log(`\nwrote ${join(OUT, "models.json")}`);

if (values.endpoints) {
  for (const id of values.endpoints.split(",").map((s) => s.trim()).filter(Boolean)) {
    const data = await get(`/models/${id}/endpoints`);
    const file = join(OUT, "endpoints", `${id.replace(/[/:]/g, "__")}.json`);
    mkdirSync(join(OUT, "endpoints"), { recursive: true });
    writeFileSync(file, JSON.stringify({ fetched_at: new Date().toISOString(), data }, null, 1) + "\n");
    console.log(`wrote ${file}`);
  }
}

if (key) {
  // Printed only, never saved: account details stay on your machine.
  const k = (await get("/key")) as { data?: Record<string, unknown> };
  const d = k.data ?? {};
  console.log(
    `\nKey: limit ${d.limit ?? "none"}, remaining ${d.limit_remaining ?? "?"}, used ${d.usage ?? "?"}` +
      (d.limit_reset ? `, resets ${d.limit_reset}` : ""),
  );
} else {
  console.log("\nNo CAPTURE_API_KEY in .env; skipped the key check.");
}
