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
    }

    // State management
    getState() {
        return { ...this.state };
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

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.unsubscribe(callback);
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
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
        const changedKeys = Object.keys(newState).filter(
            key => oldState[key] !== newState[key]
        );

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
        this.state.events.push(addedEvent);
        this.setState({ events: [...this.state.events] });
        eventBus.emit('event:added', { event: addedEvent });
        return addedEvent;
    }

    updateEvent(eventId, updates) {
        const event = this.calendar.updateEvent(eventId, updates);
        if (event) {
            const index = this.state.events.findIndex(e => e.id === eventId);
            if (index > -1) {
                this.state.events[index] = event;
                this.setState({ events: [...this.state.events] });
                eventBus.emit('event:updated', { event });
            }
        }
        return event;
    }

    deleteEvent(eventId) {
        const deleted = this.calendar.removeEvent(eventId);
        if (deleted) {
            this.state.events = this.state.events.filter(e => e.id !== eventId);
            this.setState({ events: [...this.state.events] });
            eventBus.emit('event:deleted', { eventId });
        }
        return deleted;
    }

    getEvents() {
        return this.calendar.getEvents();
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
        // Add additional UI-specific data to view data
        // Core returns weeks with days, not a flat dates array
        if (viewData.weeks) {
            viewData.weeks = viewData.weeks.map(week => ({
                ...week,
                days: week.days.map(day => ({
                    ...day,
                    // Core already provides isToday and isWeekend
                    isSelected: this.isSelectedDate(new Date(day.date)),
                    // Ensure events are included
                    events: day.events || this.getEventsForDate(new Date(day.date))
                }))
            }));
        }

        // Handle day view specifically
        if (viewData.days) {
            viewData.days = viewData.days.map(day => ({
                ...day,
                isSelected: this.isSelectedDate(new Date(day.date)),
                // Ensure events are included
                events: day.events || this.getEventsForDate(new Date(day.date))
            }));
        }

        // Handle single day structure (for day view)
        if (viewData.date && !viewData.days && !viewData.weeks) {
            viewData.events = viewData.events || this.getEventsForDate(new Date(viewData.date));
        }

        return viewData;
    }

    // Selection management
    selectEvent(event) {
        this.setState({ selectedEvent: event });
        eventBus.emit('event:selected', { event });
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
        return this.state.selectedDate &&
               date.toDateString() === this.state.selectedDate.toDateString();
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
        this.state = null;
        this.calendar = null;
    }
}

// Export StateManager
export default StateManager;