/**
 * StateManager - Centralized state management for Force Calendar
 *
 * Wraps the @forcecalendar/core Calendar instance
 * Provides reactive state updates and component synchronization
 */

import { Calendar } from '@forcecalendar/core';
import eventBus from './EventBus.js';

class StateManager {
  constructor(config = {}) {
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
      eventBus.emit(`state:${key}:changed`, {
        oldValue: oldState[key],
        newValue: newState[key],
        state: newState
      });
    });

    if (changedKeys.length > 0) {
      eventBus.emit('state:changed', { oldState, newState, changedKeys });
    }
  }

  // Calendar operations
  setView(view) {
    this.calendar.setView(view);
    this.setState({ view });
    eventBus.emit('view:changed', { view });
  }

  getView() {
    return this.state.view;
  }

  setDate(date) {
    this.calendar.goToDate(date);
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    eventBus.emit('date:changed', { date: this.state.currentDate });
  }

  getCurrentDate() {
    return this.state.currentDate;
  }

  // Navigation
  next() {
    this.calendar.next();
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    eventBus.emit('navigation:next', { date: this.state.currentDate });
  }

  previous() {
    this.calendar.previous();
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    eventBus.emit('navigation:previous', { date: this.state.currentDate });
  }

  today() {
    this.calendar.today();
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    eventBus.emit('navigation:today', { date: this.state.currentDate });
  }

  goToDate(date) {
    this.calendar.goToDate(date);
    this.setState({ currentDate: this.calendar.getCurrentDate() });
    eventBus.emit('navigation:goto', { date: this.state.currentDate });
  }

  // Event management
  addEvent(event) {
    const addedEvent = this.calendar.addEvent(event);
    if (!addedEvent) {
      console.error('Failed to add event to calendar');
      eventBus.emit('event:error', { action: 'add', event, error: 'Failed to add event' });
      return null;
    }
    // Sync from Core to ensure consistency (single source of truth)
    this._syncEventsFromCore();
    eventBus.emit('event:add', { event: addedEvent });
    eventBus.emit('event:added', { event: addedEvent });
    return addedEvent;
  }

  updateEvent(eventId, updates) {
    // First, ensure state is in sync with Core (recover from any prior desync)
    this._syncEventsFromCore({ silent: true });

    const event = this.calendar.updateEvent(eventId, updates);
    if (!event) {
      console.error(`Failed to update event: ${eventId}`);
      eventBus.emit('event:error', {
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
    eventBus.emit('event:update', { event });
    eventBus.emit('event:updated', { event });
    return event;
  }

  deleteEvent(eventId) {
    // First, ensure state is in sync with Core (recover from any prior desync)
    this._syncEventsFromCore({ silent: true });

    const deleted = this.calendar.removeEvent(eventId);
    if (!deleted) {
      console.error(`Failed to delete event: ${eventId}`);
      eventBus.emit('event:error', { action: 'delete', eventId, error: 'Event not found' });
      return false;
    }
    // Sync from Core to ensure consistency (single source of truth)
    this._syncEventsFromCore();
    eventBus.emit('event:remove', { eventId });
    eventBus.emit('event:deleted', { eventId });
    return true;
  }

  getEvents() {
    // Return from Core (source of truth)
    return this.calendar.getEvents() || [];
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

  // Selection management
  selectEvent(event) {
    this.setState({ selectedEvent: event });
    eventBus.emit('event:selected', { event });
  }

  selectEventById(eventId) {
    const event = this.state.events.find(e => e.id === eventId);
    if (event) {
      this.selectEvent(event);
    }
  }

  deselectEvent() {
    this.setState({ selectedEvent: null });
    eventBus.emit('event:deselected', {});
  }

  selectDate(date) {
    this.setState({ selectedDate: date });
    eventBus.emit('date:selected', { date });
  }

  deselectDate() {
    this.setState({ selectedDate: null });
    eventBus.emit('date:deselected', {});
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
      eventBus.emit('error', { error });
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
    this.subscribers.clear();
    if (this._subscriberIds) {
      this._subscriberIds.clear();
      this._subscriberIds = null;
    }
    this.state = null;
    this.calendar = null;
  }
}

// Export StateManager
export default StateManager;
