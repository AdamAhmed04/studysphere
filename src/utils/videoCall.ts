/*
 * Video calls run on Jitsi's public service at meet.jit.si.
 *
 * Chosen over building WebRTC directly because roughly one connection in five
 * cannot go device-to-device without a relay server, and a relay costs money
 * every month. Jitsi needs no account, no API key and no server code — a URL
 * is the entire integration. Verified against a fresh room: it opens straight
 * to a join screen with no sign-in.
 *
 * The trade is that it is a free public service with no uptime guarantee, and
 * the media passes through their servers rather than between the two phones.
 * Worth revisiting if calls become something people rely on.
 */

const JITSI_HOST = 'https://meet.jit.si';

/*
 * The room name is the whole access control, so it has to be unguessable.
 *
 * Both ids here are UUIDs — 122 bits of randomness — so a room cannot be found
 * by trying names, and everyone opening the same chat or the same meeting
 * lands in the same place without anything having to be stored or exchanged.
 *
 * The known limit: someone who was once in the group has seen the id, and the
 * room name never changes, so they could rejoin later. Fixing that means
 * rotating room names and telling everyone the new one, which needs a place to
 * put that message — worth doing when there is a reason to remove people.
 */
export const groupCallRoom = (groupId: string) => `studysphere-group-${groupId}`;
export const meetingCallRoom = (meetingId: string) => `studysphere-meeting-${meetingId}`;

/**
 * Builds the URL to load in the call frame.
 *
 * The display name is passed so people show up as themselves rather than
 * "Fellow Jitster", and the prejoin screen is left on deliberately: it lets
 * someone check their camera and mic before anyone sees them, which matters
 * more than saving a tap.
 */
export const callUrl = (room: string, displayName?: string): string => {
  const config = ['config.prejoinPageEnabled=true'];

  if (displayName) {
    // The fragment is read as JS values, so the name has to arrive quoted.
    config.push(`userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}`);
  }

  return `${JITSI_HOST}/${encodeURIComponent(room)}#${config.join('&')}`;
};

/**
 * True when a meeting carries a link to somewhere else — Zoom, Teams, a room
 * someone pasted in. Those open in a new tab rather than in our frame, because
 * they are not ours to embed and most of them refuse to be framed anyway.
 */
export const isExternalLink = (link?: string): boolean =>
  !!link && /^https?:\/\//i.test(link.trim()) && !link.includes('meet.jit.si');
