/**
 * DayView - Professional Time-Grid Day View
 * 
 * Displays a single day schedule with a time axis and event positioning.
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { StyleUtils } from '../../utils/StyleUtils.js';

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
        const relevantKeys = ['currentDate', 'events', 'selectedDate', 'config'];
        const hasRelevantChange = relevantKeys.some(key => newState[key] !== oldState?.[key]);

        if (hasRelevantChange) {
            this.loadViewData();
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

        // Strategy 1: Look for 'days' array (standard for day/week views)
        if (viewData.days && Array.isArray(viewData.days) && viewData.days.length > 0) {
            // Try to find the day matching current selection, otherwise take first
            dayData = viewData.days.find(d => DateUtils.isSameDay(new Date(d.date), currentDate)) || viewData.days[0];
        } 
        // Strategy 2: Look for 'weeks' array (common if core defaults to month shape)
        else if (viewData.weeks && Array.isArray(viewData.weeks) && viewData.weeks.length > 0) {
            const allDays = viewData.weeks.flatMap(w => w.days || []);
            dayData = allDays.find(d => DateUtils.isSameDay(new Date(d.date), currentDate)) || allDays[0];
        }
        // Strategy 3: Check if viewData itself is the day object
        else if (viewData.date) {
            dayData = viewData;
        }

        if (!dayData) {
            console.warn('DayView: Could not extract day data from viewData', viewData);
            return null;
        }

        try {
            return {
                ...viewData,
                day: {
                    ...dayData,
                    date: new Date(dayData.date),
                    isToday: DateUtils.isToday(new Date(dayData.date)),
                    timedEvents: (dayData.events || []).filter(e => !e.allDay),
                    allDayEvents: (dayData.events || []).filter(e => e.allDay)
                }
            };
        } catch (e) {
            console.error('DayView: Error processing day data', e);
            return null;
        }
    }

    getStyles() {
        return `
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow: hidden;
                min-height: 0;
            }

            .day-view {
                display: flex;
                flex-direction: column;
                flex: 1;
                background: var(--fc-background);
                overflow: hidden;
                min-height: 0;
            }

            /* Header Section */
            .day-header {
                display: grid;
                grid-template-columns: 60px 1fr;
                border-bottom: 1px solid var(--fc-border-color);
                background: var(--fc-background);
                z-index: 20;
                flex-shrink: 0;
            }

            .time-gutter-header {
                border-right: 1px solid var(--fc-border-color);
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

            .day-number-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
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

            /* Scrollable Body */
            .day-body {
                flex: 1;
                overflow-y: scroll;
                position: relative;
                display: grid;
                grid-template-columns: 60px 1fr;
                background: var(--fc-background);
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
                min-height: 0;
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

            /* Scrollbar styling */
            .day-body::-webkit-scrollbar {
                width: 8px;
            }
            .day-body::-webkit-scrollbar-track {
                background: var(--fc-background-alt);
            }
            .day-body::-webkit-scrollbar-thumb {
                background: var(--fc-border-color);
                border-radius: 4px;
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
                filter: brightness(0.95);
            }

            .event-title {
                display: block;
                font-weight: 700;
                margin-bottom: 4px;
                font-size: 14px;
            }

            .event-time {
                opacity: 0.9;
                font-size: 11px;
                font-weight: 600;
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

            .now-indicator::before {
                content: '';
                position: absolute;
                left: -4px;
                top: -3px;
                width: 8px;
                height: 8px;
                background: var(--fc-danger-color);
                border-radius: 50%;
            }
        `;
    }

    template() {
        if (!this.viewData || !this.viewData.day) {
            return '<div class="day-view" style="padding: 20px; color: var(--fc-text-light);">No data available for this day.</div>';
        }

        const { day } = this.viewData;
        const locale = this.stateManager?.state?.config?.locale || 'en-US';
        
        let dayName = 'Day';
        try {
            dayName = DateUtils.formatDate(day.date, 'day', locale).split(' ')[0];
        } catch (e) {
            console.warn('DayView: Could not format day name', e);
        }

        return `
            <div class="day-view">
                <div class="day-header">
                    <div class="time-gutter-header"></div>
                    <div class="day-column-header ${day.isToday ? 'is-today' : ''}">
                        <span class="day-name">${dayName}</span>
                        <div class="day-number-wrapper">
                            <span class="day-number">${day.date.getDate()}</span>
                        </div>
                    </div>
                </div>

                <div class="all-day-row">
                    <div class="all-day-label">All day</div>
                    <div class="all-day-cell">
                        ${(day.allDayEvents || []).map(e => this.renderAllDayEvent(e)).join('')}
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
                        ${(day.timedEvents || []).map(e => this.renderTimedEvent(e)).join('')}
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
        
        const color = event.backgroundColor || 'var(--fc-primary-color)';
        const textColor = StyleUtils.getContrastColor(color);

        return `
            <div class="event-container" 
                 style="top: ${top}px; height: ${height}px; background-color: ${color}; color: ${textColor};"
                 data-event-id="${event.id}">
                <span class="event-time">${DateUtils.formatTime(start)} - ${DateUtils.formatTime(end)}</span>
                <span class="event-title">${this.escapeHtml(event.title)}</span>
            </div>
        `;
    }

    renderAllDayEvent(event) {
        const color = event.backgroundColor || 'var(--fc-primary-color)';
        const textColor = StyleUtils.getContrastColor(color);
        
        return `
            <div class="event-item" 
                 style="background-color: ${color}; color: ${textColor}; font-size: 12px; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 500;"
                 data-event-id="${event.id}">
                ${this.escapeHtml(event.title)}
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
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = el.dataset.eventId;
                const event = this.stateManager.getEvents().find(ev => ev.id === eventId);
                if (event) this.emit('event-click', { event });
            });
        });

        const dayCol = this.$('.day-column');
        if (dayCol) {
            dayCol.addEventListener('click', (e) => {
                const container = this.$('#scroll-container');
                const rect = dayCol.getBoundingClientRect();
                const y = e.clientY - rect.top + (container ? container.scrollTop : 0);
                const hours = Math.floor(y / 60);
                const minutes = Math.floor(y % 60);
                
                const date = new Date(dayCol.dataset.date);
                date.setHours(hours, minutes, 0, 0);
                
                this.emit('day-click', { date });
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    unmount() {
        if (this.unsubscribe) this.unsubscribe();
    }
}

export default DayView;
