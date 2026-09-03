/*
 * Creates (or reuses) a Daily room for a group chat or a scheduled meeting,
 * and issues the caller a token to enter it.
 *
 * This exists because the Daily API key must never reach the browser: anyone
 * holding it could create rooms, read recordings and run up the account's
 * usage. It lives in this function's environment and nowhere else.
 *
 * The other reason is authorisation. Room names are derived from group and
 * meeting ids, so knowing an id would otherwise be enough to join a call.
 * Every request is checked against the caller's own JWT — through the same
 * is_group_member and can_see_meeting helpers the rest of the app uses — so
 * membership is decided by the database, not by the client asking nicely.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DAILY_API = 'https://api.daily.co/v1';

/** Long enough for a study session, short enough that a leaked token dies. */
const TOKEN_TTL_SECONDS = 4 * 60 * 60;

/** Rooms are disposable: Daily deletes them once nobody has used them. */
const ROOM_TTL_SECONDS = 12 * 60 * 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const dailyKey = Deno.env.get('DAILY_API_KEY');
  if (!dailyKey) {
    // Said plainly, because the fix is a setting rather than a bug.
    return json({ error: 'Video calling is not configured yet.' }, 503);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Not authenticated' }, 401);

  /*
   * The caller's own token, not the service role. Every query below therefore
   * runs as them, under the same RLS as the rest of the app — this function
   * cannot see or grant more than the person calling it already could.
   */
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: 'Not authenticated' }, 401);

  let payload: { kind?: string; id?: string; displayName?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Malformed request' }, 400);
  }

  const { kind, id, displayName } = payload;

  const isUuid = typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!isUuid || (kind !== 'group' && kind !== 'meeting')) {
    return json({ error: 'Malformed request' }, 400);
  }

  // The authorisation decision, made by the database.
  const { data: allowed, error: checkError } = kind === 'group'
    ? await supabase.rpc('is_group_member', { gid: id })
    : await supabase.rpc('can_see_meeting', { mid: id });

  if (checkError) {
    console.error('Membership check failed:', checkError);
    return json({ error: 'Could not verify access' }, 500);
  }

  if (allowed !== true) return json({ error: 'Not a member of this call' }, 403);

  const roomName = `studysphere-${kind}-${id}`;

  const daily = (path: string, body: unknown) =>
    fetch(`${DAILY_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dailyKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

  /*
   * Private, so a room URL on its own opens nothing — entry needs the token
   * issued below, which is only issued after the check above passes.
   */
  const roomResponse = await daily('/rooms', {
    name: roomName,
    privacy: 'private',
    properties: {
      exp: Math.floor(Date.now() / 1000) + ROOM_TTL_SECONDS,
      eject_at_room_exp: true,
      enable_prejoin_ui: true,
      enable_screenshare: true,
      start_video_off: false,
      start_audio_off: false,
    },
  });

  /*
   * 400 here is the ordinary case, not a failure: the second person to press
   * the button finds the room already made. Anything else is real.
   */
  if (!roomResponse.ok && roomResponse.status !== 400) {
    const detail = await roomResponse.text();
    console.error('Daily room creation failed:', roomResponse.status, detail);
    return json({ error: 'Could not start the call' }, 502);
  }

  const tokenResponse = await daily('/meeting-tokens', {
    properties: {
      room_name: roomName,
      user_name: typeof displayName === 'string' ? displayName.slice(0, 60) : undefined,
      user_id: user.id,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      // Nobody is an owner: there is no moderator step to get stuck behind,
      // which is the thing that made the previous provider unusable.
      is_owner: false,
    },
  });

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text();
    console.error('Daily token creation failed:', tokenResponse.status, detail);
    return json({ error: 'Could not start the call' }, 502);
  }

  const { token } = await tokenResponse.json();
  const domain = Deno.env.get('DAILY_DOMAIN');

  if (!domain) {
    return json({ error: 'Video calling is not configured yet.' }, 503);
  }

  return json({ url: `https://${domain}/${roomName}?t=${token}` });
});
