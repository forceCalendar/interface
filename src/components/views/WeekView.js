/**
 * WeekView - Professional Time-Grid Week View
 * 
 * Displays a 7-day schedule with a time axis and event positioning.
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { DateUtils } from '../../utils/DateUtils.js';
import { StyleUtils } from '../../utils/StyleUtils.js';
import { DOMUtils } from '../../utils/DOMUtils.js';

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
        // Granular updates
        if (newState.currentDate !== oldState.currentDate || newState.view !== oldState.view) {
            this.loadViewData();
            return;
        }

        if (newState.events !== oldState.events) {
            this.loadViewData(); // Simple reload for now
        }

        if (newState.selectedDate !== oldState.selectedDate) {
            this.updateSelection(newState.selectedDate, oldState.selectedDate);
        }
    }

    updateSelection(newDate, oldDate) {
        // Selection in WeekView is often visual on the column
        if (oldDate) {
            const oldDayEl = this.shadowRoot.querySelector(`[data-date^="${oldDate.toISOString().split('T')[0]}"]`);
            if (oldDayEl) oldDayEl.classList.remove('selected');
        }
        if (newDate) {
            const newDayEl = this.shadowRoot.querySelector(`[data-date^="${newDate.toISOString().split('T')[0]}"]`);
            if (newDayEl) newDayEl.classList.add('selected');
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

        let days = [];
        if (viewData.weeks && viewData.weeks.length > 0) {
            days = viewData.weeks[0].days;
        } else if (viewData.days) {
            days = viewData.days;
        }

        if (!days || days.length === 0) return null;

        return {
            ...viewData,
            days: days.map(day => {
                const dayDate = new Date(day.date);
                return {
                    ...day,
                    date: dayDate,
                    isToday: DateUtils.isToday(dayDate),
                    timedEvents: (day.events || []).filter(e => !e.allDay),
                    allDayEvents: (day.events || []).filter(e => e.allDay)
                };
            })
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

            .week-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--fc-background);
                min-height: 0;
                overflow: hidden;
            }

            /* Header Section */
            .week-header {
                display: grid;
                grid-template-columns: 60px repeat(7, 1fr);
                border-bottom: 1px solid var(--fc-border-color);
                background: var(--fc-background);
                z-index: 20;
                flex-shrink: 0;
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

            /* Body Section */
            .week-body {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                position: relative;
                display: grid;
                grid-template-columns: 60px repeat(7, 1fr);
                background: var(--fc-background);
            }

            .time-gutter {
                border-right: 1px solid var(--fc-border-color);
                background: var(--fc-background-alt);
                height: 1440px;
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
                height: 1440px;
            }

            .day-column.selected {
                background: var(--fc-background-hover);
            }

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

                <div class="week-body" id="scroll-container">
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
        
        const top = startMinutes; 
        const height = Math.max(durationMinutes, 20);
        
        const color = event.backgroundColor || 'var(--fc-primary-color)';
        const textColor = StyleUtils.getContrastColor(color);

        return `
            <div class="event-container" 
                 style="top: ${top}px; height: ${height}px; background-color: ${color}; color: ${textColor};"
                 data-event-id="${event.id}">
                <span class="event-title">${DOMUtils.escapeHTML(event.title)}</span>
                <span class="event-time">${DateUtils.formatTime(start)}</span>
            </div>
        `;
    }

    renderNowIndicator() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        return \`<div class="now-indicator" style="top: \${minutes}px"></div>\`;
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

        this.$$('.day-column').forEach(el => {
            el.addEventListener('click', (e) => {
                const container = this.$('#scroll-container');
                const rect = el.getBoundingClientRect();
                const y = e.clientY - rect.top + (container ? container.scrollTop : 0);
                
                const date = new Date(el.dataset.date);
                date.setHours(Math.floor(y / 60), Math.floor(y % 60), 0, 0);
                
                this.stateManager.selectDate(date);
                this.emit('day-click', { date });
            });
        });
    }

    unmount() {
        if (this.unsubscribe) this.unsubscribe();
    }
}

export default WeekView;
