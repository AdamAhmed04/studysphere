/*
 * Profile photos are chosen during signup, but signUp() returns no session when
 * email confirmation is on, and both the storage policies and the profile
 * UPDATE policy key off auth.uid(). So at the moment the photo is picked there
 * is nobody to upload it as.
 *
 * The photo is therefore downscaled and parked in localStorage, then uploaded
 * on the first load that does have a session - normally the redirect back from
 * the confirmation email. Downscaling is what makes parking it viable: the
 * signup form accepts 5MB, which is ~6.7MB once base64-encoded and past the
 * ~5MB localStorage quota, while 512px of JPEG lands comfortably under 200KB.
 */

const PENDING_KEY_PREFIX = 'studysphere.pendingAvatar.';

export const AVATAR_MAX_PX = 512;
const AVATAR_QUALITY = 0.85;

const pendingKey = (userId: string) => `${PENDING_KEY_PREFIX}${userId}`;

/**
 * Centre-crops to a square and scales down, returning a JPEG data URL.
 *
 * Square because every avatar is displayed in a circular frame; cropping here
 * rather than with `object-cover` means the stored bytes match what is shown.
 */
export async function downscaleImage(
  file: Blob,
  maxPx: number = AVATAR_MAX_PX,
  quality: number = AVATAR_QUALITY,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('That file could not be read as an image'));
      element.src = objectUrl;
    });

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (side === 0) throw new Error('That file could not be read as an image');

    const size = Math.min(side, maxPx);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('That image could not be processed');

    // JPEG has no alpha channel, so anything transparent would otherwise come
    // out black. Paint the ground first.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);

    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Turns the data URL back into bytes the storage client will accept. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(',');
  if (!encoded) throw new Error('That image could not be processed');

  const mimeType = /:(.*?);/.exec(header)?.[1] ?? 'image/jpeg';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

export function stashPendingAvatar(userId: string, dataUrl: string): void {
  try {
    localStorage.setItem(pendingKey(userId), dataUrl);
  } catch (error) {
    // Quota exceeded, or private browsing. Losing the photo must not lose the
    // signup, so this is reported and nothing else.
    console.warn('Could not hold the profile photo until first sign-in:', error);
  }
}

export function readPendingAvatar(userId: string): string | null {
  try {
    return localStorage.getItem(pendingKey(userId));
  } catch {
    return null;
  }
}

export function clearPendingAvatar(userId: string): void {
  try {
    localStorage.removeItem(pendingKey(userId));
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
