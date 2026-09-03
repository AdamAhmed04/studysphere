/*
 * Deletes the caller's account and everything belonging to them.
 *
 * Needs its own function because removing an auth user requires the service
 * role, which must never reach a browser. The client can only ask; this
 * decides, and it only ever acts on whoever is calling — the id comes from
 * the verified JWT, never from the request body, so there is no account to
 * name but your own.
 *
 * The database does most of the work: every user-keyed table cascades from
 * auth.users. Storage does not, so files are removed here explicitly, and
 * before the account goes — after it, the paths are still derivable but the
 * rows naming them are gone.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Not authenticated' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;

  // Identify the caller with their own token, so the account being deleted is
  // necessarily theirs.
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await asCaller.auth.getUser();
  if (userError || !user) return json({ error: 'Not authenticated' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /*
   * Storage first.
   *
   * Avatars live under a folder named for the user, so they can be listed
   * directly. Chat attachments are filed by group, so the paths come from the
   * messages — which is why this has to happen while those rows still exist.
   */
  try {
    const { data: avatarFiles } = await admin.storage.from('avatars').list(user.id);

    if (avatarFiles?.length) {
      await admin.storage
        .from('avatars')
        .remove(avatarFiles.map(f => `${user.id}/${f.name}`));
    }
  } catch (error) {
    console.error('Avatar cleanup failed, continuing:', error);
  }

  try {
    const { data: messages } = await admin
      .from('chat_messages')
      .select('attachments')
      .eq('user_id', user.id)
      .not('attachments', 'is', null);

    const paths = (messages ?? []).flatMap(m => (m.attachments as string[] | null) ?? []);
    if (paths.length) await admin.storage.from('chat-attachments').remove(paths);
  } catch (error) {
    console.error('Attachment cleanup failed, continuing:', error);
  }

  /*
   * A failure to tidy storage must not block the deletion itself: leaving
   * somebody unable to close their account because an orphaned file would not
   * delete is the worse outcome. Anything left is logged above and is
   * unreferenced once the rows are gone.
   */
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Account deletion failed:', deleteError);
    return json({ error: 'Could not delete the account' }, 500);
  }

  return json({ deleted: true });
});
