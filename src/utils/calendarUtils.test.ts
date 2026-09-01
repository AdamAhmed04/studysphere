import { describe, it, expect } from 'vitest';
import { eventTypeColors, eventTypeLabels, getEventTypeColor } from './calendarUtils';

/*
 * Only the three exports that are actually used. The other six in this module
 * have no callers; testing them would give coverage without giving confidence.
 */
describe('event type colours and labels', () => {
  it('has a colour and a label for every type the database allows', () => {
    // The CHECK constraint on calendar_events.event_type is the source of truth.
    const allowed = ['meeting', 'reminder', 'study', 'exam', 'class', 'todo'];
    allowed.forEach(type => {
      expect(eventTypeColors[type as keyof typeof eventTypeColors]).toBeTruthy();
      expect(eventTypeLabels[type as keyof typeof eventTypeLabels]).toBeTruthy();
    });
  });

  it('uses hex colours, which is what the inline style expects', () => {
    Object.values(eventTypeColors).forEach(colour => {
      expect(colour).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('getEventTypeColor', () => {
  it('returns the colour for a known type', () => {
    expect(getEventTypeColor('study')).toBe(eventTypeColors.study);
  });

  it('returns something usable for an unknown type', () => {
    // Reached if a future migration adds a type before the client knows it.
    expect(getEventTypeColor('brand-new-type' as never)).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
