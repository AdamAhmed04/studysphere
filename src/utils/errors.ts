/**
 * Pulls a readable message out of a caught value.
 *
 * `catch (err)` gives you `unknown`, which is the truth: anything can be
 * thrown. Every catch block here used to be annotated `catch (err: any)` and
 * then read `err.message` straight off it, which is a runtime error waiting for
 * the first thing that throws a string.
 *
 * The object branch is not decoration. Supabase rejects with a PostgrestError,
 * which is a plain object carrying `message` and `code` — it is not an instance
 * of Error, so an `instanceof` check on its own would quietly drop the useful
 * message and fall through to the generic one.
 */
export const errorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
};
