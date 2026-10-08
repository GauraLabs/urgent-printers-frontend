const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** True when an option's description just repeats its label (case- and whitespace-insensitive). */
export function isRedundantDescription(label: string, description?: string | null): boolean {
  if (!description) return true;
  return normalise(label) === normalise(description);
}

/** A group with exactly one choice has nothing to pick; mobile shows it as a read-only line. */
export function isSingleChoice(options: readonly unknown[]): boolean {
  return options.length === 1;
}

/** "3.5 x 2 in (Standard)" -> "3.5 × 2 in (Standard)" for display only. */
export function prettySize(label: string): string {
  return label.replace(/(\d)\s*x\s*(\d)/gi, "$1 × $2");
}
