/** A guess from a model's id or display name; providers don't label base models consistently. */
export function looksBase(label: string): boolean {
  return /(^|[-_/.(\s])base($|[-_.:)\s])/i.test(label) && !/instruct|chat/i.test(label);
}

const labels: Record<string, string> = {
  "anthropic/claude-sonnet-5.5": "Claude Sonnet 5.5",
  "anthropic/claude-haiku-5.5": "Claude Haiku 5.5",
  "meta-llama/llama-3.1-8b-instruct": "Llama 3.1 8B Instruct",
};

/** A readable name for a model id, or the id itself. */
export function modelLabel(id: string): string {
  return labels[id] ?? id;
}
