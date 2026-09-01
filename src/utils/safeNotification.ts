/*
 * The one place that knows how a notification gets shown.
 *
 * This wrapper existed but only Settings used it. useTimer had a second copy of
 * showNotification, and Timer, Settings and notificationService all read
 * `Notification.permission` straight off the global — because the wrapper never
 * offered a way to ask. That gap is why it was bypassed, so it is filled here.
 *
 * Keeping every caller behind this matters beyond tidiness. The browser
 * Notification API does not exist inside an iOS WebView, so if StudySphere is
 * ever wrapped with Capacitor these reminders would silently never appear.
 * Swapping to a native plugin then means changing this file, not hunting
 * through four others.
 *
 * That is also why `showNotification` returns nothing and handles auto-close
 * itself: a caller holding a live Notification object could not be ported.
 */

/** Options we accept, plus one of our own. */
export interface AppNotificationOptions extends NotificationOptions {
  /** Close the notification automatically after this many milliseconds. */
  autoCloseMs?: number;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * The current permission, without touching the global.
 *
 * Reports 'denied' where notifications do not exist at all, which is the
 * honest answer for a caller deciding whether to bother: it cannot notify.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Notifications are not supported in this environment');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export function showNotification(title: string, options?: AppNotificationOptions): void {
  if (!isNotificationSupported()) {
    console.warn('Cannot show notification: Notifications are not supported');
    return;
  }

  try {
    if (Notification.permission !== 'granted') return;

    const { autoCloseMs, ...nativeOptions } = options ?? {};
    const notification = new Notification(title, nativeOptions);

    if (autoCloseMs && autoCloseMs > 0) {
      setTimeout(() => notification.close(), autoCloseMs);
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}
