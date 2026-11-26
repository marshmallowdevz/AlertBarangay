const mojibakeReplacements: ReadonlyArray<readonly [string, string]> = [
  ["\u00e2\u20ac\u201d", "\u2014"],
  ["\u00e2\u20ac\u201c", "\u2013"],
  ["\u00e2\u20ac\u00a6", "\u2026"],
  ["\u00e2\u20ac\u2122", "\u2019"],
  ["\u00e2\u20ac\u0153", "\u201c"],
  ["\u00e2\u20ac\u009d", "\u201d"],
  ["\u00c5\u00b7", "\u00b7"],
  ["\u00c2\u00b7", "\u00b7"],
];

export function cleanUserMetadataLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return mojibakeReplacements.reduce((cleaned, [corrupted, replacement]) => cleaned.replaceAll(corrupted, replacement), value).trim() || null;
}
