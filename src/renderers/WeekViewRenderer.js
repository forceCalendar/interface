/**
 * WeekViewRenderer - Renders week calendar view
 *
 * Pure JavaScript renderer for week view, compatible with Salesforce Locker Service.
 */

import { BaseViewRenderer } from './BaseViewRenderer.js';

export class WeekViewRenderer extends BaseViewRenderer {
  constructor(container, stateManager) {
    super(container, stateManager);
    this.hourHeight = 60; // pixels per hour
    this.totalHeight = 24 * this.hourHeight; // 1440px for 24 hours
  }

  render() {
    if (!this.container || !this.stateManager) return;

    const viewData = this.stateManager.getViewData();
    if (!viewData || !viewData.days || viewData.days.length === 0) {
      this.container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--fc-text-secondary);">No data available for week view.</div>';
      return;
    }

    this.cleanup();
    this._scrolled = false;
    const config = this.stateManager.getState().config;
    const html = this._renderWeekView(viewData, config);
    this.container.innerHTML = html;
    this._attachEventHandlers();
    this._scrollToCurrentTime();
  }

  _renderWeekView(viewData, _config) {
    const days = viewData.days;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Process days to categorize events
    const processedDays = days.map(day => {
      const dayDate = new Date(day.date);
      const events = day.events || [];
      return {
        ...day,
        date: dayDate,
        dayName: dayNames[dayDate.getDay()],
        dayOfMonth: dayDate.getDate(),
        isToday: this.isToday(dayDate),
        timedEvents: events.filter(e => !e.allDay),
        allDayEvents: events.filter(e => e.allDay)
      };
    });

    return `
            <div class="fc-week-view" style="display: flex; flex-direction: column; height: 100%; background: var(--fc-background); overflow: hidden;">
                ${this._renderHeader(processedDays)}
                ${this._renderAllDayRow(processedDays)}
                ${this._renderTimeGrid(processedDays, hours)}
            </div>
        `;
  }

  _renderHeader(days) {
    return `
            <div class="fc-week-header" style="display: grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom: 1px solid var(--fc-border-color); background: var(--fc-background-alt); flex-shrink: 0;">
                <div style="border-right: 1px solid var(--fc-border-color);"></div>
                ${days
                  .map(
                    day => `
                    <div style="padding: 12px 8px; text-align: center; border-right: 1px solid var(--fc-border-color);">
                        <div style="font-size: 10px; font-weight: 700; color: var(--fc-text-light); text-transform: uppercase; letter-spacing: 0.1em;">
                            ${day.dayName}
                        </div>
                        <div style="font-size: 16px; font-weight: 500; margin-top: 4px; ${day.isToday ? 'background: var(--fc-danger-color); color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;' : 'color: var(--fc-text-color);'}">
                            ${day.dayOfMonth}
                        </div>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  _renderAllDayRow(days) {
    return `
            <div class="fc-all-day-row" style="display: grid; grid-template-columns: 60px repeat(7, 1fr); border-bottom: 1px solid var(--fc-border-color); background: var(--fc-background-alt); min-height: 32px; flex-shrink: 0;">
                <div style="font-size: 9px; color: var(--fc-text-light); display: flex; align-items: center; justify-content: center; border-right: 1px solid var(--fc-border-color); text-transform: uppercase; font-weight: 700;">
                    All day
                </div>
                ${days
                  .map(
                    day => `
                    <div class="fc-all-day-cell" data-date="${day.date.toISOString()}" style="border-right: 1px solid var(--fc-border-color); padding: 4px; display: flex; flex-direction: column; gap: 2px;">
                        ${day.allDayEvents
                          .map(
                            evt => `
                            <div class="fc-event fc-all-day-event" data-event-id="${this.escapeHTML(evt.id)}"
                                 style="background-color: ${this.getEventColor(evt)}; font-size: 10px; padding: 2px 4px; border-radius: 2px; color: white; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${this.escapeHTML(evt.title)}
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  _renderTimeGrid(days, hours) {
    return `
            <div id="week-scroll-container" class="fc-time-grid-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; position: relative;">
                <div class="fc-time-grid" style="display: grid; grid-template-columns: 60px repeat(7, 1fr); position: relative; height: ${this.totalHeight}px;">
                    ${this._renderTimeGutter(hours)}
                    ${days.map(day => this._renderDayColumn(day, hours)).join('')}
                </div>
            </div>
        `;
  }

  _renderTimeGutter(hours) {
    return `
            <div class="fc-time-gutter" style="border-right: 1px solid var(--fc-border-color); background: var(--fc-background-alt);">
                ${hours
                  .map(
                    h => `
                    <div style="height: ${this.hourHeight}px; font-size: 10px; color: var(--fc-text-light); text-align: right; padding-right: 8px; font-weight: 500;">
                        ${h === 0 ? '' : this.formatHour(h)}
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  _renderDayColumn(day, hours) {
    return `
            <div class="fc-week-day-column" data-date="${day.date.toISOString()}" style="border-right: 1px solid var(--fc-border-color); position: relative; cursor: pointer;">
                <!-- Hour grid lines -->
                ${hours.map(() => `<div style="height: ${this.hourHeight}px; border-bottom: 1px solid var(--fc-background-hover);"></div>`).join('')}

                <!-- Now indicator for today -->
                ${day.isToday ? this.renderNowIndicator() : ''}

                <!-- Timed events -->
                ${(() => {
                  const layout = this.computeOverlapLayout(day.timedEvents);
                  return day.timedEvents.map(evt => this.renderTimedEvent(evt, { compact: true, overlapLayout: layout })).join('');
                })()}
            </div>
        `;
  }

  _attachEventHandlers() {
    this.addListener(this.container, 'click', e => {
      const dayEl = e.target.closest('.fc-week-day-column');
      if (!dayEl || !this.container.contains(dayEl)) return;
      if (e.target.closest('.fc-event')) return;

      const date = new Date(dayEl.dataset.date);
      const scrollContainer = this.container.querySelector('#week-scroll-container');
      const gridTop = dayEl.offsetTop;
      const y = e.clientY - dayEl.getBoundingClientRect().top + (scrollContainer ? scrollContainer.scrollTop : 0) - gridTop;

      // Calculate time from click position within the 1440px time grid
      const clampedY = Math.max(0, Math.min(y + gridTop, this.totalHeight));
      date.setHours(
        Math.floor(clampedY / this.hourHeight),
        Math.floor((clampedY % this.hourHeight) / (this.hourHeight / 60)),
        0,
        0
      );
      this.stateManager.selectDate(date);
    });

    // Common event handlers (event clicks)
    this.attachCommonEventHandlers();
  }

  _scrollToCurrentTime() {
    if (this._scrolled) return;

    const scrollContainer = this.container.querySelector('#week-scroll-container');
    if (scrollContainer) {
      // Scroll to 8 AM, minus some offset for visibility
      scrollContainer.scrollTop = 8 * this.hourHeight - 50;
      this._scrolled = true;
    }
  }
}

export default WeekViewRenderer;
