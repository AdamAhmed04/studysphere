/**
 * Guards for values that get interpolated into PostgREST filter strings.
 *
 * `.or('user_id.eq.' + id + ',friend_user_id.eq.' + id)` is a little language,
 * and commas, dots and parentheses are its syntax. A value carrying any of
 * those does not fail — it changes what the filter means. Today every id
 * interpolated in this codebase came from the database or the session, so
 * nothing is exploitable; the pattern is simply one careless caller away from
 * being a real hole, and the caller would have no way to notice.
 *
 * So the values are checked instead of assumed. A non-uuid throws before it can
 * reach a query, which turns a silent change of meaning into a loud failure.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value);

/**
 * Returns the value if it is a uuid, throws otherwise. `label` names the
 * argument so the error says which one was wrong.
 */
export const requireUuid = (value: unknown, label: string): string => {
  if (!isUuid(value)) {
    throw new Error(`${label} must be a uuid`);
  }
  return value;
};
