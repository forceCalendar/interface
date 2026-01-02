/**
 * MonthView - Month grid view component
 *
 * Displays a traditional month calendar grid with events
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { DOMUtils } from '../../utils/DOMUtils.js';
import { DateUtils } from '../../utils/DateUtils.js';

export class MonthView extends BaseComponent {
    constructor() {
        super();
        this._stateManager = null;
        this.viewData = null;
        this.config = {
            maxEventsToShow: 3,
        };
    }

    set stateManager(manager) {
        this._stateManager = manager;
        if (manager) {
            // Subscribe to state changes
            this.unsubscribe = manager.subscribe(this.handleStateUpdate.bind(this));
            this.loadViewData();
        }
    }

    get stateManager() {
        return this._stateManager;
    }

    handleStateUpdate(newState, oldState) {
        if (newState.currentDate !== oldState.currentDate) {
            this.loadViewData(); // Full reload if the month/year changes
            return;
        }

        if (newState.events !== oldState.events) {
            this.updateEvents();
        }

        if (newState.selectedDate !== oldState.selectedDate) {
            this.updateSelection(newState.selectedDate, oldState.selectedDate);
        }
    }

    updateEvents() {
        this.loadViewData(); // For now, we still do a full reload. A more granular update would be more complex.
    }

    updateSelection(newDate, oldDate) {
        if (oldDate) {
            const oldDateEl = this.shadowRoot.querySelector(`[data-date^="${oldDate.toISOString().split('T')[0]}"]`);
            if (oldDateEl) {
                oldDateEl.classList.remove('selected');
            }
        }
        if (newDate) {
            const newDateEl = this.shadowRoot.querySelector(`[data-date^="${newDate.toISOString().split('T')[0]}"]`);
            if (newDateEl) {
                newDateEl.classList.add('selected');
            }
        }
    }

    loadViewData() {
        if (!this.stateManager) return;

        const viewData = this.stateManager.getViewData();
        this.viewData = this.processViewData(viewData);
        this.render();
    }

    processViewData(viewData) {
        if (!viewData || !viewData.weeks) return null;

        const selectedDate = this.stateManager?.getState()?.selectedDate;

        const weeks = viewData.weeks.map(week => {
            return week.days.map(day => {
                const dayDate = new Date(day.date);
                const isSelected = selectedDate && dayDate.toDateString() === selectedDate.toDateString();
                
                const processedEvents = day.events.map(event => ({
                    ...event,
                    textColor: this.getContrastingTextColor(event.backgroundColor)
                }));

                return {
                    ...day,
                    date: dayDate,
                    isOtherMonth: !day.isCurrentMonth,
                    isSelected,
                    events: processedEvents,
                };
            });
        });

        return {
            ...viewData,
            weeks,
            month: viewData.month,
            year: viewData.year
        };
    }

    getContrastingTextColor(bgColor) {
        if (!bgColor) return 'white';
        const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const uicolors = [r / 255, g / 255, b / 255];
        const c = uicolors.map((col) => {
            if (col <= 0.03928) {
                return col / 12.92;
            }
            return Math.pow((col + 0.055) / 1.055, 2.4);
        });
        const L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
        return (L > 0.179) ? 'black' : 'white';
    }

    isSelectedDate(date) {
        const selectedDate = this.stateManager?.getState()?.selectedDate;
        return selectedDate && date.toDateString() === selectedDate.toDateString();
    }

    getStyles() {
        return `
            :host {
                display: block;
                height: 100%;
            }

            .month-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--fc-background);
            }

            .month-header {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                background: var(--fc-background);
                border-bottom: 1px solid var(--fc-border-color);
                z-index: 5;
            }

            .month-header-cell {
                padding: var(--fc-spacing-sm);
                text-align: left; /* Align with dates */
                font-weight: var(--fc-font-weight-bold);
                font-size: 10px;
                color: var(--fc-text-light);
                text-transform: uppercase;
                letter-spacing: 0.1em;
                border-left: 1px solid transparent; /* Alignment hack */
                padding-left: 8px;
            }

            .month-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .month-week {
                flex: 1;
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                border-bottom: 1px solid var(--fc-border-color);
            }
            
            .month-week:last-child {
                border-bottom: none;
            }

            .month-day {
                background: var(--fc-background);
                padding: 4px;
                position: relative;
                cursor: default;
                overflow: hidden;
                min-height: 80px;
                border-right: 1px solid var(--fc-border-color);
                display: flex;
                flex-direction: column;
                min-width: 0; /* Critical for Grid Item shrinking */
            }

            .month-day:last-child {
                border-right: none;
            }

            .month-day:hover {
                background: var(--fc-background-alt);
            }

            .month-day.other-month {
                background: var(--fc-background-alt);
                background-image: linear-gradient(45deg, #f9fafb 25%, transparent 25%, transparent 50%, #f9fafb 50%, #f9fafb 75%, transparent 75%, transparent);
                background-size: 10px 10px;
            }

            .month-day.other-month .day-number {
                color: var(--fc-text-light);
                opacity: 0.5;
            }

            .month-day.selected {
                background: var(--fc-background-hover);
            }

            .day-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 4px;
                margin-bottom: 2px;
            }
            
            .day-number {
                font-size: 12px;
                font-family: var(--fc-font-family); /* Ensure monospaced feel if available */
                font-weight: var(--fc-font-weight-medium);
                color: var(--fc-text-color);
                line-height: 1;
            }
            
            .month-day.today .day-number {
                color: white;
                background: var(--fc-danger-color); /* Red for Today (Calendar standard) */
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                margin-left: -4px; /* Optical adjustment */
            }

            .day-events {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 1;
                overflow: hidden;
            }

            /* Precision Event Style */
            .event-item {
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 2px; /* Micro rounding */
                
                /* High Contrast */
                background: var(--fc-primary-color);
                color: white;
                
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                cursor: pointer;
                line-height: 1.3;
                font-weight: var(--fc-font-weight-medium);
                margin: 0 1px;
                border: 1px solid rgba(0,0,0,0.05); /* Subtle border for definition */
            }

            .event-item:hover {
                opacity: 0.9;
            }

            .event-time {
                font-weight: var(--fc-font-weight-bold);
                margin-right: 4px;
                opacity: 0.9;
                font-size: 10px;
            }

            .more-events {
                font-size: 10px;
                color: var(--fc-text-secondary);
                cursor: pointer;
                padding: 1px 4px;
                font-weight: var(--fc-font-weight-medium);
                text-align: right;
            }

            .more-events:hover {
                color: var(--fc-text-color);
                text-decoration: underline;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .month-day {
                    min-height: 60px;
                    padding: 2px;
                }

                .day-number {
                    font-size: 11px;
                }

                .event-item {
                    font-size: 10px;
                    padding: 1px 3px;
                }

                .month-header-cell {
                    font-size: 9px;
                    padding: 4px;
                }
            }

            /* Loading state */
            .month-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--fc-text-secondary);
                font-weight: var(--fc-font-weight-medium);
            }

            /* Empty state */
            .month-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: var(--fc-text-secondary);
                gap: var(--fc-spacing-md);
            }

            .empty-icon {
                width: 48px;
                height: 48px;
                opacity: 0.3;
            }
        `;
    }

    template() {
        if (!this.viewData) {
            return `
                <div class="month-view">
                    <div class="month-loading">Loading calendar...</div>
                </div>
            `;
        }

        return `
            <div class="month-view">
                ${this.renderHeader()}
                ${this.renderBody()}
            </div>
        `;
    }

    renderHeader() {
        const { config } = this.stateManager.getState();
        const days = [];
        const weekStartsOn = config.weekStartsOn || 0;

        for (let i = 0; i < 7; i++) {
            const dayIndex = (weekStartsOn + i) % 7;
            const dayName = DateUtils.getDayAbbreviation(dayIndex, config.locale);
            days.push(`<div class="month-header-cell">${dayName}</div>`);
        }

        return `
            <div class="month-header">
                ${days.join('')}
            </div>
        `;
    }

    renderBody() {
        if (!this.viewData.weeks || this.viewData.weeks.length === 0) {
            return `
                <div class="month-body">
                    <div class="month-empty">
                        <svg class="empty-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                        </svg>
                        <p>No calendar data available</p>
                    </div>
                </div>
            `;
        }

        const weeks = this.viewData.weeks.map(week => this.renderWeek(week));

        return `
            <div class="month-body">
                ${weeks.join('')}
            </div>
        `;
    }

    renderWeek(weekDays) {
        const days = weekDays.map(day => this.renderDay(day));

        return `
            <div class="month-week">
                ${days.join('')}
            </div>
        `;
    }

    renderDay(dayData) {
        const { date, dayOfMonth, isOtherMonth, isToday, isSelected, isWeekend, events = [] } = dayData;
        const dayNumber = dayOfMonth;

        // Build classes
        const classes = ['month-day'];
        if (isOtherMonth) classes.push('other-month');
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        if (isWeekend) classes.push('weekend');

        // Render events
        const visibleEvents = events.slice(0, this.config.maxEventsToShow);
        const remainingCount = events.length - this.config.maxEventsToShow;

        const eventsHtml = visibleEvents.map(event => this.renderEvent(event)).join('');
        const moreHtml = remainingCount > 0 ?
            `<div class="more-events">+${remainingCount} more</div>` : '';

        return `
            <div class="${classes.join(' ')}"
                 data-date="${date.toISOString()}"
                 data-day="${dayNumber}">
                <div class="day-header">
                    <span class="day-number">${dayNumber}</span>
                </div>
                <div class="day-events">
                    ${eventsHtml}
                    ${moreHtml}
                </div>
            </div>
        `;
    }

    renderEvent(event) {
        const { title, start, allDay, backgroundColor, textColor } = event;

        let style = '';
        if (backgroundColor) {
            style += `background-color: ${backgroundColor}; color: ${textColor};`;
        }

        let timeStr = '';
        if (!allDay && start) {
            timeStr = DateUtils.formatTime(new Date(start), false, false);
        }

        const classes = ['event-item'];
        if (allDay) classes.push('all-day');

        return `
            <div class="${classes.join(' ')}"
                 style="${style}"
                 data-event-id="${event.id}"
                 title="${DOMUtils.escapeHTML(title)}">
                ${timeStr ? `<span class="event-time">${timeStr}</span>` : ''}
                <span class="event-title">${DOMUtils.escapeHTML(title)}</span>
            </div>
        `;
    }

    afterRender() {
        // Add click handlers for days
        this.$$('.month-day').forEach(dayEl => {
            dayEl.addEventListener('click', this.handleDayClick.bind(this));
        });

        // Add click handlers for events
        this.$$('.event-item').forEach(eventEl => {
            eventEl.addEventListener('click', this.handleEventClick.bind(this));
        });

        // Add click handlers for "more events"
        this.$$('.more-events').forEach(moreEl => {
            moreEl.addEventListener('click', this.handleMoreClick.bind(this));
        });
    }

    handleDayClick(event) {
        event.stopPropagation();
        const dayEl = event.currentTarget;
        const date = new Date(dayEl.dataset.date);

        this.stateManager.selectDate(date);
        this.emit('day-click', { date });
    }

    handleEventClick(event) {
        event.stopPropagation();
        const eventEl = event.currentTarget;
        const eventId = eventEl.dataset.eventId;
        const calendarEvent = this.stateManager.getEvents().find(e => e.id === eventId);

        if (calendarEvent) {
            this.stateManager.selectEvent(calendarEvent);
            this.emit('event-click', { event: calendarEvent });
        }
    }

    handleMoreClick(event) {
        event.stopPropagation();
        const dayEl = event.currentTarget.closest('.month-day');
        const date = new Date(dayEl.dataset.date);
        const events = this.stateManager.getEventsForDate(date);

        this.emit('more-events-click', { date, events });
    }

    unmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Export both the class and as default
export default MonthView;