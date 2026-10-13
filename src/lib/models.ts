/** A guess from a model's id or display name; providers don't label base models consistently. */
export function looksBase(label: string): boolean {
  return /(^|[-_/.(\s])base($|[-_.:)\s])/i.test(label) && !/instruct|chat/i.test(label);
}
