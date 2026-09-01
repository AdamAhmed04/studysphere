import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isNotificationSupported,
  getNotificationPermission,
  showNotification,
} from './safeNotification';

/*
 * These pin the contract every caller now depends on. The point of the wrapper
 * is that it is the only thing touching the Notification API, so if it ever
 * swaps to a native plugin these tests should still describe correct behaviour.
 *
 * Vitest runs in Node, where neither `window` nor `Notification` exists — the
 * same situation as an iOS WebView. That makes the unsupported path the default
 * case rather than one that has to be contrived, and it is why the stub below
 * has to provide `window` as well: the wrapper tests support with
 * `'Notification' in window`, and reads the constructor off the global.
 */

interface Shown {
  title: string;
  options?: NotificationOptions;
  closed: boolean;
}

const stubNotification = (permission: NotificationPermission): Shown[] => {
  const shown: Shown[] = [];

  class FakeNotification {
    static permission: NotificationPermission = permission;
    static requestPermission = vi.fn();
    private record: Shown;
    constructor(title: string, options?: NotificationOptions) {
      this.record = { title, options, closed: false };
      shown.push(this.record);
    }
    close() { this.record.closed = true; }
  }

  vi.stubGlobal('Notification', FakeNotification);
  vi.stubGlobal('window', { Notification: FakeNotification });
  return shown;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('when notifications do not exist (an iOS WebView, or Node)', () => {
  it('reports unsupported', () => {
    expect(isNotificationSupported()).toBe(false);
  });

  it('reports denied rather than throwing', () => {
    // A caller asking "can I notify?" needs an answer, not an exception.
    expect(getNotificationPermission()).toBe('denied');
  });

  it('showing one is a no-op, not a crash', () => {
    expect(() => showNotification('Break time')).not.toThrow();
  });
});

describe('getNotificationPermission', () => {
  it('reports what the browser reports', () => {
    stubNotification('granted');
    expect(getNotificationPermission()).toBe('granted');
  });

  it('reports denied when denied', () => {
    stubNotification('denied');
    expect(getNotificationPermission()).toBe('denied');
  });

  it('reports default before the user has been asked', () => {
    stubNotification('default');
    expect(getNotificationPermission()).toBe('default');
  });
});

describe('showNotification', () => {
  it('shows one when permission is granted', () => {
    const shown = stubNotification('granted');
    showNotification('Break time', { body: 'Five minutes' });
    expect(shown).toHaveLength(1);
    expect(shown[0].title).toBe('Break time');
    expect(shown[0].options?.body).toBe('Five minutes');
  });

  it('stays silent when permission was not granted', () => {
    const shown = stubNotification('default');
    showNotification('Break time');
    expect(shown).toHaveLength(0);
  });

  it('stays silent when denied', () => {
    const shown = stubNotification('denied');
    showNotification('Break time');
    expect(shown).toHaveLength(0);
  });

  it('closes itself after autoCloseMs', () => {
    vi.useFakeTimers();
    const shown = stubNotification('granted');
    showNotification('Break time', { autoCloseMs: 5000 });

    expect(shown[0].closed).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(shown[0].closed).toBe(true);
  });

  it('stays open when no autoCloseMs is given', () => {
    vi.useFakeTimers();
    const shown = stubNotification('granted');
    showNotification('Break time');

    vi.advanceTimersByTime(60_000);
    expect(shown[0].closed).toBe(false);
  });

  it('does not forward autoCloseMs to the browser', () => {
    // It is our option, not part of NotificationOptions. Passing it through
    // would be harmless today and misleading later.
    const shown = stubNotification('granted');
    showNotification('Break time', { body: 'Five minutes', autoCloseMs: 5000 });

    expect(shown[0].options).toBeDefined();
    expect('autoCloseMs' in (shown[0].options as object)).toBe(false);
    expect(shown[0].options?.body).toBe('Five minutes');
  });
});
