import { supabase } from '../lib/supabase';

/*
 * Video calls run on Daily.
 *
 * The first attempt used Jitsi's public service, which looked right until a
 * call was actually joined: meet.jit.si requires the first participant to log
 * in as moderator, and on iOS it interposes an app-download screen. Neither is
 * configurable from our side. The lesson recorded here so it is not repeated:
 * a prejoin screen rendering is not evidence that joining works.
 *
 * Rooms are private and entry needs a token, which is issued by the
 * create-call-room function only after the database confirms the caller is in
 * the group or on the meeting. The API key that mints those tokens never
 * reaches the browser.
 */

/*
 * Off until there is a payment method on the Daily account.
 *
 * Daily refuses to run a room without one, even inside the free allowance, so
 * with this on and no card the camera button opens a Daily page reading
 * "Missing payment method" — a dead end that looks like the app is broken
 * rather than a feature that is not switched on yet.
 *
 * Everything behind this flag is built and verified: the edge function
 * authenticates the caller, checks group membership against the database,
 * creates the room and mints a token. Turning it on is two steps, both
 * outside the code — add a card at dashboard.daily.co, then set
 * VITE_VIDEO_CALLS_ENABLED=true in Vercel and redeploy.
 *
 * Deliberately build-time rather than a runtime probe: there is nothing to
 * probe. The secrets are already set, so the function answers 200 and the
 * refusal only appears afterwards, inside Daily's own page.
 */
const VIDEO_CALLS_ENABLED = import.meta.env.VITE_VIDEO_CALLS_ENABLED === 'true';

export interface CallRoom {
  /** Includes the entry token, so it is short-lived and per person. */
  url: string;
}

/**
 * Asks the server for a room and a way into it.
 *
 * Returns a message rather than throwing for the two cases a person can act
 * on — calling not set up yet, and not being in the group — because both want
 * showing rather than logging.
 */
export const requestCallRoom = async (
  kind: 'group' | 'meeting',
  id: string,
  displayName?: string,
): Promise<{ room?: CallRoom; error?: string }> => {
  if (!VIDEO_CALLS_ENABLED) {
    return { error: "Video calling isn't switched on yet." };
  }

  if (!supabase) return { error: 'Video calling is not available right now.' };

  const { data, error } = await supabase.functions.invoke('create-call-room', {
    body: { kind, id, displayName },
  });

  if (error) {
    console.error('Could not start the call:', error);

    /*
     * invoke() reports any non-2xx as a generic FunctionsHttpError, so the
     * body has to be read for the reason. Without this every failure reads
     * "could not start", including the one that just needs a key setting.
     */
    const context = (error as { context?: Response }).context;

    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (typeof body?.error === 'string') return { error: body.error };
      } catch {
        // Body was not JSON; the generic message below is the honest answer.
      }
    }

    return { error: 'Could not start the call.' };
  }

  if (!data?.url) return { error: 'Could not start the call.' };

  return { room: { url: data.url as string } };
};

/**
 * True when a meeting carries a link to somewhere else — Zoom, Teams, a room
 * someone pasted in. Those open in a new tab rather than in our frame, because
 * they are not ours to embed and most refuse to be framed anyway.
 */
export const isExternalLink = (link?: string): boolean =>
  !!link && /^https?:\/\//i.test(link.trim()) && !/\.daily\.co\//i.test(link);
