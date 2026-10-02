/**
 * StateManager - Centralized state management for Force Calendar
 *
 * Wraps the @forcecalendar/core Calendar instance
 * Provides reactive state updates and component synchronization
 */

import { Calendar, Event as CoreEvent } from '@forcecalendar/core';
import { EventBus } from './EventBus.js';

/**
 * @typedef {import('@forcecalendar/core').Event} CalendarEvent
 */

/**
 * @typedef {Object} EventsSetOptions
 * @property {boolean} [removeMissing=true] - Remove stored events that are absent from the snapshot
 */

/**
 * @typedef {Object} EventsSetUpdate
 * @property {CalendarEvent} event - Event now held by the calendar
 * @property {CalendarEvent} oldEvent - Event instance it replaced
 */

/**
 * @typedef {Object} EventsSetResult
 * @property {CalendarEvent[]} events - All events after the snapshot was applied
 * @property {CalendarEvent[]} added - Events that were not present before
 * @property {EventsSetUpdate[]} updated - Events whose data changed
 * @property {CalendarEvent[]} removed - Events dropped because they were missing from the snapshot
 * @property {CalendarEvent[]} unchanged - Events left untouched (same instances as before)
 */

/**
 * @typedef {Object} VisibleRange
 * @property {Date} start - First instant shown by the current view
 * @property {Date} end - Last instant shown by the current view (inclusive)
 */

/**
 * @typedef {VisibleRange & { view: string, date: Date }} VisibleRangeChange
 */

class StateManager {
  constructor(config = {}) {
    // Each StateManager gets its own EventBus to prevent cross-instance
    // contamination when multiple calendars exist on the same page.
    this.eventBus = new EventBus();

    // Initialize Core Calendar instance
    this.calendar = new Calendar({
      view: config.view || 'month',
      date: config.date || new Date(),
      weekStartsOn: config.weekStartsOn ?? 0,
      locale: config.locale || 'en-US',
      timeZone: config.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...config
    });

    // Internal state
    this.state = {
      view: this.calendar.getView(),
      currentDate: this.calendar.getCurrentDate(),
      events: [],
      selectedEvent: null,
      selectedDate: null,
      loading: false,
      error: null,
      config: { ...config }
    };

    // State change subscribers
    this.subscribers = new Set();

    // Bind methods
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.setState = this.setState.bind(this);

    // Initial sync of events from Core (in case events were pre-loaded)
    this._syncEventsFromCore({ silent: true });

    // Remember the visible window so range:changed only fires on real changes
    this._visibleRangeKey = this._rangeKey(this.getVisibleRange());
  }

  /**
   * Sync state.events from Core calendar (single source of truth)
   * This ensures state.events always matches Core's event store.
   *
   * @param {object} options
   * @param {boolean} options.silent  - suppress subscriber notifications
   * @param {boolean} options.force   - always update even when IDs match
   *                                    (required after updateEvent where IDs
   *                                    are unchanged but content has changed)
   */
  _syncEventsFromCore(options = {}) {
    const { force = false } = options;
    const coreEvents = this.calendar.getEvents() || [];
    // Skip the update when nothing changed, unless the caller forces a sync
    // (e.g. after updateEvent where IDs are the same but content differs)
    if (
      force ||
      this.state.events.length !== coreEvents.length ||
      !this._eventsMatch(this.state.events, coreEvents)
    ) {
      this.setState({ events: [...coreEvents] }, options);
    }
    return coreEvents;
  }

  /**
   * Check if two event arrays have the same events by id.
   * Only used for add/delete guards — updateEvent must pass force:true
   * to bypass this check because IDs are unchanged after an update.
   */
  _eventsMatch(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    const ids1 = new Set(arr1.map(e => e.id));
    return arr2.every(e => ids1.has(e.id));
  }

  // State management
  getState() {
    return {
      ...this.state,
      config: { ...this.state.config },
      events: [...this.state.events]
    };
  }

  setState(updates, options = {}) {
    const { silent = false } = options;
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    if (!silent) {
      this.notifySubscribers(oldState, this.state);
      this.emitStateChange(oldState, this.state);
    }

    return this.state;
  }

