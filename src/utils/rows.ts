/**
 * Helpers for the database-row to UI-object boundary.
 *
 * Postgres columns are nullable, so the generated row types say `T | null`.
 * The UI interfaces use optional properties, which means `T | undefined`.
 * Those are different types and TypeScript is right to say so — these convert
 * at the one place that should know about it, the mapper.
 *
 * Before the schema was typed, every mapper took an `any` row and the mismatch
 * was invisible.
 */

/** `null` becomes `undefined`, for an optional UI property. */
export const orUndefined = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

/** `null` becomes `''`, for a required UI string. */
export const orEmpty = (value: string | null | undefined): string => value ?? '';

/** `null` becomes `false`, for a required UI boolean. */
export const orFalse = (value: boolean | null | undefined): boolean => value ?? false;

/**
 * Narrows a text column that a CHECK constraint already restricts.
 *
 * The database enforces the allowed values, but it reports the column as plain
 * `text`, so the generated type is `string`. Rather than assert blindly this
 * validates against the list and falls back, so an unexpected value from a
 * future migration degrades instead of lying about its type.
 */
export const asOneOf = <T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T
): T => (allowed.includes(value as T) ? (value as T) : fallback);
