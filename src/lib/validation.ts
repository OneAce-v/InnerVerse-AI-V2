const INT32_MAX = 2147483647;

/** The trimmed string if `value` is a string with visible content, otherwise null. */
export function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** True for an absent optional field or a string; false for any other JSON type. */
export function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

/**
 * A positive integer that fits a Postgres `serial`/`integer` column, or null.
 * Accepts route params (digit-only strings) as well as JSON numbers.
 */
export function positiveIntId(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 && n <= INT32_MAX ? n : null;
}

/**
 * Normalizes a YYYY-MM-DD date or a full ISO timestamp to its YYYY-MM-DD date,
 * or null if it isn't a real calendar date (rejects e.g. 2026-02-30).
 */
export function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return null;
  if (Number.isNaN(Date.parse(value))) return null;
  const day = value.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(day) ? day : null;
}
