/**
 * DayView - Professional Time-Grid Day View
 * 
 * Displays a single day schedule with a time axis and event positioning.
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { StyleUtils } from '../../utils/StyleUtils.js';
import { DOMUtils } from '../../utils/DOMUtils.js';

export class DayView extends BaseComponent {
    constructor() {
        super();
        this._stateManager = null;
        this.viewData = null;
        this.hours = Array.from({ length: 24 }, (_, i) => i);
    }

    set stateManager(manager) {
        this._stateManager = manager;
        if (manager) {
            this.unsubscribe = manager.subscribe(this.handleStateUpdate.bind(this));
            this.loadViewData();
        }
    }

    get stateManager() {
        return this._stateManager;
    }

    handleStateUpdate(newState, oldState) {
        // Granular updates
        if (newState.currentDate !== oldState?.currentDate || newState.view !== oldState?.view) {
            this.loadViewData();
            return;
        }

        if (newState.events !== oldState?.events) {
            this.loadViewData(); // Simple reload for now
        }

        if (newState.selectedDate !== oldState?.selectedDate) {
            this.updateSelection(newState.selectedDate, oldState?.selectedDate);
        }
    }

    updateSelection(newDate, oldDate) {
        const dayCol = this.shadowRoot.querySelector('.day-column');
        if (!dayCol) return;

        const isMatch = (date) => date && DateUtils.isSameDay(date, new Date(dayCol.dataset.date));
        
        if (isMatch(newDate)) {
            dayCol.classList.add('selected');
        } else {
            dayCol.classList.remove('selected');
        }
    }

    loadViewData() {
        if (!this.stateManager) return;
        const viewData = this.stateManager.getViewData();
        this.viewData = this.processViewData(viewData);
        this.render();
    }

    processViewData(viewData) {
        if (!viewData) return null;

        let dayData = null;
        const currentState = this.stateManager?.getState();
        const currentDate = currentState?.currentDate || new Date();

        if (viewData.days && Array.isArray(viewData.days) && viewData.days.length > 0) {
            dayData = viewData.days.find(d => DateUtils.isSameDay(new Date(d.date), currentDate)) || viewData.days[0];
        } 
        else if (viewData.weeks && Array.isArray(viewData.weeks) && viewData.weeks.length > 0) {
            const allDays = viewData.weeks.flatMap(w => w.days || []);
            dayData = allDays.find(d => DateUtils.isSameDay(new Date(d.date), currentDate)) || allDays[0];
        }
        else if (viewData.date) {
            dayData = viewData;
        }

        if (!dayData) return null;

        const dayDate = new Date(dayData.date);
        return {
            ...viewData,
            day: {
                ...dayData,
                date: dayDate,
                isToday: DateUtils.isToday(dayDate),
                timedEvents: (dayData.events || []).filter(e => !e.allDay),
                allDayEvents: (dayData.events || []).filter(e => e.allDay)
            }
        };
    }

    getStyles() {
        return `
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 0;
            }

            .day-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--fc-background);
                min-height: 0;
                overflow: hidden;
            }

            /* Header */
            .day-header {
                display: grid;
                grid-template-columns: 60px 1fr;
                border-bottom: 1px solid var(--fc-border-color);
                background: var(--fc-background);
                z-index: 20;
                flex-shrink: 0;
            }

            .day-column-header {
                padding: 16px 24px;
                text-align: left;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .day-name {
                font-size: 12px;
                font-weight: 700;
                color: var(--fc-text-light);
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }

            .day-number {
                font-size: 24px;
                font-weight: 600;
                color: var(--fc-text-color);
            }

            .is-today .day-number {
                color: var(--fc-danger-color);
            }

            /* All Day Events */
            .all-day-row {
                display: grid;
                grid-template-columns: 60px 1fr;
                border-bottom: 1px solid var(--fc-border-color);
                background: var(--fc-background-alt);
                min-height: 36px;
                flex-shrink: 0;
            }

            .all-day-label {
                font-size: 9px;
                color: var(--fc-text-light);
                display: flex;
                align-items: center;
                justify-content: center;
                border-right: 1px solid var(--fc-border-color);
                text-transform: uppercase;
                font-weight: 700;
            }

            .all-day-cell {
                padding: 6px 12px;
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            /* Body */
            .day-body {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                position: relative;
                display: grid;
                grid-template-columns: 60px 1fr;
                background: var(--fc-background);
            }

            .time-gutter {
                border-right: 1px solid var(--fc-border-color);
                background: var(--fc-background-alt);
                height: 1440px;
            }

            .time-slot-label {
                height: 60px;
                font-size: 11px;
                color: var(--fc-text-light);
                text-align: right;
                padding-right: 12px;
                font-weight: 500;
            }

            .day-column {
                position: relative;
                height: 1440px;
            }

            .day-column.selected {
                background: var(--fc-background-hover);
            }

            /* Grid Lines */
            .grid-lines {
                position: absolute;
                top: 0;
                left: 60px;
                right: 0;
                bottom: 0;
                pointer-events: none;
            }

            .grid-line {
                height: 60px;
                border-bottom: 1px solid var(--fc-border-color);
                width: 100%;
            }

            /* Event Style */
            .event-container {
                position: absolute;
                left: 12px;
                right: 24px;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 13px;
                font-weight: 500;
                color: white;
                background: var(--fc-primary-color);
                border: 1px solid rgba(0,0,0,0.1);
                overflow: hidden;
                box-shadow: var(--fc-shadow);
                cursor: pointer;
                transition: all 0.15s ease;
                z-index: 5;
            }

            .event-container:hover {
                z-index: 10;
                transform: translateX(4px);
            }

            .now-indicator {
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--fc-danger-color);
                z-index: 15;
                pointer-events: none;
            }
        `;
    }

    template() {
        if (!this.viewData || !this.viewData.day) {
            return '<div class="day-view" style="padding: 20px; color: var(--fc-text-light);">No data available.</div>';
        }

        const { day } = this.viewData;
        const locale = this.stateManager?.state?.config?.locale || 'en-US';
        const dayName = DateUtils.formatDate(day.date, 'day', locale).split(' ')[0];

        return `
            <div class="day-view">
                <div class="day-header">
                    <div class="time-gutter-header"></div>
                    <div class="day-column-header ${day.isToday ? 'is-today' : ''}">
                        <span class="day-name">${dayName}</span>
                        <span class="day-number">${day.date.getDate()}</span>
                    </div>
                </div>

                <div class="all-day-row">
                    <div class="all-day-label">All day</div>
                    <div class="all-day-cell">
                        ${day.allDayEvents.map(e => this.renderAllDayEvent(e)).join('')}
                    </div>
                </div>

                <div class="day-body" id="scroll-container">
                    <div class="grid-lines">
                        ${this.hours.map(() => `<div class="grid-line"></div>`).join('')}
                    </div>

                    <div class="time-gutter">
                        ${this.hours.map(h => `
                            <div class="time-slot-label">
                                ${h === 0 ? '' : DateUtils.formatTime(new Date().setHours(h, 0), false)}
                            </div>
                        `).join('')}
                    </div>

                    <div class="day-column" data-date="${day.date.toISOString()}">
                        ${day.isToday ? this.renderNowIndicator() : ''}
                        ${day.timedEvents.map(e => this.renderTimedEvent(e)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderTimedEvent(event) {
        const start = new Date(event.start);
        const end = new Date(event.end);

        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const durationMinutes = (end - start) / (1000 * 60);

        const top = startMinutes;
        const height = Math.max(durationMinutes, 30);

        const color = StyleUtils.sanitizeColor(event.backgroundColor);
        const textColor = StyleUtils.sanitizeColor(StyleUtils.getContrastColor(color), 'white');

        return `
            <div class="event-container"
                 style="top: ${top}px; height: ${height}px; background-color: ${color}; color: ${textColor};"
                 data-event-id="${event.id}">
                <span class="event-title">${DOMUtils.escapeHTML(event.title)}</span>
                <span class="event-time">${DateUtils.formatTime(start)} - ${DateUtils.formatTime(end)}</span>
            </div>
        `;
    }

    renderAllDayEvent(event) {
        const color = StyleUtils.sanitizeColor(event.backgroundColor);
        const textColor = StyleUtils.sanitizeColor(StyleUtils.getContrastColor(color), 'white');

        return `
            <div class="event-item"
                 style="background-color: ${color}; color: ${textColor}; font-size: 12px; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 500; margin-bottom: 2px;"
                 data-event-id="${event.id}">
                ${DOMUtils.escapeHTML(event.title)}
            </div>
        `;
    }

    renderNowIndicator() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        return `<div class="now-indicator" style="top: ${minutes}px"></div>`;
    }

    afterRender() {
        const container = this.$('#scroll-container');
        if (container && !this._scrolled) {
            container.scrollTop = 8 * 60 - 50;
            this._scrolled = true;
        }

        this.$$('[data-event-id]').forEach(el => {
            this.addListener(el, 'click', (e) => {
                e.stopPropagation();
                const eventId = e.currentTarget.dataset.eventId;
                const event = this.stateManager.getEvents().find(ev => ev.id === eventId);
                if (event) this.emit('event-click', { event });
            });
        });

        const dayCol = this.$('.day-column');
        if (dayCol) {
            this.addListener(dayCol, 'click', (e) => {
                const col = e.currentTarget;
                const container = this.$('#scroll-container');
                const rect = col.getBoundingClientRect();
                const y = e.clientY - rect.top + (container ? container.scrollTop : 0);
                
                const date = new Date(col.dataset.date);
                date.setHours(Math.floor(y / 60), Math.floor(y % 60), 0, 0);
                
                this.stateManager.selectDate(date);
                this.emit('day-click', { date });
            });
        }
    }

    unmount() {
        if (this.unsubscribe) this.unsubscribe();
    }
}

export default DayView;
