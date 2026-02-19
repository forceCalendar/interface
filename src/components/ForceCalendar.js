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
import { DOMUtils } from '../utils/DOMUtils.js';

// Import view renderers (pure JS classes, Locker Service compatible)
import { MonthViewRenderer } from '../renderers/MonthViewRenderer.js';
import { WeekViewRenderer } from '../renderers/WeekViewRenderer.js';
import { DayViewRenderer } from '../renderers/DayViewRenderer.js';

// Import EventForm component (registers custom element as side effect)
import './EventForm.js';

export class ForceCalendar extends BaseComponent {
  static RENDERERS = {
    month: MonthViewRenderer,
    week: WeekViewRenderer,
    day: DayViewRenderer
  };

  static get observedAttributes() {
    return ['view', 'date', 'locale', 'timezone', 'week-starts-on', 'height'];
  }

  constructor() {
    super();
    this.stateManager = null;
    this.currentView = null;
    this._hasRendered = false; // Track if initial render is complete
    this._cachedStyles = null; // Cache styles to avoid recreation
    this._busUnsubscribers = [];
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
    // Clean up any existing subscriptions before re-subscribing
    this._busUnsubscribers.forEach(unsub => unsub());
    this._busUnsubscribers = [];

    // Navigation events
    this._busUnsubscribers.push(
      eventBus.on('navigation:*', (data, event) => {
        this.emit('calendar-navigate', { action: event.split(':')[1], ...data });
      })
    );

    // View change events
    this._busUnsubscribers.push(
      eventBus.on('view:changed', data => {
        this.emit('calendar-view-change', data);
      })
    );

    const forwardEventAction = (action, data) => {
      this.emit(`calendar-event-${action}`, data);
    };

    // Event management events (canonical + backward-compatible aliases)
    this._busUnsubscribers.push(
      eventBus.on('event:add', data => {
        forwardEventAction('add', data);
      })
    );
    this._busUnsubscribers.push(
      eventBus.on('event:update', data => {
        forwardEventAction('update', data);
      })
    );
    this._busUnsubscribers.push(
      eventBus.on('event:remove', data => {
        forwardEventAction('remove', data);
      })
    );
    // Specific lifecycle events — do NOT call forwardEventAction here; the
    // canonical event:add/update/remove handlers above already forward the
    // generic CustomEvent.  These handlers emit only the specific variant so
    // consumers that care about the distinction can subscribe to it without
    // receiving the generic event a second time.
    this._busUnsubscribers.push(
      eventBus.on('event:added', data => {
        this.emit('calendar-event-added', data);
      })
    );
    this._busUnsubscribers.push(
      eventBus.on('event:updated', data => {
        this.emit('calendar-event-updated', data);
      })
    );
    this._busUnsubscribers.push(
      eventBus.on('event:deleted', data => {
        this.emit('calendar-event-deleted', data);
      })
    );

    // Date selection events
    this._busUnsubscribers.push(
      eventBus.on('date:selected', data => {
        this.emit('calendar-date-select', data);
      })
    );
  }

  handleStateChange(newState, oldState) {
    // If not yet rendered, do nothing (mount will handle initial render)
    if (!this._hasRendered) {
      return;
    }

    // Check what changed
    const viewChanged = newState.view !== oldState?.view;
    const dateChanged = newState.currentDate?.getTime() !== oldState?.currentDate?.getTime();
    const eventsChanged = newState.events !== oldState?.events;
    const loadingChanged = newState.loading !== oldState?.loading;
    const errorChanged = newState.error !== oldState?.error;

    // For loading/error state changes, do full re-render (rare)
    if (errorChanged) {
      this.render();
      return;
    }
    if (loadingChanged) {
      this._updateLoadingState(newState.loading);
      return;
    }

    // Update local view reference if needed
    if (viewChanged) {
      this.currentView = newState.view;
    }

    // Targeted updates based on what changed
    if (viewChanged) {
      // View changed: update title, buttons, and switch view
      this._updateTitle();
      this._updateViewButtons();
      this._switchView();
    } else if (dateChanged) {
      // Date changed: update title and re-render view
      this._updateTitle();
      this._updateViewContent();
    } else if (eventsChanged) {
      // Events changed: only re-render view content
      this._updateViewContent();
    }
    // Selection changes are handled by the view internally, no action needed here
  }

