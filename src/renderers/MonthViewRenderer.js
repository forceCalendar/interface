/**
 * MonthViewRenderer - Renders month calendar grid
 *
 * Pure JavaScript renderer for month view, compatible with Salesforce Locker Service.
 */

import { BaseViewRenderer } from './BaseViewRenderer.js';
import { DateUtils } from '../utils/DateUtils.js';

export class MonthViewRenderer extends BaseViewRenderer {
  constructor(container, stateManager) {
    super(container, stateManager);
    this.maxEventsToShow = 3;
  }

  render() {
    if (!this.container || !this.stateManager) return;

    const viewData = this.stateManager.getViewData();
    if (!viewData || !viewData.weeks) {
      this.container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--fc-text-secondary);">No data available for month view.</div>';
      return;
    }

    this.cleanup();
    const config = this.stateManager.getState().config;
    const html = this._renderMonthView(viewData, config);
    this.container.innerHTML = html;
    this._attachEventHandlers();
  }

  _renderMonthView(viewData, config) {
    const weekStartsOn = config.weekStartsOn || 0;
    const dayNames = this._getDayNames(weekStartsOn);

    let html = `
            <div class="fc-month-view" style="display: flex; flex-direction: column; height: 100%; min-height: 400px; background: var(--fc-background); border: 1px solid var(--fc-border-color);">
                <div class="fc-month-header" style="display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--fc-border-color); background: var(--fc-background-alt);">
                    ${dayNames.map(d => `<div class="fc-month-header-cell" style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: 600; color: var(--fc-text-light); text-transform: uppercase;">${this.escapeHTML(d)}</div>`).join('')}
                </div>
                <div class="fc-month-body" style="display: flex; flex-direction: column; flex: 1;">
        `;

    viewData.weeks.forEach(week => {
      html += this._renderWeek(week);
    });

    html += '</div></div>';
    return html;
  }

  _getDayNames(weekStartsOn) {
    const locale = this.stateManager.getState().config.locale || 'en-US';
    const dayNames = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (weekStartsOn + i) % 7;
      dayNames.push(DateUtils.getDayAbbreviation(dayIndex, locale));
    }
    return dayNames;
  }

  _renderWeek(week) {
    let html =
      '<div class="fc-month-week" style="display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; min-height: 80px;">';

    week.days.forEach(day => {
      html += this._renderDay(day);
    });

    html += '</div>';
    return html;
  }

  _renderDay(day) {
    const isOtherMonth = !day.isCurrentMonth;
    const isToday = day.isToday;

    const dayBg = isOtherMonth ? 'var(--fc-background-hover)' : 'var(--fc-background)';
    const dayNumColor = isOtherMonth ? 'var(--fc-text-light)' : 'var(--fc-text-color)';
    const todayStyle = isToday
      ? 'background: var(--fc-primary-color); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;'
      : '';

    const events = day.events || [];
    const visibleEvents = events.slice(0, this.maxEventsToShow);
    const moreCount = events.length - this.maxEventsToShow;

    return `
            <div class="fc-month-day" data-date="${this.escapeHTML(day.date)}"
                 style="background: ${dayBg}; border-right: 1px solid var(--fc-border-color); border-bottom: 1px solid var(--fc-border-color); padding: 4px; min-height: 80px; cursor: pointer; display: flex; flex-direction: column;">
                <div class="fc-day-number" style="font-size: 13px; font-weight: 500; color: ${dayNumColor}; padding: 2px 4px; margin-bottom: 4px; ${todayStyle}">
                    ${this.escapeHTML(String(day.dayOfMonth))}
                </div>
                <div class="fc-day-events" style="display: flex; flex-direction: column; gap: 2px; flex: 1; overflow: hidden;">
                    ${visibleEvents.map(evt => this._renderEvent(evt)).join('')}
                    ${moreCount > 0 ? `<div class="fc-more-events" style="font-size: 10px; color: var(--fc-text-light); padding: 2px 4px; font-weight: 500;">+${moreCount} more</div>` : ''}
                </div>
            </div>
        `;
  }

  _renderEvent(event) {
    const color = this.getEventColor(event);
    return `
            <div class="fc-event" data-event-id="${this.escapeHTML(event.id)}"
                 style="background-color: ${color}; font-size: 11px; padding: 2px 6px; border-radius: 3px; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">
                ${this.escapeHTML(event.title)}
            </div>
        `;
  }

  _attachEventHandlers() {
    this.addListener(this.container, 'click', e => {
      const dayEl = e.target.closest('.fc-month-day');
      if (!dayEl || !this.container.contains(dayEl)) return;
      if (e.target.closest('.fc-event')) return;

      const date = new Date(dayEl.dataset.date);
      this.stateManager.selectDate(date);
    });

    // Common event handlers (event clicks)
    this.attachCommonEventHandlers();
  }
}

export default MonthViewRenderer;
