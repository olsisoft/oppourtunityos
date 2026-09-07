/**
 * Value-dimension inputs proposed by the LLM. null stays null (UNKNOWN): the
 * application never turns a missing dimension into an estimate. Numbers are
 * clamped to the 0–10 scale and rounded.
 */
export function cleanNullableScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(10, Math.max(0, n)));
}
