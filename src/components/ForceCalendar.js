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
if (!customElements.get('force-calendar-month')) {
    customElements.define('force-calendar-month', MonthView);
}
if (!customElements.get('force-calendar-week')) {
    customElements.define('force-calendar-week', WeekView);
}
if (!customElements.get('force-calendar-day')) {
    customElements.define('force-calendar-day', DayView);
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

            /* Ensure view components have proper dimensions */
            force-calendar-month,
            force-calendar-week,
            force-calendar-day {
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
                
                <force-calendar-event-form id="event-modal"></force-calendar-event-form>
            </div>
        `;
    }

    renderView() {
        if (!this.currentView) {
            return '<div>Loading view...</div>';
        }

        const tagName = `force-calendar-${this.currentView}`;
        return `<${tagName} id="calendar-view"></${tagName}>`;
    }

    afterRender() {
        // Set up view component
        const viewElement = this.$('#calendar-view');
        if (viewElement && this.stateManager) {
            viewElement.stateManager = this.stateManager;
        }

        // Add event listeners for buttons
        this.$$('[data-action]').forEach(button => {
            button.addEventListener('click', this.handleNavigation.bind(this));
        });

        this.$$('[data-view]').forEach(button => {
            button.addEventListener('click', this.handleViewChange.bind(this));
        });

        // Event Modal Handling
        const modal = this.$('#event-modal');
        const createBtn = this.$('#create-event-btn');

        if (createBtn && modal) {
            createBtn.addEventListener('click', () => {
                modal.open(new Date());
            });
        }

        // Listen for day clicks from the view
        this.shadowRoot.addEventListener('day-click', (e) => {
            if (modal) {
                modal.open(e.detail.date);
            }
        });

        // Handle event saving
        if (modal) {
            modal.addEventListener('save', (e) => {
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
if (!customElements.get('force-calendar')) {
    customElements.define('force-calendar', ForceCalendar);
}