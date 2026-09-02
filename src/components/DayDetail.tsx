import React, { useEffect } from 'react';
import { X, Plus, Clock } from 'lucide-react';
import { AuroraGround } from './AuroraGround';
import { eventTypeLabels } from '../utils/calendarUtils';
import type { AgendaItem } from './Calendar';

interface DayDetailProps {
  date: Date;
  items: AgendaItem[];
  onClose: () => void;
  onSelectItem: (item: AgendaItem) => void;
  onAddEvent: () => void;
}

const formatTime = (date: Date) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/*
 * What is on a given day.
 *
 * A cell 48px wide cannot say much — a phone gets coloured dots and a laptop
 * two truncated chips — so the grid deliberately shows less than it knows.
 * This is where the rest lives, which is also why the "+2 more" line could be
 * dropped rather than made to fit: tapping the day is the answer to "what
 * else is on".
 *
 * Tapping a day used to open the new-event form directly, which assumed the
 * only reason to touch a date was to add something to it. Looking comes
 * first; adding is a button here.
 */
export const DayDetail: React.FC<DayDetailProps> = ({
  date,
  items,
  onClose,
  onSelectItem,
  onAddEvent,
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isToday = date.toDateString() === new Date().toDateString();

  // Chronological, so the day reads top to bottom the way it will happen.
  const ordered = [...items].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full sm:h-auto sm:max-h-[80vh] sm:max-w-md sm:rounded-lg overflow-hidden sm:border sm:border-hairline shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-detail-title"
      >
        <AuroraGround />

        <div className="safe-inset flex-1 flex flex-col min-h-0">
          <div className="flex items-start justify-between gap-4 mb-7">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted mb-1">
                {date.toLocaleDateString(undefined, { weekday: 'long' })}
                {isToday && <span className="text-sand"> · Today</span>}
              </p>
              <h4
                id="day-detail-title"
                className="text-2xl font-display font-light text-ink"
              >
                {date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
              </h4>
            </div>

            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-1 rounded-full text-muted hover:text-ink transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {ordered.length === 0 ? (
              <p className="text-sm text-muted py-8 text-center">
                Nothing scheduled.
              </p>
            ) : (
              <ul className="space-y-2">
                {ordered.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelectItem(item)}
                      className="w-full flex items-start gap-3 p-3 rounded-md bg-surface border border-hairline-soft hover:border-sand/40 transition-colors text-left"
                    >
                      {/* The colour is the only thing carrying the event type
                          at a glance, so it gets a full-height bar rather than
                          a dot that a long title would dwarf. */}
                      <span
                        className="w-1 self-stretch rounded-pill flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />

                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-ink truncate">
                          {item.title}
                        </span>
                        <span className="flex items-center gap-1.5 mt-1 text-xs text-muted">
                          <Clock size={12} className="flex-shrink-0" />
                          {formatTime(item.date)}
                          <span aria-hidden="true">·</span>
                          {eventTypeLabels[item.type] ?? item.type}
                        </span>
                        {item.description && (
                          <span className="block mt-1 text-xs text-ink/75 line-clamp-2">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={onAddEvent}
            className="mt-7 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-pill bg-pearl text-on-pearl text-sm font-medium min-h-[48px]"
          >
            <Plus size={18} />
            Add an event
          </button>
        </div>
      </div>
    </div>
  );
};
