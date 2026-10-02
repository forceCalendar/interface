/**
 * DOM-facing typings for the `<forcecal-main>` custom element.
 *
 * Hand-written companion to the declarations generated from JSDoc: it
 * describes the element as consumers see it in the DOM (typed events, typed
 * `document.createElement('forcecal-main')`) so framework adapters can wrap
 * it without re-declaring the contract. The event detail shapes mirror what
 * `ForceCalendar#setupEventListeners` forwards from the state manager bus.
 */
import type {
  CalendarEvent,
  EventsSetOptions,
  EventsSetResult,
  VisibleRange
} from '../core/StateManager.js';

/** Views the element can render. */
export type CalendarView = 'month' | 'week' | 'day';

/** Navigation actions reported by `calendar-navigate`. */
export type CalendarNavigationAction = 'next' | 'previous' | 'today' | 'goto';

/** Plain event data accepted wherever an event is passed in. */
export type CalendarEventInput = CalendarEvent | object;

/** Detail of `calendar-range-change`. */
export interface CalendarRangeChangeDetail extends VisibleRange {
  view: CalendarView;
  date: Date;
}

/** Detail of `calendar-navigate`. */
export interface CalendarNavigateDetail {
  action: CalendarNavigationAction;
  date: Date;
}

/** Detail of `calendar-view-change`. */
export interface CalendarViewChangeDetail {
  view: CalendarView;
}

/** Detail of `calendar-date-select`. */
export interface CalendarDateSelectDetail {
  date: Date;
}

/** Detail of `calendar-range-select` (drag-to-create). */
export interface CalendarRangeSelectDetail {
  start: Date;
  end: Date;
}

/** Detail of the add/update family of events. */
export interface CalendarEventDetail {
  event: CalendarEvent;
}

/** Detail of the remove/delete family of events. */
export interface CalendarEventIdDetail {
  eventId: string;
}

/**
 * Every `calendar-*` CustomEvent the element dispatches, keyed by name, with
 * its `detail` type. All bubble and are composed.
 */
export interface ForceCalendarEventMap {
  /** A navigation call (next/previous/today/goto) was applied. */
  'calendar-navigate': CustomEvent<CalendarNavigateDetail>;
  /** The view changed. */
  'calendar-view-change': CustomEvent<CalendarViewChangeDetail>;
  /** An event was added through addEvent() or the built-in form. */
  'calendar-event-add': CustomEvent<CalendarEventDetail>;
  /** Alias of `calendar-event-add`, dispatched right after it. */
  'calendar-event-added': CustomEvent<CalendarEventDetail>;
  /** An event was changed through updateEvent(). */
  'calendar-event-update': CustomEvent<CalendarEventDetail>;
  /** Alias of `calendar-event-update`, dispatched right after it. */
  'calendar-event-updated': CustomEvent<CalendarEventDetail>;
  /** An event was removed through deleteEvent(). */
  'calendar-event-remove': CustomEvent<CalendarEventIdDetail>;
  /** Alias of `calendar-event-remove`, dispatched right after it. */
  'calendar-event-deleted': CustomEvent<CalendarEventIdDetail>;
  /** A snapshot was applied through setEvents() / the events property. */
  'calendar-events-set': CustomEvent<EventsSetResult>;
  /** The visible window changed (also announced once per attach). */
  'calendar-range-change': CustomEvent<CalendarRangeChangeDetail>;
  /** A date was selected in the grid. */
  'calendar-date-select': CustomEvent<CalendarDateSelectDetail>;
  /** A time range was selected by dragging. */
  'calendar-range-select': CustomEvent<CalendarRangeSelectDetail>;
}

/** Public surface of the `<forcecal-main>` element. */
export interface ForceCalendarElement extends HTMLElement {
  /** Disable built-in user edits. Reflected boolean `readonly` attribute; host APIs remain writable. */
  readOnly: boolean;

  /** Show the editor color picker (default true); hides controls without resetting saved colors. */
  showColorPicker: boolean;

  /**
   * Complete snapshot of events; assigning reconciles with
   * `removeMissing: true`. Reading returns the events the calendar holds (or
   * the queued snapshot before the element is initialised).
   */
  events: CalendarEvent[];

  /**
   * Reconcile a complete snapshot against the calendar. Returns `null` when
   * the call is queued because the element is not initialised yet.
   */
  setEvents(
    events: Iterable<CalendarEventInput> | null | undefined,
    options?: EventsSetOptions
  ): EventsSetResult | null;

  /**
   * Window of dates the current view covers (`end` inclusive), in the
   * browser's local time zone; `null` before the element is initialised.
   */
  getVisibleRange(): VisibleRange | null;

  getEvents(): CalendarEvent[];
  addEvent(event: CalendarEventInput): CalendarEvent | null;
  updateEvent(eventId: string, updates: object): CalendarEvent | null;
  deleteEvent(eventId: string): boolean;

  setView(view: CalendarView): void;
  setDate(date: Date): void;
  next(): void;
  previous(): void;
  today(): void;

  /** Tear down the state manager; the element re-initialises on its next attach. */
  destroy(): void;

  addEventListener<K extends keyof ForceCalendarEventMap>(
    type: K,
    listener: (this: ForceCalendarElement, ev: ForceCalendarEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: ForceCalendarElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;

  removeEventListener<K extends keyof ForceCalendarEventMap>(
    type: K,
    listener: (this: ForceCalendarElement, ev: ForceCalendarEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (this: ForceCalendarElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'forcecal-main': ForceCalendarElement;
  }
}
