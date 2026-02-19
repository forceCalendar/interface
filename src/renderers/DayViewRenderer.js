/**
 * DayViewRenderer - Renders single day calendar view
 *
 * Pure JavaScript renderer for day view, compatible with Salesforce Locker Service.
 */

import { BaseViewRenderer } from './BaseViewRenderer.js';

export class DayViewRenderer extends BaseViewRenderer {
  constructor(container, stateManager) {
    super(container, stateManager);
    this.hourHeight = 60; // pixels per hour
    this.totalHeight = 24 * this.hourHeight; // 1440px for 24 hours
  }

  render() {
    if (!this.container || !this.stateManager) return;

    const viewData = this.stateManager.getViewData();
    if (!viewData) {
      this.container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: #666;">No data available for day view.</div>';
      return;
    }

    this.cleanup();
    const config = this.stateManager.getState().config;
    const html = this._renderDayView(viewData, config);
    this.container.innerHTML = html;
    this._attachEventHandlers();
    this._scrollToCurrentTime();
  }

  _renderDayView(viewData, _config) {
    const currentDate = this.stateManager?.getState()?.currentDate || new Date();
    const dayData = this._extractDayData(viewData, currentDate);

    if (!dayData) {
      return '<div style="padding: 20px; text-align: center; color: #666;">No data available for day view.</div>';
    }

    const { dayDate, dayName, isToday, allDayEvents, timedEvents } = dayData;
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return `
            <div class="fc-day-view" style="display: flex; flex-direction: column; height: 100%; background: #fff; overflow: hidden;">
                ${this._renderHeader(dayDate, dayName, isToday)}
                ${this._renderAllDayRow(allDayEvents, dayDate)}
                ${this._renderTimeGrid(timedEvents, isToday, dayDate, hours)}
            </div>
        `;
  }

  _extractDayData(viewData, currentDate) {
    let dayDate, dayName, isToday, allDayEvents, timedEvents;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (viewData.type === 'day' && viewData.date) {
      // Core day view structure
      dayDate = new Date(viewData.date);
      dayName = viewData.dayName || dayNames[dayDate.getDay()];
      isToday = viewData.isToday !== undefined ? viewData.isToday : this.isToday(dayDate);
      allDayEvents = viewData.allDayEvents || [];

      // Extract timed events from hours array
      if (viewData.hours && Array.isArray(viewData.hours)) {
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
      const dayDataItem =
        viewData.days.find(d => this.isSameDay(new Date(d.date), currentDate)) || viewData.days[0];
      dayDate = new Date(dayDataItem.date);
      dayName = dayNames[dayDate.getDay()];
      isToday = this.isToday(dayDate);
      const events = dayDataItem.events || [];
      allDayEvents = events.filter(e => e.allDay);
      timedEvents = events.filter(e => !e.allDay);
    } else {
      return null;
    }

    return { dayDate, dayName, isToday, allDayEvents, timedEvents };
  }

  _renderHeader(dayDate, dayName, isToday) {
    return `
            <div class="fc-day-header" style="display: grid; grid-template-columns: 60px 1fr; border-bottom: 1px solid #e5e7eb; background: #f9fafb; flex-shrink: 0;">
                <div style="border-right: 1px solid #e5e7eb;"></div>
                <div style="padding: 16px 24px;">
                    <div style="font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">
                        ${dayName}
                    </div>
                    <div style="font-size: 24px; font-weight: 600; margin-top: 4px; ${isToday ? 'color: #dc2626;' : 'color: #111827;'}">
                        ${dayDate.getDate()}
                    </div>
                </div>
            </div>
        `;
  }

  _renderAllDayRow(allDayEvents, dayDate) {
    return `
            <div class="fc-all-day-row" style="display: grid; grid-template-columns: 60px 1fr; border-bottom: 1px solid #e5e7eb; background: #fafafa; min-height: 36px; flex-shrink: 0;">
                <div style="font-size: 9px; color: #6b7280; display: flex; align-items: center; justify-content: center; border-right: 1px solid #e5e7eb; text-transform: uppercase; font-weight: 700;">
                    All day
                </div>
                <div class="fc-all-day-cell" data-date="${dayDate.toISOString()}" style="padding: 6px 12px; display: flex; flex-wrap: wrap; gap: 4px;">
                    ${allDayEvents
                      .map(
                        evt => `
                        <div class="fc-event fc-all-day-event" data-event-id="${this.escapeHTML(evt.id)}"
                             style="background-color: ${this.getEventColor(evt)}; font-size: 12px; padding: 4px 8px; border-radius: 4px; color: white; cursor: pointer; font-weight: 500;">
                            ${this.escapeHTML(evt.title)}
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `;
  }

  _renderTimeGrid(timedEvents, isToday, dayDate, hours) {
    return `
            <div id="day-scroll-container" class="fc-time-grid-container" style="flex: 1; overflow-y: auto; overflow-x: hidden; position: relative;">
                <div class="fc-time-grid" style="display: grid; grid-template-columns: 60px 1fr; position: relative; height: ${this.totalHeight}px;">
                    ${this._renderTimeGutter(hours)}
                    ${this._renderDayColumn(timedEvents, isToday, dayDate, hours)}
                </div>
            </div>
        `;
  }

  _renderTimeGutter(hours) {
    return `
            <div class="fc-time-gutter" style="border-right: 1px solid #e5e7eb; background: #fafafa;">
                ${hours
                  .map(
                    h => `
                    <div style="height: ${this.hourHeight}px; font-size: 11px; color: #6b7280; text-align: right; padding-right: 12px; font-weight: 500;">
                        ${h === 0 ? '' : this.formatHour(h)}
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  _renderDayColumn(timedEvents, isToday, dayDate, hours) {
    return `
            <div class="fc-day-column" data-date="${dayDate.toISOString()}" style="position: relative; cursor: pointer;">
                <!-- Hour grid lines -->
                ${hours.map(() => `<div style="height: ${this.hourHeight}px; border-bottom: 1px solid #f3f4f6;"></div>`).join('')}

                <!-- Now indicator for today -->
                ${isToday ? this.renderNowIndicator() : ''}

                <!-- Timed events -->
                ${(() => {
                  const layout = this.computeOverlapLayout(timedEvents);
                  return timedEvents.map(evt => this.renderTimedEvent(evt, { compact: false, overlapLayout: layout })).join('');
                })()}
            </div>
        `;
  }

  _attachEventHandlers() {
    this.addListener(this.container, 'click', e => {
      const dayEl = e.target.closest('.fc-day-column');
      if (!dayEl || !this.container.contains(dayEl)) return;
      if (e.target.closest('.fc-event')) return;

      const date = new Date(dayEl.dataset.date);
      const scrollContainer = this.container.querySelector('#day-scroll-container');
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

    const scrollContainer = this.container.querySelector('#day-scroll-container');
    if (scrollContainer) {
      // Scroll to 8 AM, minus some offset for visibility
      scrollContainer.scrollTop = 8 * this.hourHeight - 50;
      this._scrolled = true;
    }
  }
}

export default DayViewRenderer;
