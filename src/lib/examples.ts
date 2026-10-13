import type { RecordedExample, Section } from "./types";

/** Check that a recorded example is internally consistent. Returns a list of problems. */
export function validateExample(ex: RecordedExample, fileId?: string): string[] {
  const problems: string[] = [];
  if (fileId !== undefined && ex.id !== fileId) problems.push(`id "${ex.id}" does not match file name "${fileId}"`);
  if (!ex.model) problems.push("missing model");
  if (!ex.provider) problems.push("missing provider");
  if (Number.isNaN(Date.parse(ex.captured_at))) problems.push("captured_at is not a date");
  if (!Array.isArray(ex.turns) || ex.turns.length === 0) problems.push("no turns");
  const expectedKind = ex.mode === "document" || ex.mode === "template" ? "completion" : "chat";
  ex.turns?.forEach((t, i) => {
    if (t.request.kind !== expectedKind) problems.push(`turn ${i}: expected a ${expectedKind} request`);
    if (t.request.body.model !== ex.model) problems.push(`turn ${i}: request model differs from example model`);
    for (const [k, v] of Object.entries(ex.settings)) {
      if (JSON.stringify((t.request.body as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v))
        problems.push(`turn ${i}: setting ${k} differs from request`);
    }
    if (t.response === undefined || t.response === null) problems.push(`turn ${i}: missing response`);
  });
  return problems;
}

const modules = import.meta.glob<RecordedExample>("../../examples/*.json", { eager: true, import: "default" });

/** All recorded examples shipped with the site. */
export const examples: RecordedExample[] = Object.values(modules).sort((a, b) => a.id.localeCompare(b.id));

export function examplesFor(section: Section): RecordedExample[] {
  return examples.filter((e) => e.section === section);
}
