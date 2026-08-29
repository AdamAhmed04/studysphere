export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
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

export function showNotification(title: string, options?: NotificationOptions): void {
  if (!isNotificationSupported()) {
    console.warn('Cannot show notification: Notifications are not supported');
    return;
  }

  try {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}
