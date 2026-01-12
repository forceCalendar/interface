/**
 * ForceCalendar - Main calendar component
 *
 * The primary interface component that integrates all views and features
 */

import { BaseComponent } from '../core/BaseComponent.js';
import StateManager from '../core/StateManager.js';
import eventBus from '../core/EventBus.js';
import { StyleUtils } from '../utils/StyleUtils.js';
import { DateUtils } from '../utils/DateUtils.js';

// Import view components
import { MonthView } from './views/MonthView.js';
import { WeekView } from './views/WeekView.js';
import { DayView } from './views/DayView.js';
import { EventForm } from './EventForm.js'; // Import EventForm

// Register view components
if (!customElements.get('forcecal-month')) {
    customElements.define('forcecal-month', MonthView);
}
if (!customElements.get('forcecal-week')) {
    customElements.define('forcecal-week', WeekView);
}
if (!customElements.get('forcecal-day')) {
    customElements.define('forcecal-day', DayView);
}
// EventForm is self-registering in its file


export class ForceCalendar extends BaseComponent {
    static get observedAttributes() {
        return ['view', 'date', 'locale', 'timezone', 'week-starts-on', 'height'];
    }

    constructor() {
        super();
        this.stateManager = null;
        this.currentView = null;
    }

    initialize() {
        // Initialize state manager with config from attributes
        const config = {
            view: this.getAttribute('view') || 'month',
            date: this.getAttribute('date') ? new Date(this.getAttribute('date')) : new Date(),
            locale: this.getAttribute('locale') || 'en-US',
            timeZone: this.getAttribute('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
            weekStartsOn: parseInt(this.getAttribute('week-starts-on') || '0')
        };

        this.stateManager = new StateManager(config);

        // Subscribe to state changes
        this.stateManager.subscribe(this.handleStateChange.bind(this));

        // Listen for events
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navigation events
        eventBus.on('navigation:*', (data, event) => {
            this.emit('calendar-navigate', { action: event.split(':')[1], ...data });
        });

        // View change events
        eventBus.on('view:changed', (data) => {
            this.emit('calendar-view-change', data);
        });

        // Event management events
        eventBus.on('event:*', (data, event) => {
            this.emit(`calendar-event-${event.split(':')[1]}`, data);
        });

        // Date selection events
        eventBus.on('date:selected', (data) => {
            this.emit('calendar-date-select', data);
        });
    }

    handleStateChange(newState, oldState) {
        // Update local view reference if needed
        if (newState.view !== oldState?.view) {
            this.currentView = newState.view;
        }

        // Re-render to update header title, active buttons, and child view
        this.render();
    }

    mount() {
        super.mount();
        this.loadView(this.stateManager.getView());
    }

    loadView(viewType) {
        // Views are already registered at the top of the file
        this.currentView = viewType;
        this.render();
    }

    getStyles() {
        const height = this.getAttribute('height') || '800px';

        return `
            ${StyleUtils.getBaseStyles()}
            ${StyleUtils.getButtonStyles()}
            ${StyleUtils.getGridStyles()}
            ${StyleUtils.getAnimations()}

            :host {
                --calendar-height: ${height};
                display: block;
                font-family: var(--fc-font-family);
            }

            .force-calendar {
                display: flex;
                flex-direction: column;
                height: var(--calendar-height);
                background: var(--fc-background);
                border: 1px solid var(--fc-border-color);
                border-radius: var(--fc-border-radius-lg);
                overflow: hidden;
                box-shadow: var(--fc-shadow);
            }

            .fc-header {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                align-items: center;
                padding: var(--fc-spacing-md) var(--fc-spacing-lg);
                background: rgba(255, 255, 255, 0.95);
                -webkit-backdrop-filter: blur(8px); /* Safari support */
                backdrop-filter: blur(8px);
                border-bottom: 1px solid var(--fc-border-color);
                z-index: 10;
                position: sticky;
                top: 0;
            }

            .fc-header-left {
                display: flex;
                align-items: center;
                gap: var(--fc-spacing-md);
                justify-self: start;
                flex-basis: 0; /* Force Safari to distribute space */
            }

            .fc-header-center {
                display: flex;
                align-items: center;
                gap: var(--fc-spacing-lg);
                justify-self: center;
            }

            .fc-header-right {
                display: flex;
                align-items: center;
                gap: var(--fc-spacing-md);
                justify-self: end;
                flex-basis: 0; /* Force Safari to distribute space */
            }

            .fc-title {
                font-size: 14px;
                font-weight: var(--fc-font-weight-semibold);
                color: var(--fc-text-color);
                white-space: nowrap;
                letter-spacing: -0.01em;
                min-width: 140px;
                text-align: center;
            }

            .fc-btn-today {
                border-radius: var(--fc-border-radius-sm);
                padding: 0 12px;
                font-size: 12px;
                font-weight: var(--fc-font-weight-medium);
                border: 1px solid var(--fc-border-color);
                background: var(--fc-background);
                color: var(--fc-text-color);
                height: 28px;
                transition: all var(--fc-transition-fast);
                cursor: pointer;
                display: flex;
                align-items: center;
            }

            .fc-btn-today:hover {
                background: var(--fc-background-hover);
                border-color: var(--fc-border-color-hover);
            }

            .fc-nav-arrow {
                border: 1px solid var(--fc-border-color);
                background: var(--fc-background);
                height: 28px;
                width: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--fc-border-radius-sm);
                color: var(--fc-text-secondary);
                cursor: pointer;
                transition: all var(--fc-transition-fast);
                padding: 0;
            }

            .fc-nav-arrow:hover {
                background: var(--fc-background-hover);
                color: var(--fc-text-color);
                border-color: var(--fc-border-color-hover);
            }

            /* View Switcher - Fused Button Group */
            .fc-view-buttons {
                display: flex;
                border: 1px solid var(--fc-border-color);
                border-radius: var(--fc-border-radius-sm);
                overflow: hidden;
            }

            .fc-view-button {
                background: var(--fc-background);
                border: none;
                border-right: 1px solid var(--fc-border-color);
                color: var(--fc-text-secondary);
                padding: 0 12px;
                font-size: var(--fc-font-size-sm);
                font-weight: var(--fc-font-weight-medium);
                transition: background-color var(--fc-transition-fast);
                cursor: pointer;
                height: 28px;
                display: flex;
                align-items: center;
            }
            
            .fc-view-button:last-child {
                border-right: none;
            }

            .fc-view-button:hover:not(.active) {
                background: var(--fc-background-hover);
                color: var(--fc-text-color);
            }

            .fc-view-button.active {
                background: var(--fc-background-alt);
                color: var(--fc-text-color);
                font-weight: var(--fc-font-weight-semibold);
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
            }

            .fc-body {
                flex: 1;
                position: relative;
                background: var(--fc-background);
                min-height: 0;
                display: flex;
                flex-direction: column;
            }

            .fc-view-container {
                flex: 1;
                position: relative;
                min-height: 0;
                display: flex;
                flex-direction: column;
            }

            /* Ensure view container has proper dimensions */
            #calendar-view-container {
                display: block;
                width: 100%;
                height: 100%;
                flex: 1;
            }

            #calendar-view-container > * {
                display: block;
                width: 100%;
                height: 100%;
            }

            /* Loading state */
            .fc-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--fc-spacing-md);
                color: var(--fc-text-secondary);
            }

            .fc-spinner {
                width: 24px;
                height: 24px;
                border: 3px solid var(--fc-border-color);
                border-top-color: var(--fc-primary-color);
                border-radius: 50%;
                animation: fc-spin 1s linear infinite;
            }

            /* Error state */
            .fc-error {
                padding: var(--fc-spacing-xl);
                text-align: center;
                color: var(--fc-danger-color);
                background: #FEF2F2;
                border-radius: var(--fc-border-radius);
                margin: var(--fc-spacing-xl);
            }

            /* Icons */
            .fc-icon {
                width: 18px;
                height: 18px;
                fill: currentColor;
            }

            /* Responsive Adjustments */
            @media (max-width: 850px) {
                .fc-header {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: var(--fc-spacing-md);
                    height: auto;
                    position: static;
                    padding: var(--fc-spacing-md);
                }

                .fc-header-center {
                    order: -1;
                    text-align: center;
                    width: 100%;
                    padding: var(--fc-spacing-xs) 0;
                }

                .fc-header-left,
                .fc-header-right {
                    justify-content: space-between;
                    width: 100%;
                }

                #create-event-btn {
                    flex: 1;
                }
            }

            /* Month View Styles (inline rendering for Locker Service compatibility) */
            .fc-month-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--fc-background);
            }

            .fc-month-header {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                border-bottom: 1px solid var(--fc-border-color);
                background: var(--fc-background-alt);
            }

            .fc-month-header-cell {
                padding: 12px 8px;
                text-align: center;
                font-size: 11px;
                font-weight: 600;
                color: var(--fc-text-light);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .fc-month-body {
                display: flex;
                flex-direction: column;
                flex: 1;
            }

            .fc-month-week {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                flex: 1;
                min-height: 100px;
            }

            .fc-month-day {
                background: var(--fc-background);
                border-right: 1px solid var(--fc-border-color);
                border-bottom: 1px solid var(--fc-border-color);
                padding: 4px;
                min-height: 80px;
                cursor: pointer;
                transition: background-color 0.15s ease;
                display: flex;
                flex-direction: column;
            }

            .fc-month-day:hover {
                background: var(--fc-background-hover);
            }

            .fc-month-day:last-child {
                border-right: none;
            }

            .fc-month-day.other-month {
                background: var(--fc-background-alt);
            }

            .fc-month-day.other-month .fc-day-number {
                color: var(--fc-text-light);
            }

            .fc-month-day.today {
                background: rgba(37, 99, 235, 0.05);
            }

            .fc-month-day.today .fc-day-number {
                background: var(--fc-primary-color);
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .fc-day-number {
                font-size: 13px;
                font-weight: 500;
                color: var(--fc-text-color);
                padding: 2px 4px;
                margin-bottom: 4px;
            }

            .fc-day-events {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1;
                overflow: hidden;
            }

            .fc-event {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 3px;
                color: white;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                cursor: pointer;
                transition: transform 0.1s ease;
            }

            .fc-event:hover {
                transform: scale(1.02);
            }

            .fc-more-events {
                font-size: 10px;
                color: var(--fc-text-light);
                padding: 2px 4px;
                font-weight: 500;
            }

            /* Week View Styles (inline rendering for Locker Service compatibility) */
            .fc-week-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--fc-background);
            }

            /* Day View Styles (inline rendering for Locker Service compatibility) */
            .fc-day-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--fc-background);
            }
        `;
    }

    template() {
        const state = this.stateManager.getState();
        const { currentDate, view, loading, error } = state;

        if (error) {
            return `
                <div class="force-calendar">
                    <div class="fc-error">
                        <p><strong>Error:</strong> ${error.message || 'An error occurred'}</p>
                    </div>
                </div>
            `;
        }

        const title = this.getTitle(currentDate, view);

        return `
            <div class="force-calendar">
                <header class="fc-header">
                    <div class="fc-header-left">
                        <button class="fc-btn-today" data-action="today">
                            Today
                        </button>
                    </div>

                    <div class="fc-header-center">
                        <button class="fc-nav-arrow" data-action="previous" title="Previous">
                            ${this.getIcon('chevron-left')}
                        </button>
                        <h2 class="fc-title">${title}</h2>
                        <button class="fc-nav-arrow" data-action="next" title="Next">
                            ${this.getIcon('chevron-right')}
                        </button>
                    </div>

                    <div class="fc-header-right">
                        <button class="fc-btn fc-btn-primary" id="create-event-btn" style="height: 28px; padding: 0 12px; font-size: 12px;">
                            + New Event
                        </button>
                        <div class="fc-view-buttons" role="group">
                            <button class="fc-view-button ${view === 'month' ? 'active' : ''}"
                                    data-view="month">Month</button>
                            <button class="fc-view-button ${view === 'week' ? 'active' : ''}"
                                    data-view="week">Week</button>
                            <button class="fc-view-button ${view === 'day' ? 'active' : ''}"
                                    data-view="day">Day</button>
                        </div>
                    </div>
                </header>

                <div class="fc-body">
                    ${loading ? `
                        <div class="fc-loading">
                            <div class="fc-spinner"></div>
                            <span>Loading...</span>
                        </div>
                    ` : `
                        <div class="fc-view-container">
                            ${this.renderView()}
                        </div>
                    `}
                </div>
                
                <forcecal-event-form id="event-modal"></forcecal-event-form>
            </div>
        `;
    }

    renderView() {
        // Use a plain div container - we'll manually instantiate view classes
        // This bypasses Locker Service's custom element restrictions
        return '<div id="calendar-view-container"></div>';
    }

    afterRender() {
        // Manually instantiate and mount view component (bypasses Locker Service)
        const container = this.$('#calendar-view-container');
        console.log('[ForceCalendar] afterRender - container:', !!container, 'stateManager:', !!this.stateManager, 'currentView:', this.currentView);

        // Only create view once per view type change
        if (container && this.stateManager && this.currentView) {
            // Check if container actually has content (render() clears shadow DOM)
            if (this._currentViewInstance && this._currentViewInstance._viewType === this.currentView && container.children.length > 0) {
                console.log('[ForceCalendar] View already exists with content, skipping creation');
                return;
            }

            // Clean up previous view if exists
            if (this._currentViewInstance) {
                if (this._currentViewInstance.cleanup) {
                    this._currentViewInstance.cleanup();
                }
                if (this._viewUnsubscribe) {
                    this._viewUnsubscribe();
                    this._viewUnsubscribe = null;
                }
            }

            console.log('[ForceCalendar] Creating view for:', this.currentView);

            // Create a simple view renderer that doesn't use custom elements
            try {
                const viewRenderer = this._createViewRenderer(this.currentView);
                if (viewRenderer) {
                    viewRenderer._viewType = this.currentView;
                    this._currentViewInstance = viewRenderer;
                    viewRenderer.stateManager = this.stateManager;
                    viewRenderer.container = container;

                    console.log('[ForceCalendar] Calling viewRenderer.render()');
                    viewRenderer.render();
                    console.log('[ForceCalendar] viewRenderer.render() completed');

                    // Subscribe to state changes (store unsubscribe function)
                    this._viewUnsubscribe = this.stateManager.subscribe((newState, oldState) => {
                        // Only re-render on data changes, not view changes
                        if (newState.events !== oldState?.events ||
                            newState.currentDate !== oldState?.currentDate) {
                            if (viewRenderer && viewRenderer.render) {
                                viewRenderer.render();
                            }
                        }
                    });
                }
            } catch (err) {
                console.error('[ForceCalendar] Error creating/rendering view:', err);
            }
        }

        // Add event listeners for buttons using tracked addListener
        this.$$('[data-action]').forEach(button => {
            this.addListener(button, 'click', this.handleNavigation);
        });

        this.$$('[data-view]').forEach(button => {
            this.addListener(button, 'click', this.handleViewChange);
        });

        // Event Modal Handling
        const modal = this.$('#event-modal');
        const createBtn = this.$('#create-event-btn');

        if (createBtn && modal) {
            this.addListener(createBtn, 'click', () => {
                modal.open(new Date());
            });
        }

        // Listen for day clicks from the view
        this.addListener(this.shadowRoot, 'day-click', (e) => {
            if (modal) {
                modal.open(e.detail.date);
            }
        });

        // Handle event saving
        if (modal) {
            this.addListener(modal, 'save', (e) => {
                const eventData = e.detail;
                // Robust Safari support check for randomUUID
                const id = (window.crypto && typeof window.crypto.randomUUID === 'function')
                    ? window.crypto.randomUUID()
                    : Math.random().toString(36).substring(2, 15);

                this.stateManager.addEvent({
                    id,
                    ...eventData
                });
            });
        }
    }

    _createViewRenderer(viewName) {
        // Create a simple view renderer that bypasses custom elements
        // This is necessary for Salesforce Locker Service compatibility
        const self = this;
        const currentViewName = viewName;

        return {
            stateManager: null,
            container: null,
            _listeners: [],
            _scrolled: false,

            cleanup() {
                this._listeners.forEach(({ element, event, handler }) => {
                    element.removeEventListener(event, handler);
                });
                this._listeners = [];
            },

            addListener(element, event, handler) {
                element.addEventListener(event, handler);
                this._listeners.push({ element, event, handler });
            },

            render() {
                if (!this.container || !this.stateManager) return;

                const viewData = this.stateManager.getViewData();
                if (!viewData) {
                    this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Loading...</div>';
                    return;
                }

                this.cleanup();
                const config = this.stateManager.getState().config;
                let html = '';

                switch (currentViewName) {
                    case 'week':
                        html = this._renderWeekView(viewData, config);
                        break;
                    case 'day':
                        html = this._renderDayView(viewData, config);
                        break;
                    case 'month':
                    default:
                        if (!viewData.weeks) {
                            this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No data available for month view.</div>';
                            return;
                        }
                        html = this._renderMonthView(viewData, config);
                        break;
                }

                this.container.innerHTML = html;
                this._attachEventHandlers(currentViewName);
            },

            _renderMonthView(viewData, config) {
                const weekStartsOn = config.weekStartsOn || 0;
                const dayNames = [];
                for (let i = 0; i < 7; i++) {
                    const dayIndex = (weekStartsOn + i) % 7;
                    dayNames.push(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]);
                }

                let html = `
                    <div class="fc-month-view" style="display: flex; flex-direction: column; height: 100%; min-height: 400px; background: #fff; border: 1px solid #e5e7eb;">
                        <div class="fc-month-header" style="display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
                            ${dayNames.map(d => `<div class="fc-month-header-cell" style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">${d}</div>`).join('')}
                        </div>
                        <div class="fc-month-body" style="display: flex; flex-direction: column; flex: 1;">
                `;

                viewData.weeks.forEach(week => {
                    html += '<div class="fc-month-week" style="display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; min-height: 80px;">';
                    week.days.forEach(day => {
                        const isOtherMonth = !day.isCurrentMonth;
                        const isToday = day.isToday;

                        const dayBg = isOtherMonth ? '#f3f4f6' : '#fff';
                        const dayNumColor = isOtherMonth ? '#9ca3af' : '#111827';
                        const todayStyle = isToday ? 'background: #2563eb; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;' : '';

                        const events = day.events || [];
                        const visibleEvents = events.slice(0, 3);
                        const moreCount = events.length - 3;

                        html += `
                            <div class="fc-month-day" data-date="${day.date}" style="background: ${dayBg}; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 4px; min-height: 80px; cursor: pointer;">
                                <div class="fc-day-number" style="font-size: 13px; font-weight: 500; color: ${dayNumColor}; padding: 2px 4px; margin-bottom: 4px; ${todayStyle}">${day.dayOfMonth}</div>
                                <div class="fc-day-events" style="display: flex; flex-direction: column; gap: 2px;">
                                    ${visibleEvents.map(evt => `
                                        <div class="fc-event" data-event-id="${evt.id}" style="background-color: ${evt.backgroundColor || '#2563eb'}; font-size: 11px; padding: 2px 6px; border-radius: 3px; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">
                                            ${evt.title}
                                        </div>
                                    `).join('')}
                                    ${moreCount > 0 ? `<div class="fc-more-events" style="font-size: 10px; color: #6b7280; padding: 2px 4px; font-weight: 500;">+${moreCount} more</div>` : ''}
                                </div>
                            </div>
                        `;
                    });
                    html += '</div>';
                });

                html += '</div></div>';
                return html;
            },

            _renderWeekView(viewData, config) {
                const days = viewData.days || [];
                if (days.length === 0) {
                    return '<div style="padding: 20px; text-align: center; color: #666;">No data available for week view.</div>';
                }

                const weekStartsOn = config.weekStartsOn || 0;
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const hours = Array.from({ length: 24 }, (_, i) => i);

                // Process days to add events
                const processedDays = days.map(day => {
                    const dayDate = new Date(day.date);
                    const events = day.events || [];
                    return {
                        ...day,
                        date: dayDate,
                        dayName: dayNames[dayDate.getDay()],
                        dayOfMonth: dayDate.getDate(),
                        isToday: this._isToday(dayDate),
                        timedEvents: events.filter(e => !e.allDay),
                        allDayEvents: events.filter(e => e.allDay)
                    };
                });

                let html = `
                    <div class="fc-week-view" style="display: flex; flex-direction: column; height: 100%; background: #fff; overflow: hidden;">
                        <!-- Header -->
                        <div style="display: grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom: 1px solid #e5e7eb; background: #f9fafb; flex-shrink: 0;">
                            <div style="border-right: 1px solid #e5e7eb;"></div>
                            ${processedDays.map(day => `
                                <div style="padding: 12px 8px; text-align: center; border-right: 1px solid #e5e7eb;">
                                    <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">${day.dayName}</div>
                                    <div style="font-size: 16px; font-weight: 500; margin-top: 4px; ${day.isToday ? 'background: #dc2626; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;' : 'color: #111827;'}">${day.dayOfMonth}</div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- All Day Row -->
                        <div style="display: grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom: 1px solid #e5e7eb; background: #fafafa; min-height: 32px; flex-shrink: 0;">
                            <div style="font-size: 9px; color: #6b7280; display: flex; align-items: center; justify-content: center; border-right: 1px solid #e5e7eb; text-transform: uppercase; font-weight: 700;">All day</div>
                            ${processedDays.map(day => `
                                <div style="border-right: 1px solid #e5e7eb; padding: 4px; display: flex; flex-direction: column; gap: 2px;">
                                    ${day.allDayEvents.map(evt => `
                                        <div class="fc-event" data-event-id="${evt.id}" style="background-color: ${evt.backgroundColor || '#2563eb'}; font-size: 10px; padding: 2px 4px; border-radius: 2px; color: white; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${evt.title}
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>

                        <!-- Time Grid Body -->
                        <div id="week-scroll-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; position: relative;">
                            <div style="display: grid; grid-template-columns: 60px repeat(7, 1fr); position: relative; height: 1440px;">
                                <!-- Time Gutter -->
                                <div style="border-right: 1px solid #e5e7eb; background: #fafafa;">
                                    ${hours.map(h => `
                                        <div style="height: 60px; font-size: 10px; color: #6b7280; text-align: right; padding-right: 8px; font-weight: 500;">
                                            ${h === 0 ? '' : this._formatHour(h)}
                                        </div>
                                    `).join('')}
                                </div>

                                <!-- Day Columns -->
                                ${processedDays.map(day => `
                                    <div class="fc-week-day-column" data-date="${day.date.toISOString()}" style="border-right: 1px solid #e5e7eb; position: relative; cursor: pointer;">
                                        <!-- Hour grid lines -->
                                        ${hours.map(() => `<div style="height: 60px; border-bottom: 1px solid #f3f4f6;"></div>`).join('')}

                                        <!-- Now indicator for today -->
                                        ${day.isToday ? this._renderNowIndicator() : ''}

                                        <!-- Timed events -->
                                        ${day.timedEvents.map(evt => this._renderTimedEvent(evt)).join('')}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;

                return html;
            },

            _renderDayView(viewData, config) {
                // Day view from core has: type, date, dayName, isToday, allDayEvents, hours
                // We need to handle both the core structure and enriched structure
                const currentDate = this.stateManager?.getState()?.currentDate || new Date();

                let dayDate, dayName, isToday, allDayEvents, timedEvents;

                if (viewData.type === 'day' && viewData.date) {
                    // Core day view structure
                    dayDate = new Date(viewData.date);
                    dayName = viewData.dayName || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayDate.getDay()];
                    isToday = viewData.isToday !== undefined ? viewData.isToday : this._isToday(dayDate);
                    allDayEvents = viewData.allDayEvents || [];

                    // Extract timed events from hours array or get from stateManager
                    if (viewData.hours && Array.isArray(viewData.hours)) {
                        // Collect unique events from hours (events can span multiple hours)
                        const eventMap = new Map();
                        viewData.hours.forEach(hour => {
                            (hour.events || []).forEach(evt => {
                                if (!eventMap.has(evt.id)) {
                                    eventMap.set(evt.id, evt);
                                }
                            });
                        });
                        timedEvents = Array.from(eventMap.values());
                    } else {
                        timedEvents = [];
                    }
                } else if (viewData.days && viewData.days.length > 0) {
                    // Enriched structure with days array
                    const dayData = viewData.days.find(d => this._isSameDay(new Date(d.date), currentDate)) || viewData.days[0];
                    dayDate = new Date(dayData.date);
                    dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayDate.getDay()];
                    isToday = this._isToday(dayDate);
                    const events = dayData.events || [];
                    allDayEvents = events.filter(e => e.allDay);
                    timedEvents = events.filter(e => !e.allDay);
                } else {
                    return '<div style="padding: 20px; text-align: center; color: #666;">No data available for day view.</div>';
                }

                const hours = Array.from({ length: 24 }, (_, i) => i);

                let html = `
                    <div class="fc-day-view" style="display: flex; flex-direction: column; height: 100%; background: #fff; overflow: hidden;">
                        <!-- Header -->
                        <div style="display: grid; grid-template-columns: 60px 1fr; border-bottom: 1px solid #e5e7eb; background: #f9fafb; flex-shrink: 0;">
                            <div style="border-right: 1px solid #e5e7eb;"></div>
                            <div style="padding: 16px 24px;">
                                <div style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">${dayName}</div>
                                <div style="font-size: 24px; font-weight: 600; margin-top: 4px; ${isToday ? 'color: #dc2626;' : 'color: #111827;'}">${dayDate.getDate()}</div>
                            </div>
                        </div>

                        <!-- All Day Row -->
                        <div style="display: grid; grid-template-columns: 60px 1fr; border-bottom: 1px solid #e5e7eb; background: #fafafa; min-height: 36px; flex-shrink: 0;">
                            <div style="font-size: 9px; color: #6b7280; display: flex; align-items: center; justify-content: center; border-right: 1px solid #e5e7eb; text-transform: uppercase; font-weight: 700;">All day</div>
                            <div style="padding: 6px 12px; display: flex; flex-wrap: wrap; gap: 4px;">
                                ${allDayEvents.map(evt => `
                                    <div class="fc-event" data-event-id="${evt.id}" style="background-color: ${evt.backgroundColor || '#2563eb'}; font-size: 12px; padding: 4px 8px; border-radius: 4px; color: white; cursor: pointer; font-weight: 500;">
                                        ${evt.title}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Time Grid Body -->
                        <div id="day-scroll-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; position: relative;">
                            <div style="display: grid; grid-template-columns: 60px 1fr; position: relative; height: 1440px;">
                                <!-- Time Gutter -->
                                <div style="border-right: 1px solid #e5e7eb; background: #fafafa;">
                                    ${hours.map(h => `
                                        <div style="height: 60px; font-size: 11px; color: #6b7280; text-align: right; padding-right: 12px; font-weight: 500;">
                                            ${h === 0 ? '' : this._formatHour(h)}
                                        </div>
                                    `).join('')}
                                </div>

                                <!-- Day Column -->
                                <div class="fc-day-column" data-date="${dayDate.toISOString()}" style="position: relative; cursor: pointer;">
                                    <!-- Hour grid lines -->
                                    ${hours.map(() => `<div style="height: 60px; border-bottom: 1px solid #f3f4f6;"></div>`).join('')}

                                    <!-- Now indicator for today -->
                                    ${isToday ? this._renderNowIndicator() : ''}

                                    <!-- Timed events -->
                                    ${timedEvents.map(evt => this._renderTimedEventDay(evt)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                return html;
            },

            _renderTimedEvent(event) {
                const start = new Date(event.start);
                const end = new Date(event.end);
                const startMinutes = start.getHours() * 60 + start.getMinutes();
                const durationMinutes = Math.max((end - start) / (1000 * 60), 20);
                const color = event.backgroundColor || '#2563eb';

                return `
                    <div class="fc-event" data-event-id="${event.id}"
                         style="position: absolute; top: ${startMinutes}px; height: ${durationMinutes}px; left: 2px; right: 2px;
                                background-color: ${color}; border-radius: 4px; padding: 4px 8px; font-size: 11px;
                                font-weight: 500; color: white; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                                cursor: pointer; z-index: 5;">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.title}</div>
                        <div style="font-size: 10px; opacity: 0.9;">${this._formatTime(start)}</div>
                    </div>
                `;
            },

            _renderTimedEventDay(event) {
                const start = new Date(event.start);
                const end = new Date(event.end);
                const startMinutes = start.getHours() * 60 + start.getMinutes();
                const durationMinutes = Math.max((end - start) / (1000 * 60), 30);
                const color = event.backgroundColor || '#2563eb';

                return `
                    <div class="fc-event" data-event-id="${event.id}"
                         style="position: absolute; top: ${startMinutes}px; height: ${durationMinutes}px; left: 12px; right: 24px;
                                background-color: ${color}; border-radius: 6px; padding: 8px 12px; font-size: 13px;
                                font-weight: 500; color: white; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                cursor: pointer; z-index: 5;">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${event.title}</div>
                        <div style="font-size: 11px; opacity: 0.9;">${this._formatTime(start)} - ${this._formatTime(end)}</div>
                    </div>
                `;
            },

            _renderNowIndicator() {
                const now = new Date();
                const minutes = now.getHours() * 60 + now.getMinutes();
                return `<div style="position: absolute; left: 0; right: 0; top: ${minutes}px; height: 2px; background: #dc2626; z-index: 15; pointer-events: none;"></div>`;
            },

            _formatHour(hour) {
                const period = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour} ${period}`;
            },

            _formatTime(date) {
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const period = hours >= 12 ? 'PM' : 'AM';
                const displayHour = hours % 12 || 12;
                return minutes === 0 ? `${displayHour} ${period}` : `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
            },

            _isToday(date) {
                const today = new Date();
                return date.getDate() === today.getDate() &&
                       date.getMonth() === today.getMonth() &&
                       date.getFullYear() === today.getFullYear();
            },

            _isSameDay(date1, date2) {
                return date1.getDate() === date2.getDate() &&
                       date1.getMonth() === date2.getMonth() &&
                       date1.getFullYear() === date2.getFullYear();
            },

            _attachEventHandlers(viewType) {
                const stateManager = this.stateManager;
                const self = this;

                // Day click handlers (for month view)
                this.container.querySelectorAll('.fc-month-day').forEach(dayEl => {
                    this.addListener(dayEl, 'click', (e) => {
                        const date = new Date(dayEl.dataset.date);
                        stateManager.selectDate(date);
                    });
                });

                // Week view day column click handlers
                this.container.querySelectorAll('.fc-week-day-column').forEach(dayEl => {
                    this.addListener(dayEl, 'click', (e) => {
                        if (e.target.closest('.fc-event')) return;
                        const date = new Date(dayEl.dataset.date);
                        const rect = dayEl.getBoundingClientRect();
                        const scrollContainer = this.container.querySelector('#week-scroll-container');
                        const y = e.clientY - rect.top + (scrollContainer ? scrollContainer.scrollTop : 0);
                        date.setHours(Math.floor(y / 60), Math.floor(y % 60), 0, 0);
                        stateManager.selectDate(date);
                    });
                });

                // Day view column click handlers
                this.container.querySelectorAll('.fc-day-column').forEach(dayEl => {
                    this.addListener(dayEl, 'click', (e) => {
                        if (e.target.closest('.fc-event')) return;
                        const date = new Date(dayEl.dataset.date);
                        const rect = dayEl.getBoundingClientRect();
                        const scrollContainer = this.container.querySelector('#day-scroll-container');
                        const y = e.clientY - rect.top + (scrollContainer ? scrollContainer.scrollTop : 0);
                        date.setHours(Math.floor(y / 60), Math.floor(y % 60), 0, 0);
                        stateManager.selectDate(date);
                    });
                });

                // Event click handlers
                this.container.querySelectorAll('.fc-event').forEach(eventEl => {
                    this.addListener(eventEl, 'click', (e) => {
                        e.stopPropagation();
                        const eventId = eventEl.dataset.eventId;
                        const event = stateManager.getEvents().find(ev => ev.id === eventId);
                        if (event) {
                            stateManager.selectEvent(event);
                        }
                    });
                });

                // Scroll to 8 AM for week and day views
                if (viewType === 'week' || viewType === 'day') {
                    const scrollContainerId = viewType === 'week' ? '#week-scroll-container' : '#day-scroll-container';
                    const scrollContainer = this.container.querySelector(scrollContainerId);
                    if (scrollContainer && !this._scrolled) {
                        scrollContainer.scrollTop = 8 * 60 - 50;
                        this._scrolled = true;
                    }
                }
            }
        };
    }

    handleNavigation(event) {
        const action = event.currentTarget.dataset.action;
        switch (action) {
            case 'today':
                this.stateManager.today();
                break;
            case 'previous':
                this.stateManager.previous();
                break;
            case 'next':
                this.stateManager.next();
                break;
        }
    }

    handleViewChange(event) {
        const view = event.currentTarget.dataset.view;
        this.stateManager.setView(view);
    }

    getTitle(date, view) {
        const locale = this.stateManager.state.config.locale;

        switch (view) {
            case 'month':
                return DateUtils.formatDate(date, 'month', locale);
            case 'week':
                const weekStart = DateUtils.startOfWeek(date);
                const weekEnd = DateUtils.endOfWeek(date);
                return DateUtils.formatDateRange(weekStart, weekEnd, locale);
            case 'day':
                return DateUtils.formatDate(date, 'long', locale);
            default:
                return DateUtils.formatDate(date, 'month', locale);
        }
    }

    getIcon(name) {
        const icons = {
            'chevron-left': `
                <svg class="fc-icon" viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            `,
            'chevron-right': `
                <svg class="fc-icon" viewBox="0 0 24 24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            `,
            'calendar': `
                <svg class="fc-icon" viewBox="0 0 24 24">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
            `
        };

        return icons[name] || '';
    }

    // Public API methods
    addEvent(event) {
        return this.stateManager.addEvent(event);
    }

    updateEvent(eventId, updates) {
        return this.stateManager.updateEvent(eventId, updates);
    }

    deleteEvent(eventId) {
        return this.stateManager.deleteEvent(eventId);
    }

    getEvents() {
        return this.stateManager.getEvents();
    }

    setView(view) {
        this.stateManager.setView(view);
    }

    setDate(date) {
        this.stateManager.setDate(date);
    }

    next() {
        this.stateManager.next();
    }

    previous() {
        this.stateManager.previous();
    }

    today() {
        this.stateManager.today();
    }

    destroy() {
        if (this.stateManager) {
            this.stateManager.destroy();
        }
        eventBus.clear();
        super.cleanup();
    }
}

// Register component
if (!customElements.get('forcecal-main')) {
    customElements.define('forcecal-main', ForceCalendar);
}