  /**
   * Update only the title text (no DOM recreation)
   */
  _updateTitle() {
    const titleEl = this.$('.fc-title');
    if (titleEl) {
      const state = this.stateManager.getState();
      titleEl.textContent = this.getTitle(state.currentDate, state.view);
    }
  }

  /**
   * Update view button active states (no DOM recreation)
   */
  _updateViewButtons() {
    const state = this.stateManager.getState();
    this.$$('[data-view]').forEach(button => {
      const isActive = button.dataset.view === state.view;
      button.classList.toggle('active', isActive);
    });
  }

  /**
   * Switch to a different view type
   */
  _switchView() {
    const container = this.$('#calendar-view-container');
    if (!container) return;

    // Clean up previous view
    if (this._currentViewInstance) {
      if (this._currentViewInstance.cleanup) {
        this._currentViewInstance.cleanup();
      }
    }

    // Create new view using renderer classes
    try {
      const RendererClass = ForceCalendar.RENDERERS[this.currentView] || MonthViewRenderer;
      const viewRenderer = new RendererClass(container, this.stateManager);
      viewRenderer._viewType = this.currentView;
      this._currentViewInstance = viewRenderer;
      viewRenderer.render();
      // Note: No subscription - handleStateChange manages all view updates
    } catch (err) {
      console.error('[ForceCalendar] Error switching view:', err);
    }
  }

  /**
   * Re-render only the view content (not header)
   */
  _updateViewContent() {
    if (this._currentViewInstance && this._currentViewInstance.render) {
      this._currentViewInstance.render();
    }
  }

  /**
   * Toggle loading overlay without rebuilding the component tree.
   */
  _updateLoadingState(isLoading) {
    const loadingEl = this.$('.fc-loading');
    const viewContainer = this.$('.fc-view-container');
    if (loadingEl) {
      loadingEl.style.display = isLoading ? 'flex' : 'none';
    }
    if (viewContainer) {
      viewContainer.style.display = isLoading ? 'none' : 'flex';
    }
  }

  mount() {
    this.currentView = this.stateManager.getView();
    super.mount();
  }

  loadView(viewType) {
    if (!viewType || this.currentView === viewType) return;
    this.currentView = viewType;
    this._switchView();
    this._updateViewButtons();
    this._updateTitle();
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
                        <p><strong>Error:</strong> ${DOMUtils.escapeHTML(error.message || 'An error occurred')}</p>
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
                    <div class="fc-loading" style="display: ${loading ? 'flex' : 'none'};">
                        <div class="fc-spinner"></div>
                        <span>Loading...</span>
                    </div>
                    <div class="fc-view-container" style="display: ${loading ? 'none' : 'flex'};">
                        ${this.renderView()}
                    </div>
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
    // Manually instantiate and mount view renderer (bypasses Locker Service)
    const container = this.$('#calendar-view-container');

    // Only create view once per view type change
    if (container && this.stateManager && this.currentView) {
      // Check if container actually has content (render() clears shadow DOM)
      if (
        this._currentViewInstance &&
        this._currentViewInstance._viewType === this.currentView &&
        container.children.length > 0
      ) {
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

      // Create view renderer using the appropriate renderer class
      try {
        const RendererClass = ForceCalendar.RENDERERS[this.currentView] || MonthViewRenderer;
        const viewRenderer = new RendererClass(container, this.stateManager);
        viewRenderer._viewType = this.currentView;
        this._currentViewInstance = viewRenderer;
        viewRenderer.render();
        // Note: No subscription here - handleStateChange manages all view updates
        // via _updateViewContent(), _switchView(), or full re-render
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
    this.addListener(this.shadowRoot, 'day-click', e => {
      if (modal) {
        modal.open(e.detail.date);
      }
    });

    // Handle event saving
    if (modal) {
      this.addListener(modal, 'save', e => {
        const eventData = e.detail;
        // Robust Safari support check for randomUUID
        const id =
          window.crypto && typeof window.crypto.randomUUID === 'function'
            ? window.crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15);

        this.stateManager.addEvent({
          id,
          ...eventData
        });
      });
    }

    // Mark initial render as complete for targeted updates
    this._hasRendered = true;
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
      calendar: `
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
    this._busUnsubscribers.forEach(unsub => unsub());
    this._busUnsubscribers = [];

    if (this.stateManager) {
      this.stateManager.destroy();
    }
    super.cleanup();
  }
}

// Register component
if (!customElements.get('forcecal-main')) {
  customElements.define('forcecal-main', ForceCalendar);
}
