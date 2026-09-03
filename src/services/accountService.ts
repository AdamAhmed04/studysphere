import { supabase } from '../lib/supabase';

/*
 * The two rights people exercise directly: getting a copy of what is held
 * about them, and having it deleted.
 *
 * Export runs in the browser rather than in a function, deliberately. Row
 * level security already scopes every one of these queries to the person
 * asking, so the database itself decides what they may see — the same rule
 * the rest of the app runs under, rather than a second set of permissions in
 * a function that could drift from it.
 *
 * Deletion cannot work that way. Removing an auth user needs the service
 * role, which must never reach a browser, so that goes through the
 * delete-account function.
 */

/**
 * Every table holding something about this person.
 *
 * Kept as a list rather than hand-written queries so that adding a table is
 * one line here — the failure mode of an export is silently omitting
 * something, which nobody notices until it matters.
 */
const OWNED_TABLES = [
  'user_profiles',
  'user_stats',
  'user_presence',
  'todos',
  'study_sessions',
  'calendar_events',
  'reminders',
  'notifications',
  'chat_messages',
  'study_group_members',
  'meeting_participants',
] as const;

export interface ExportedAccount {
  exported_at: string;
  account: { id: string; email?: string; created_at?: string };
  /** Keyed by table; each holds every row belonging to this person. */
  data: Record<string, unknown[]>;
  notes: string[];
}

export const accountService = {
  /**
   * Collects everything the app holds about the signed-in person.
   *
   * Errors on one table are recorded in `notes` rather than thrown, so a
   * single failure yields a partial export with an honest gap instead of
   * nothing at all.
   */
  async exportMyData(): Promise<ExportedAccount> {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in.');

    const data: Record<string, unknown[]> = {};
    const notes: string[] = [];

    // Every one of these keys the person by user_id; the two that do not
    // (friends, meetings) are handled separately below.
    for (const table of OWNED_TABLES) {
      const { data: rows, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        notes.push(`${table}: could not be read (${error.message})`);
        data[table] = [];
        continue;
      }

      data[table] = rows ?? [];
    }

    // Friendships name two people, so neither column alone finds them all.
    const { data: friends, error: friendsError } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id.eq.${user.id},friend_user_id.eq.${user.id}`);

    if (friendsError) notes.push(`friends: could not be read (${friendsError.message})`);
    data.friends = friends ?? [];

    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('*')
      .eq('host_id', user.id);

    if (meetingsError) notes.push(`meetings: could not be read (${meetingsError.message})`);
    data.meetings_hosted = meetings ?? [];

    notes.push(
      'Files you uploaded — your photo and anything shared in a chat — are not included here. Ask and they can be sent separately.',
      'Groups you belong to are listed through your membership rows. The groups themselves belong to everyone in them, so they are not yours to export.',
    );

    return {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email, created_at: user.created_at },
      data,
      notes,
    };
  },

  /**
   * Deletes the account and everything cascading from it. Irreversible.
   *
   * The caller's id is never sent: the function reads it from the verified
   * token, so this cannot be pointed at anybody else.
   */
  async deleteAccount(): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });

    if (error) {
      const context = (error as { context?: Response }).context;

      if (context && typeof context.json === 'function') {
        try {
          const body = await context.json();
          if (typeof body?.error === 'string') throw new Error(body.error);
        } catch (parsed) {
          if (parsed instanceof Error && parsed.message) throw parsed;
        }
      }

      throw new Error('Could not delete the account.');
    }

    if (!data?.deleted) throw new Error('Could not delete the account.');
  },
};