  subscribe(callback, subscriberId = null) {
    this.subscribers.add(callback);

    // Track subscriber ID for debugging/cleanup
    if (subscriberId) {
      if (!this._subscriberIds) {
        this._subscriberIds = new Map();
      }
      this._subscriberIds.set(subscriberId, callback);
    }

    return () => this.unsubscribe(callback, subscriberId);
  }

  unsubscribe(callback, subscriberId = null) {
    this.subscribers.delete(callback);

    // Clean up ID tracking
    if (subscriberId && this._subscriberIds) {
      this._subscriberIds.delete(subscriberId);
    }
  }

  /**
   * Unsubscribe by subscriber ID
   * @param {string} subscriberId - ID used when subscribing
   */
  unsubscribeById(subscriberId) {
    if (!this._subscriberIds) return false;

    const callback = this._subscriberIds.get(subscriberId);
    if (callback) {
      this.subscribers.delete(callback);
      this._subscriberIds.delete(subscriberId);
      return true;
    }
    return false;
  }

  /**
   * Get subscriber count (for debugging/monitoring)
   */
  getSubscriberCount() {
    return this.subscribers.size;
  }

  notifySubscribers(oldState, newState) {
    this.subscribers.forEach(callback => {
      try {
        callback(newState, oldState);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }

  emitStateChange(oldState, newState) {
    const changedKeys = Object.keys(newState).filter(key => oldState[key] !== newState[key]);

    changedKeys.forEach(key => {
      this.eventBus.emit(`state:${key}:changed`, {
        oldValue: oldState[key],
        newValue: newState[key],
        state: newState
      });
    });

    if (changedKeys.length > 0) {
      this.eventBus.emit('state:changed', { oldState, newState, changedKeys });
    }
  }

  // Calendar operations
  setView(view) {
    this.calendar.setView(view);
    this.setState({ view });
    this.eventBus.emit('view:changed', { view });
    this._syncVisibleRange();
  }

  getView() {
    return this.state.view;
  }

  setDate(date) {
    this.calendar.goToDate(date);
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    this.eventBus.emit('date:changed', { date: this.state.currentDate });
    this._syncVisibleRange();
  }

  getCurrentDate() {
    return this.state.currentDate;
  }

  // Navigation
  next() {
    this.calendar.next();
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    this.eventBus.emit('navigation:next', { date: this.state.currentDate });
    this._syncVisibleRange();
  }

  previous() {
    this.calendar.previous();
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    this.eventBus.emit('navigation:previous', { date: this.state.currentDate });
    this._syncVisibleRange();
  }

  today() {
    this.calendar.today();
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    this.eventBus.emit('navigation:today', { date: this.state.currentDate });
    this._syncVisibleRange();
  }

  goToDate(date) {
    this.calendar.goToDate(date);
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    this.eventBus.emit('navigation:goto', { date: this.state.currentDate });
    this._syncVisibleRange();
  }

  // Event management
  addEvent(event) {
    const addedEvent = this.calendar.addEvent(event);
    if (!addedEvent) {
      console.error('Failed to add event to calendar');
      this.eventBus.emit('event:error', { action: 'add', event, error: 'Failed to add event' });
      return null;
    }
    // Sync from Core to ensure consistency (single source of truth)
    this._syncEventsFromCore();
    this.eventBus.emit('event:add', { event: addedEvent });
    this.eventBus.emit('event:added', { event: addedEvent });
    return addedEvent;
  }

  updateEvent(eventId, updates) {
    // First, ensure state is in sync with Core (recover from any prior desync)
    this._syncEventsFromCore({ silent: true });

    const event = this.calendar.updateEvent(eventId, updates);
    if (!event) {
      console.error(`Failed to update event: ${eventId}`);
      this.eventBus.emit('event:error', {
        action: 'update',
        eventId,
        updates,
        error: 'Event not found in calendar'
      });
      return null;
    }

    // Force sync from Core — IDs are unchanged after an update so the
    // ID-only guard in _eventsMatch would otherwise skip the state update
    this._syncEventsFromCore({ force: true });
    this.eventBus.emit('event:update', { event });
    this.eventBus.emit('event:updated', { event });
    return event;
  }

  deleteEvent(eventId) {
    // First, ensure state is in sync with Core (recover from any prior desync)
    this._syncEventsFromCore({ silent: true });

    const deleted = this.calendar.removeEvent(eventId);
    if (!deleted) {
      console.error(`Failed to delete event: ${eventId}`);
      this.eventBus.emit('event:error', { action: 'delete', eventId, error: 'Event not found' });
      return false;
    }
    // Sync from Core to ensure consistency (single source of truth)
    this._syncEventsFromCore();
    this.eventBus.emit('event:remove', { eventId });
    this.eventBus.emit('event:deleted', { eventId });
    return true;
  }

  getEvents() {
    // Return from Core (source of truth)
    return this.calendar.getEvents() || [];
  }

  /**
   * Find a stored event by id. Occurrence ids (`<masterId>_<startMs>`, the
   * ids rendered chips of a recurring series carry) resolve to the recurring
   * master, so the result is always something `updateEvent`/`deleteEvent`
   * can act on.
   *
   * Resolves through core when it can (`Calendar#getEvent` applies the same
   * occurrence resolution) and falls back to the state's events otherwise.
   *
   * @param {string} eventId - Event or occurrence id
   * @returns {CalendarEvent|null} The event (master for an occurrence) or null
   */
  findEvent(eventId) {
    if (!this.calendar || eventId === undefined || eventId === null) return null;
    if (typeof this.calendar.getEvent === 'function') {
      const found = this.calendar.getEvent(eventId);
      if (found) return found;
    }
    const events = (this.state && this.state.events) || [];
    const direct = events.find(event => event.id === eventId);
    if (direct) return direct;
    const parsed =
      typeof CoreEvent.parseOccurrenceId === 'function'
        ? CoreEvent.parseOccurrenceId(eventId)
        : null;
    if (!parsed) return null;
    const master = events.find(event => event.id === parsed.recurringEventId);
    return master && master.recurring ? master : null;
  }

  /**
   * Resolve the instance an id refers to: the stored event plus the start and
   * end of that particular instance. For an occurrence id these are the
   * occurrence's own times (its start from the id, the master's duration);
   * for a regular id they are the event's own.
   *
   * @param {string} eventId - Event or occurrence id
   * @returns {{ event: CalendarEvent, start: Date, end: Date }|null}
   */
  resolveEventInstance(eventId) {
    const event = this.findEvent(eventId);
    if (!event) return null;
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (event.id === eventId) return { event, start, end };
    const parsed = CoreEvent.parseOccurrenceId(eventId);
    if (!parsed || isNaN(parsed.occurrenceStart.getTime())) return { event, start, end };
    const occurrenceStart = new Date(parsed.occurrenceStart);
    return {
      event,
      start: occurrenceStart,
      end: new Date(occurrenceStart.getTime() + (end.getTime() - start.getTime()))
    };
  }

  /**
   * Replace the calendar's events with a complete snapshot, applying only the
   * differences.
   *
   * Unchanged events keep their existing instance, changed ones are replaced,
   * new ones are added and events missing from the snapshot are removed
   * (unless `removeMissing` is false). The state is updated at most once and a
   * single `events:set` bus event carries the change set. The per-event
   * `event:add`/`event:added`/`event:remove`/`event:deleted` events are NOT
   * emitted, so listeners that persist user edits are not triggered by a
   * snapshot load.
   *
   * Occurrences of a recurring series (as handed out by view data, range
   * queries and click events) are mapped back to the stored master they
   * belong to, so echoing displayed events through a snapshot never replaces
   * a series with a single instance.
   *
   * Uses `Calendar#reconcileEvents` when the installed core provides it
   * (2.4.0+) and falls back to an id-based diff on older cores.
   *
   * @param {Iterable<object|CalendarEvent>|null|undefined} events - Complete snapshot of events (`null`/`undefined` clears)
   * @param {EventsSetOptions} [options={}]
   * @returns {EventsSetResult} The applied change set
   * @throws {TypeError} If `events` is not iterable or an entry is not an object
   * @throws {Error} If an entry fails validation, two entries share an id or an occurrence has no stored master (an `event:error` bus event is emitted first)
   */
  setEvents(events, options = {}) {
    const { removeMissing = true } = options;
    let snapshot = [];

    let result;
    try {
      snapshot = this._resolveOccurrences(StateManager.toSnapshot(events));
      result =
        typeof this.calendar.reconcileEvents === 'function'
          ? this.calendar.setEvents(snapshot, { reconcile: true, removeMissing })
          : this._reconcileFallback(snapshot, removeMissing);
    } catch (error) {
      // Nothing has been applied (core rolls the batch back and the fallback
      // resyncs before rethrowing), so surface the problem to the caller
      // instead of leaving the snapshot half-loaded
      if (this.eventBus) {
        this.eventBus.emit('event:error', { action: 'set', events: snapshot, error });
      }
      throw error;
    }

    const { added, updated, removed, unchanged } = result;
    /** @type {EventsSetResult} */
    const payload = { events: this.getEvents(), added, updated, removed, unchanged };

    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      this.setState({ events: [...payload.events] });
    }
    this.eventBus.emit('events:set', payload);
    return payload;
  }

  /**
   * Turn the `events` argument of {@link StateManager#setEvents} into an array
   * of entries, rejecting values that would otherwise be applied as an empty
   * or malformed snapshot.
   *
   * @param {Iterable<object|CalendarEvent>|null|undefined} events
   * @returns {Array<object|CalendarEvent>}
   * @throws {TypeError} If `events` is not iterable or an entry is not an object
   */
  static toSnapshot(events) {
    if (events === undefined || events === null) return [];
    if (typeof events !== 'object' || typeof events[Symbol.iterator] !== 'function') {
      throw new TypeError('setEvents() expects an iterable of event objects');
    }
    const snapshot = Array.from(events);
    snapshot.forEach((entry, index) => {
      if (entry === null || typeof entry !== 'object') {
        throw new TypeError(`Snapshot entry at index ${index} is not an event object`);
      }
    });
    return snapshot;
  }

  /**
   * Replace occurrence entries with the stored recurring master they belong
   * to. Duplicated masters collapse to one entry and an explicit master entry
   * always wins over the stored instance implied by its occurrences, so the
   * snapshot can still update the series.
   *
   * @param {Array<object|CalendarEvent>} snapshot
   * @returns {Array<object|CalendarEvent>}
   * @throws {Error} If an occurrence refers to a series the calendar does not hold
   * @private
   */
  _resolveOccurrences(snapshot) {
    const stored = new Map(this.getEvents().map(event => [event.id, event]));
    const resolved = [];
    const explicitIds = new Set();
    // master id -> index in `resolved` of the entry implied by an occurrence
    const impliedIndex = new Map();

    snapshot.forEach(entry => {
      const masterId = this._occurrenceMasterId(entry, stored);
      if (masterId === null) {
        const id = entry.id;
        if (impliedIndex.has(id)) {
          resolved[impliedIndex.get(id)] = entry;
          impliedIndex.delete(id);
        } else {
          resolved.push(entry);
        }
        explicitIds.add(id);
        return;
      }
      if (explicitIds.has(masterId) || impliedIndex.has(masterId)) return;
      const master = stored.get(masterId);
      if (!master) {
        throw new Error(
          `Snapshot entry "${entry.id}" is an occurrence of recurring event "${masterId}", ` +
            'which the calendar does not hold; pass the master event instead'
        );
      }
      impliedIndex.set(masterId, resolved.length);
      resolved.push(master);
    });

    return resolved;
  }

  /**
   * Work out whether a snapshot entry is an occurrence of a recurring series
   * and, if so, which master id it belongs to.
   *
   * Occurrences are recognised by the `isOccurrence` flag core sets on expanded
   * instances, by the `metadata.occurrenceId` marker that survives
   * `toObject()`/JSON round trips, or by an `<masterId>_<startMs>` id whose
   * master is a stored recurring event (the same resolution core applies in
   * `getEvent`).
   *
   * @param {object|CalendarEvent} entry
   * @param {Map<string, CalendarEvent>} stored
   * @returns {string|null} The master id, or null for a regular entry
   * @private
   */
  _occurrenceMasterId(entry, stored) {
    const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : null;
    const flagged =
      entry.isOccurrence === true ||
      (metadata !== null &&
        metadata.occurrenceId !== undefined &&
        metadata.occurrenceId === entry.id);
    const declared =
      entry.recurringEventId || (metadata !== null ? metadata.recurringEventId : undefined);
    if (declared !== undefined && declared !== null && declared !== '' && flagged) {
      return String(declared);
    }

    const parsed =
      typeof CoreEvent.parseOccurrenceId === 'function'
        ? CoreEvent.parseOccurrenceId(entry.id)
        : null;
    if (!parsed) return null;
    if (flagged) return parsed.recurringEventId;
    const master = stored.get(parsed.recurringEventId);
    return master && master.recurring ? parsed.recurringEventId : null;
  }

  /**
   * Id-based diff for cores that predate `Calendar#reconcileEvents`.
   * Works on the core calendar directly so no per-event bus events fire
   * (core-level `eventAdd`/`eventUpdate` listeners still see each change).
   * Every entry is validated before the store is touched; should a mutation
   * still fail part-way, the state is resynced from core before rethrowing so
   * the two never disagree.
   * Equivalence is approximated by comparing the fields present in the
   * snapshot entry, so an entry that only omits fields is treated as unchanged.
   *
   * @param {Array<object|CalendarEvent>} snapshot
   * @param {boolean} removeMissing
   * @returns {{ added: CalendarEvent[], updated: EventsSetUpdate[], removed: CalendarEvent[], unchanged: CalendarEvent[] }}
   * @private
   */
  _reconcileFallback(snapshot, removeMissing) {
    const incoming = new Map();
    snapshot.forEach(entry => {
      const id = entry.id;
      if (id === undefined || id === null || id === '') {
        throw new Error('Every event in a snapshot must have an id');
      }
      if (incoming.has(id)) {
        throw new Error(`Duplicate event id in snapshot: ${id}`);
      }
      // Validate up front: the core constructor throws on malformed data, so
      // nothing below can fail on input the caller can fix
      if (!(entry instanceof CoreEvent)) {
        new CoreEvent(typeof entry.toObject === 'function' ? entry.toObject() : entry);
      }
      incoming.set(id, entry);
    });

    const result = { added: [], updated: [], removed: [], unchanged: [] };
    const existingById = new Map(this.getEvents().map(event => [event.id, event]));

    try {
      if (removeMissing) {
        existingById.forEach((existing, id) => {
          if (!incoming.has(id) && this.calendar.removeEvent(id)) {
            result.removed.push(existing);
          }
        });
      }

      incoming.forEach((entry, id) => {
        const existing = existingById.get(id);
        const data = typeof entry.toObject === 'function' ? entry.toObject() : entry;
        if (!existing) {
          const event = this.calendar.addEvent(entry);
          if (!event) throw new Error(`Failed to add event: ${id}`);
          result.added.push(event);
        } else if (existing === entry || this._isEquivalentFallback(existing, data)) {
          result.unchanged.push(existing);
        } else {
          const event = this.calendar.updateEvent(id, data);
          if (!event) throw new Error(`Failed to update event: ${id}`);
          result.updated.push({ event, oldEvent: existing });
        }
      });
    } catch (error) {
      // The fallback is not transactional: keep state.events truthful about
      // whatever core now holds before handing the error back
      this._syncEventsFromCore({ force: true });
      throw error;
    }

    return result;
  }

  /**
   * Field-wise comparison of a stored event against snapshot data.
   * @param {CalendarEvent} existing
   * @param {object} data
   * @returns {boolean}
   * @private
   */
  _isEquivalentFallback(existing, data) {
    const toTime = value => {
      if (value instanceof Date) return value.getTime();
      if (value === undefined || value === null) return NaN;
      return new Date(value).getTime();
    };
    return Object.keys(data).every(key => {
      const stored = existing[key];
      const incoming = data[key];
      if (key === 'start' || key === 'end') return toTime(stored) === toTime(incoming);
      if (stored === incoming) return true;
      if (stored === undefined || stored === null || incoming === undefined || incoming === null) {
        return false;
      }
      return JSON.stringify(stored) === JSON.stringify(incoming);
    });
  }

  /**
   * Force sync state.events from Core calendar
   * Use this if you've modified events directly on the Core calendar
   */
  syncEvents() {
    return this._syncEventsFromCore();
  }

  getEventsForDate(date) {
    return this.calendar.getEventsForDate(date);
  }

  getEventsInRange(start, end) {
    return this.calendar.getEventsInRange(start, end);
  }

  // View data
  getViewData() {
    const viewData = this.calendar.getViewData();
    return this.enrichViewData(viewData);
  }

  enrichViewData(viewData) {
    // Shallow-copy the top-level object so we never mutate what Core returned.
    // Core may cache and reuse the same reference across calls; mutating it
    // in-place would corrupt its internal state.
    const enriched = { ...viewData };
    const selectedDateString = this.state.selectedDate?.toDateString();

    // Strategy 1: Multi-week structure (Month view)
    if (enriched.weeks) {
      enriched.weeks = enriched.weeks.map(week => ({
        ...week,
        days: week.days.map(day => {
          const dayDate = new Date(day.date);
          return {
            ...day,
            isSelected: dayDate.toDateString() === selectedDateString,
            events: day.events || this.getEventsForDate(dayDate)
          };
        })
      }));
    }

    // Strategy 2: Flat days structure (Week view or list view)
    if (enriched.days) {
      enriched.days = enriched.days.map(day => {
        const dayDate = new Date(day.date);
        return {
          ...day,
          isSelected: dayDate.toDateString() === selectedDateString,
          events: day.events || this.getEventsForDate(dayDate)
        };
      });
    }

    // Strategy 3: Single day structure (Day view)
    if (enriched.date && !enriched.days && !enriched.weeks) {
      const dayDate = new Date(enriched.date);
      enriched.isSelected = dayDate.toDateString() === selectedDateString;
      enriched.events = enriched.events || this.getEventsForDate(dayDate);
    }

    return enriched;
  }

  // Visible range

  /**
   * Get the window of dates the current view covers, including leading and
   * trailing days from adjacent months in the month view.
   *
   * `end` is the last millisecond of the window (inclusive), so the pair can
   * be passed straight to {@link StateManager#getEventsInRange}.
   *
   * The window is computed from the current date, view and week start alone
   * (no event expansion), with the same calendar arithmetic core uses for its
   * view data, and is expressed in the browser's local time zone regardless of
   * the calendar's `timeZone` setting.
   *
   * @returns {VisibleRange}
   */
  getVisibleRange() {
    const view = this.calendar.getView();
    const date = this.calendar.getCurrentDate();
    const weekStartsOn = this._configValue('weekStartsOn', 0);

    switch (view) {
      case 'month': {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const start = StateManager._startOfWeek(firstDay, weekStartsOn);
        const weeks = this._configValue('fixedWeekCount', false)
          ? 6
          : Math.ceil((lastDay.getDate() + ((firstDay.getDay() - weekStartsOn + 7) % 7)) / 7);
        return { start, end: StateManager._lastMoment(start, weeks * 7) };
      }
      case 'week': {
        const start = StateManager._startOfWeek(date, weekStartsOn);
        return { start, end: StateManager._lastMoment(start, 7) };
      }
      case 'list': {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        return { start, end: StateManager._lastMoment(start, 30) };
      }
      default: {
        // Day view (or a view without an explicit window): midnight to midnight
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        return { start, end: StateManager._lastMoment(start, 1) };
      }
    }
  }

  /**
   * Read a calendar configuration value from core state, falling back to the
   * constructor config and then to a default on cores that do not track it.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   * @private
   */
  _configValue(key, fallback) {
    const coreState = this.calendar.state;
    if (coreState && typeof coreState.get === 'function') {
      const value = coreState.get(key);
      if (value !== undefined) return value;
    }
    const configured = this.state && this.state.config ? this.state.config[key] : undefined;
    return configured !== undefined ? configured : fallback;
  }

  /**
   * Local midnight of the first day of the week containing `date`.
   * Day arithmetic goes through `setDate` so DST transitions do not shift it.
   * @param {Date} date
   * @param {number} weekStartsOn
   * @returns {Date}
   * @private
   */
  static _startOfWeek(date, weekStartsOn) {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() - ((day < weekStartsOn ? 7 : 0) + day - weekStartsOn));
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Last millisecond of a window of `days` whole days opening at `start`.
   * @param {Date} start - Local midnight
   * @param {number} days
   * @returns {Date}
   * @private
   */
  static _lastMoment(start, days) {
    const next = new Date(start);
    next.setDate(next.getDate() + days);
    return new Date(next.getTime() - 1);
  }

  /**
   * @param {VisibleRange} range
   * @returns {string}
   * @private
   */
  _rangeKey(range) {
    return `${range.start.getTime()}:${range.end.getTime()}`;
  }

  /**
   * Single choke point for `range:changed`: recompute the visible window and
   * emit only when it differs from the last one that was announced.
   * Called after view, date and week-start changes, once their own bus events
   * have been emitted, so listeners see navigation before the range update.
   * @private
   */
  _syncVisibleRange() {
    if (!this.calendar) return;
    const range = this.getVisibleRange();
    const key = this._rangeKey(range);
    if (key === this._visibleRangeKey) return;
    this._visibleRangeKey = key;
    /** @type {VisibleRangeChange} */
    const payload = { ...range, view: this.state.view, date: this.state.currentDate };
    this.eventBus.emit('range:changed', payload);
  }

  // Selection management
  selectEvent(event) {
    this.setState({ selectedEvent: event });
    this.eventBus.emit('event:selected', { event });
  }

  selectEventById(eventId) {
    const event = this.findEvent(eventId);
    if (event) {
      this.selectEvent(event);
    }
  }

  deselectEvent() {
    this.setState({ selectedEvent: null });
    this.eventBus.emit('event:deselected', {});
  }

  selectDate(date) {
    this.setState({ selectedDate: date });
    this.eventBus.emit('date:selected', { date });
  }

  deselectDate() {
    this.setState({ selectedDate: null });
    this.eventBus.emit('date:deselected', {});
  }

  // Utility methods
  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isSelectedDate(date) {
    return (
      this.state.selectedDate && date.toDateString() === this.state.selectedDate.toDateString()
    );
  }

  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  // Loading state
  setLoading(loading) {
    this.setState({ loading });
  }

  // Error handling
  setError(error) {
    this.setState({ error });
    if (error) {
      this.eventBus.emit('error', { error });
    }
  }

  clearError() {
    this.setState({ error: null });
  }

  // Configuration
  updateConfig(config) {
    this.setState({ config: { ...this.state.config, ...config } });

    // Update calendar configuration if needed
    if (config.weekStartsOn !== undefined) {
      this.calendar.setWeekStartsOn(config.weekStartsOn);
      this._syncVisibleRange();
    }
    if (config.locale !== undefined) {
      this.calendar.setLocale(config.locale);
    }
    if (config.timeZone !== undefined) {
      this.calendar.setTimezone(config.timeZone);
    }
  }

  // Destroy
  destroy() {
    // This manager owns the Calendar and its background maintenance timers.
    // Release it before dropping the reference, including on repeated teardown.
    if (this.calendar) {
      this.calendar.destroy();
    }
    this.subscribers.clear();
    if (this._subscriberIds) {
      this._subscriberIds.clear();
      this._subscriberIds = null;
    }
    if (this.eventBus) {
      this.eventBus.clear();
      this.eventBus = null;
    }
    this.state = null;
    this.calendar = null;
  }
}

// Export StateManager
export default StateManager;
