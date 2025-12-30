/**
 * WeekView - Professional Time-Grid Week View
 * 
 * Displays a 7-day schedule with a time axis and event positioning.
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { StyleUtils } from '../../utils/StyleUtils.js';

export class WeekView extends BaseComponent {
    constructor() {
        super();
        this._stateManager = null;
        this.viewData = null;
        this.hours = Array.from({ length: 24 }, (_, i) => i); // 0-23
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

        // Core can return data in 'weeks' (for month) or 'days' (for week/day)
        let days = [];
        if (viewData.weeks && viewData.weeks.length > 0) {
            days = viewData.weeks[0].days;
        } else if (viewData.days) {
            days = viewData.days;
        }

        if (!days || days.length === 0) return null;

        return {
            ...viewData,
            days: days.map(day => ({
                ...day,
                date: new Date(day.date),
                isToday: DateUtils.isToday(new Date(day.date)),
                timedEvents: (day.events || []).filter(e => !e.allDay),
                allDayEvents: (day.events || []).filter(e => e.allDay)
            }))
        };
    }

    getStyles() {
        return `
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                min-height: 0; /* Allow shrinking */
            }

            .week-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--fc-background);
                min-height: 0;
                overflow: hidden; /* Prevent outer overflow */
            }

            /* Header Section */
            .week-header {
                display: grid;
                grid-template-columns: 60px repeat(7, 1fr);
                border-bottom: 1px solid var(--fc-border-color);
                background: var(--fc-background);
                z-index: 20;
                flex-shrink: 0; /* Prevent header from shrinking */
            }

            .time-gutter-header {
                border-right: 1px solid var(--fc-border-color);
            }

            .day-column-header {
                padding: 12px 8px;
                text-align: center;
                border-right: 1px solid var(--fc-border-color);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }

            .day-name {
                font-size: 10px;
                font-weight: 700;
                color: var(--fc-text-light);
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }

            .day-number {
                font-size: 16px;
                font-weight: 500;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                color: var(--fc-text-color);
            }

            .is-today .day-number {
                background: var(--fc-danger-color);
                color: white;
                font-weight: 700;
            }

            /* All Day Events Row */
            .all-day-row {
                display: grid;
                grid-template-columns: 60px repeat(7, 1fr);
                border-bottom: 1px solid var(--fc-border-color);
                background: var(--fc-background-alt);
                min-height: 32px;
                flex-shrink: 0; /* Prevent all-day row from shrinking */
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

            /* Scrollable Body */
            .week-body {
                flex: 1;
                overflow-y: auto; /* Changed to auto for better scroll detection */
                overflow-x: hidden;
                position: relative;
                display: grid;
                grid-template-columns: 60px repeat(7, 1fr);
                background: var(--fc-background);
                scroll-behavior: smooth;
                -webkit-overflow-scrolling: touch;
                min-height: 0;
                max-height: 100%; /* Ensure it doesn't exceed parent */
            }

            .time-gutter {
                border-right: 1px solid var(--fc-border-color);
                background: var(--fc-background-alt);
                height: 1440px; /* Force height matching day columns */
            }

            .time-slot-label {
                height: 60px;
                font-size: 10px;
                color: var(--fc-text-light);
                text-align: right;
                padding-right: 8px;
                font-weight: 500;
            }

            .day-column {
                border-right: 1px solid var(--fc-border-color);
                position: relative;
                height: 1440px; /* 24 hours * 60px */
            }

            /* Scrollbar styling */
            .week-body::-webkit-scrollbar {
                width: 8px;
            }
            .week-body::-webkit-scrollbar-track {
                background: var(--fc-background-alt);
            }
            .week-body::-webkit-scrollbar-thumb {
                background: var(--fc-border-color);
                border-radius: 4px;
            }
            .week-body::-webkit-scrollbar-thumb:hover {
                background: var(--fc-text-light);
            }

            /* Grid Lines Layer */
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
            
            .grid-line:last-child {
                border-bottom: none;
            }

            /* Event Positioning */
            .event-container {
                position: absolute;
                left: 2px;
                right: 2px;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 500;
                color: white;
                background: var(--fc-primary-color);
                border: 1px solid rgba(0,0,0,0.1);
                overflow: hidden;
                box-shadow: var(--fc-shadow-sm);
                cursor: pointer;
                transition: transform 0.1s;
                z-index: 5;
            }

            .event-container:hover {
                z-index: 10;
                transform: scale(1.02);
                filter: brightness(0.95);
            }

            .event-title {
                display: block;
                font-weight: 700;
                margin-bottom: 2px;
            }

            .event-time {
                opacity: 0.9;
                font-size: 10px;
            }

            /* Today indicator line */
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
        if (!this.viewData) return '<div class="week-view">Loading...</div>';

        return `
            <div class="week-view">
                <div class="week-header">
                    <div class="time-gutter-header"></div>
                    ${this.viewData.days.map(day => `
                        <div class="day-column-header ${day.isToday ? 'is-today' : ''}">
                            <span class="day-name">${DateUtils.getDayAbbreviation(day.date.getDay())}</span>
                            <span class="day-number">${day.date.getDate()}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="all-day-row">
                    <div class="all-day-label">All day</div>
                    ${this.viewData.days.map(day => `
                        <div class="all-day-cell">
                            ${day.allDayEvents.map(e => this.renderAllDayEvent(e)).join('')}
                        </div>
                    `).join('')}
                </div>

                <div class="week-body" id="scroll-container">
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

                    ${this.viewData.days.map(day => `
                        <div class="day-column" data-date="${day.date.toISOString()}">
                            ${day.isToday ? this.renderNowIndicator() : ''}
                            ${day.timedEvents.map(e => this.renderTimedEvent(e)).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTimedEvent(event) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const durationMinutes = (end - start) / (1000 * 60);
        
        const top = startMinutes; // 1px per minute (60px per hour)
        const height = Math.max(durationMinutes, 20); // Min height 20px
        
        const color = event.backgroundColor || 'var(--fc-primary-color)';
        const textColor = StyleUtils.getContrastColor(color);

        return `
            <div class="event-container" 
                 style="top: ${top}px; height: ${height}px; background-color: ${color}; color: ${textColor};"
                 data-event-id="${event.id}">
                <span class="event-time">${DateUtils.formatTime(start)}</span>
                <span class="event-title">${this.escapeHtml(event.title)}</span>
            </div>
        `;
    }

    renderAllDayEvent(event) {
        const color = event.backgroundColor || 'var(--fc-primary-color)';
        const textColor = StyleUtils.getContrastColor(color);
        
        return `
            <div class="event-item" 
                 style="background-color: ${color}; color: ${textColor}; font-size: 10px; padding: 2px 4px; border-radius: 2px; cursor: pointer;"
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
            // Scroll to 8 AM by default
            container.scrollTop = 8 * 60 - 50;
            this._scrolled = true;
        }

        // Event listeners
        this.$$('[data-event-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventId = el.dataset.eventId;
                const event = this.stateManager.getEvents().find(ev => ev.id === eventId);
                if (event) this.emit('event-click', { event });
            });
        });

        this.$$('.day-column').forEach(el => {
            el.addEventListener('click', (e) => {
                const container = this.$('#scroll-container');
                const rect = el.getBoundingClientRect();
                const y = e.clientY - rect.top + (container ? container.scrollTop : 0);
                const totalMinutes = y;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = Math.floor(totalMinutes % 60);
                
                const date = new Date(el.dataset.date);
                date.setHours(hours, minutes, 0, 0);
                
                this.emit('day-click', { date });
            });
        });
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

export default WeekView;
