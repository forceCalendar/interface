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

    // Roving tabindex: exactly one cell is tabbable; restore focus after
    // a keyboard-initiated re-render (month navigation, selection)
    const active = this._applyRovingTabindex(this._pendingFocusMs ?? null);
    if (this._pendingFocusMs != null) {
      this._pendingFocusMs = null;
      if (active) {
        active.focus();
      }
    }
  }

  _renderMonthView(viewData, config) {
    const weekStartsOn = config.weekStartsOn || 0;
    const dayNames = this._getDayNames(weekStartsOn);
    const locale = config.locale || 'en-US';
    this._dayLabelFormatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const currentDate = this.stateManager.getState().currentDate;
    const gridLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      currentDate || new Date()
    );

    let html = `
            <div class="fc-month-view" role="grid" aria-label="${this.escapeHTML(gridLabel)}" style="display: flex; flex-direction: column; height: 100%; min-height: 400px; background: var(--fc-background); border: 1px solid var(--fc-border-color);">
                <div class="fc-month-header" role="row" style="display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--fc-border-color); background: var(--fc-background-alt);">
                    ${dayNames.map(d => `<div class="fc-month-header-cell" role="columnheader" style="padding: 12px 8px; text-align: center; font-size: 11px; font-weight: 600; color: var(--fc-text-light); text-transform: uppercase;">${this.escapeHTML(d)}</div>`).join('')}
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
      '<div class="fc-month-week" role="row" style="display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; min-height: 80px;">';

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

    let cellLabel = this._dayLabelFormatter
      ? this._dayLabelFormatter.format(new Date(day.date))
      : day.date;
    if (events.length > 0) {
      cellLabel += `, ${events.length} ${events.length === 1 ? 'event' : 'events'}`;
    }

    return `
            <div class="fc-month-day" data-date="${this.escapeHTML(day.date)}"
                 role="gridcell" tabindex="-1"
                 aria-selected="${day.isSelected ? 'true' : 'false'}"
                 ${isToday ? 'aria-current="date"' : ''}
                 ${isOtherMonth ? 'data-other-month="true"' : ''}
                 aria-label="${this.escapeHTML(cellLabel)}"
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
    const textColor = this.getContrastingTextColor(color);
    return `
            <div class="fc-event" data-event-id="${this.escapeHTML(event.id)}"
                 style="background-color: ${color}; font-size: 11px; padding: 2px 6px; border-radius: 3px; color: ${textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">
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

    // WAI-ARIA grid keyboard navigation
    this.addListener(this.container, 'keydown', e => {
      if (e.target.closest('.fc-event')) return; // events handle their own keys
      const cell = e.target.closest('.fc-month-day');
      if (!cell || !this.container.contains(cell)) return;

      const cells = Array.from(this.container.querySelectorAll('.fc-month-day'));
      const idx = cells.indexOf(cell);
      let targetIdx;

      switch (e.key) {
        case 'ArrowRight':
          targetIdx = idx + 1;
          break;
        case 'ArrowLeft':
          targetIdx = idx - 1;
          break;
        case 'ArrowDown':
          targetIdx = idx + 7;
          break;
        case 'ArrowUp':
          targetIdx = idx - 7;
          break;
        case 'Home':
          targetIdx = idx - (idx % 7);
          break;
        case 'End':
          targetIdx = idx - (idx % 7) + 6;
          break;
        case 'PageUp':
        case 'PageDown': {
          e.preventDefault();
          const d = new Date(cell.dataset.date);
          d.setMonth(d.getMonth() + (e.key === 'PageDown' ? 1 : -1));
          this._pendingFocusMs = d.getTime();
          if (e.key === 'PageDown') {
            this.stateManager.next();
          } else {
            this.stateManager.previous();
          }
          return;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const date = new Date(cell.dataset.date);
          this._pendingFocusMs = date.getTime();
          this.stateManager.selectDate(date);
          return;
        }
        default:
          return;
      }

      e.preventDefault();
      if (targetIdx >= 0 && targetIdx < cells.length) {
        this._applyRovingTabindex(new Date(cells[targetIdx].dataset.date).getTime());
        cells[targetIdx].focus();
      } else {
        // Focus target falls outside the rendered grid: navigate and
        // restore focus on the equivalent date after re-render
        const d = new Date(cell.dataset.date);
        d.setDate(d.getDate() + (targetIdx - idx));
        this._pendingFocusMs = d.getTime();
        if (targetIdx < 0) {
          this.stateManager.previous();
        } else {
          this.stateManager.next();
        }
      }
    });

    // Common event handlers (event clicks)
    this.attachCommonEventHandlers();
  }

  /**
   * Ensure exactly one grid cell participates in the tab order.
   * Priority: requested focus date, selected date, today, first day of
   * the current month.
   * @param {number|null} focusMs - Preferred focus date as a timestamp
   * @returns {HTMLElement|null} The tabbable cell
   */
  _applyRovingTabindex(focusMs = null) {
    const cells = Array.from(this.container.querySelectorAll('.fc-month-day'));
    if (cells.length === 0) return null;

    let active = null;
    if (focusMs != null) {
      active = cells.find(c => new Date(c.dataset.date).getTime() === focusMs);
    }
    if (!active) {
      active = cells.find(c => c.getAttribute('aria-selected') === 'true');
    }
    if (!active) {
      active = cells.find(c => c.hasAttribute('aria-current'));
    }
    if (!active) {
      active = cells.find(c => !c.dataset.otherMonth) || cells[0];
    }

    for (const c of cells) {
      c.setAttribute('tabindex', c === active ? '0' : '-1');
    }
    return active;
  }
}

export default MonthViewRenderer;
