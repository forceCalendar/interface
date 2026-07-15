/**
 * BaseViewRenderer - Foundation for all view renderers
 *
 * Pure JavaScript class (no Web Components) for Salesforce Locker Service compatibility.
 * Provides common functionality for rendering calendar views.
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { StyleUtils } from '../utils/StyleUtils.js';

export class BaseViewRenderer {
  /**
   * @param {HTMLElement} container - The DOM element to render into
   * @param {StateManager} stateManager - The state manager instance
   */
  constructor(container, stateManager) {
    this.container = container;
    this.stateManager = stateManager;
    this._listeners = [];
    this._scrolled = false;
    this._nowIndicatorTimer = null;
  }

  /**
   * Render the view into the container
   * Must be implemented by subclasses
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    this._listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this._listeners = [];
    if (this._nowIndicatorTimer) {
      clearInterval(this._nowIndicatorTimer);
      this._nowIndicatorTimer = null;
    }
  }

  /**
   * Add an event listener with automatic cleanup tracking
   * @param {HTMLElement} element
   * @param {string} event
   * @param {Function} handler
   */
  addListener(element, event, handler) {
    const boundHandler = handler.bind(this);
    element.addEventListener(event, boundHandler);
    this._listeners.push({ element, event, handler: boundHandler });
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str
   * @returns {string}
   */
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return DOMUtils.escapeHTML(String(str));
  }

  /**
   * Check if a date is today
   * @param {Date} date
   * @returns {boolean}
   */
  isToday(date) {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Check if two dates are the same day
   * @param {Date} date1
   * @param {Date} date2
   * @returns {boolean}
   */
  isSameDay(date1, date2) {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  /**
   * Format hour for display (e.g., "9 AM", "2 PM")
   * @param {number} hour - Hour in 24-hour format (0-23)
   * @returns {string}
   */
  formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${period}`;
  }

  /**
   * Format time for display (e.g., "9 AM", "2:30 PM")
   * @param {Date} date
   * @returns {string}
   */
  formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return minutes === 0
      ? `${displayHour} ${period}`
      : `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Get contrasting text color for a background color.
   * Delegates to StyleUtils.getContrastColor() as the single implementation.
   * @param {string} bgColor - Hex color string
   * @returns {string} '#000000' or '#FFFFFF'
   */
  getContrastingTextColor(bgColor) {
    if (!bgColor || typeof bgColor !== 'string' || bgColor.charAt(0) !== '#') {
      return 'white';
    }
    return StyleUtils.getContrastColor(bgColor);
  }

  /**
   * Render the "now" indicator line for time-based views
   * @returns {string} HTML string
   */
  renderNowIndicator() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return `<div class="fc-now-indicator" style="position: absolute; left: 0; right: 0; top: ${minutes}px; height: 2px; background: var(--fc-danger-color); z-index: 15; pointer-events: none;"></div>`;
  }

  /**
   * Start a timer that updates the now indicator position every 60 seconds.
   * Call this after render() in day/week views that show a now indicator.
   */
  startNowIndicatorTimer() {
    if (this._nowIndicatorTimer) {
      clearInterval(this._nowIndicatorTimer);
    }
    this._nowIndicatorTimer = setInterval(() => {
      const indicator = this.container.querySelector('.fc-now-indicator');
      if (indicator) {
        const now = new Date();
        indicator.style.top = `${now.getHours() * 60 + now.getMinutes()}px`;
      }
    }, 60000);
  }

  /**
   * Compute overlap layout columns for a list of timed events.
   * Returns a Map of event.id -> { column, totalColumns }.
   * Uses a greedy left-to-right column packing algorithm.
   * @param {Array} events - Array of event objects with start/end dates
   * @returns {Map<string, {column: number, totalColumns: number}>}
   */
  computeOverlapLayout(events) {
    if (!events || events.length === 0) return new Map();

    // Convert to sortable entries with minute ranges
    const entries = events.map(evt => {
      const start = new Date(evt.start);
      const end = new Date(evt.end);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = Math.max(startMin + 1, end.getHours() * 60 + end.getMinutes());
      return { id: evt.id, startMin, endMin };
    });

    // Sort by start time, then by longer duration first
    entries.sort(
      (a, b) => a.startMin - b.startMin || b.endMin - b.startMin - (a.endMin - a.startMin)
    );

    // Assign columns greedily
    const columns = []; // each column tracks the end time of its last event
    const layout = new Map();

    for (const entry of entries) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (columns[col] <= entry.startMin) {
          columns[col] = entry.endMin;
          layout.set(entry.id, { column: col, totalColumns: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        layout.set(entry.id, { column: columns.length, totalColumns: 0 });
        columns.push(entry.endMin);
      }
    }

    // Determine the max overlapping columns for each cluster of overlapping events
    // Walk through entries and find connected groups
    const groups = [];
    let currentGroup = [];
    let groupEnd = 0;

    for (const entry of entries) {
      if (currentGroup.length === 0 || entry.startMin < groupEnd) {
        currentGroup.push(entry);
        groupEnd = Math.max(groupEnd, entry.endMin);
      } else {
        groups.push(currentGroup);
        currentGroup = [entry];
        groupEnd = entry.endMin;
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    for (const group of groups) {
      const maxCol = Math.max(...group.map(e => layout.get(e.id).column)) + 1;
      for (const entry of group) {
        layout.get(entry.id).totalColumns = maxCol;
      }
    }

    return layout;
  }

  /**
   * Render a timed event block
   * @param {Object} event - Event object
   * @param {Object} options - Rendering options
   * @param {Object} options.compact - Use compact layout
   * @param {Object} options.overlapLayout - Map from computeOverlapLayout()
   * @returns {string} HTML string
   */
  renderTimedEvent(event, options = {}) {
    const { compact = true, overlapLayout = null } = options;
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = Math.max((end - start) / (1000 * 60), compact ? 20 : 30);
    const color = this.getEventColor(event);
    const textColor = this.getContrastingTextColor(color);

    const padding = compact ? '4px 8px' : '8px 12px';
    const fontSize = compact ? '11px' : '13px';
    const baseMargin = compact ? 2 : 12;
    const rightPad = compact ? 2 : 24;
    const borderRadius = compact ? '4px' : '6px';

    // Compute left/width based on overlap columns
    let leftPx, widthCalc;
    if (overlapLayout && overlapLayout.has(event.id)) {
      const { column, totalColumns } = overlapLayout.get(event.id);
      const colWidth = `(100% - ${baseMargin + rightPad}px)`;
      leftPx = `calc(${baseMargin}px + ${column} * ${colWidth} / ${totalColumns})`;
      widthCalc = `calc(${colWidth} / ${totalColumns})`;
    } else {
      leftPx = `${baseMargin}px`;
      widthCalc = `calc(100% - ${baseMargin + rightPad}px)`;
    }

    return `
            <div class="fc-event fc-timed-event" data-event-id="${this.escapeHTML(event.id)}"
                 style="position: absolute; top: ${startMinutes}px; height: ${durationMinutes}px;
                        left: ${leftPx}; width: ${widthCalc};
                        background-color: ${color}; border-radius: ${borderRadius};
                        padding: ${padding}; font-size: ${fontSize};
                        font-weight: 500; color: ${textColor}; overflow: hidden;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                        cursor: pointer; z-index: 5;">
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${this.escapeHTML(event.title)}
                </div>
                <div style="font-size: ${compact ? '10px' : '11px'}; opacity: 0.9;">
                    ${this.formatTime(start)}${compact ? '' : ' - ' + this.formatTime(end)}
                </div>
            </div>
        `;
  }

  /**
   * Get a safe, sanitized event color value.
   * @param {Object} event
   * @returns {string}
   */
  getEventColor(event) {
    return StyleUtils.sanitizeColor(event?.backgroundColor, '#2563eb');
  }

  /**
   * Attach common event handlers for day/event clicks
   */
  attachCommonEventHandlers() {
    // Delegate event clicks at container level to avoid rebinding per event node.
    this.addListener(this.container, 'click', e => {
      const eventEl = e.target.closest('.fc-event');
      if (!eventEl || !this.container.contains(eventEl)) return;

      e.stopPropagation();
      this._selectEventFromElement(eventEl);
    });

    // Keyboard activation for events (Enter / Space)
    this.addListener(this.container, 'keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const eventEl = e.target.closest('.fc-event');
      if (!eventEl || !this.container.contains(eventEl)) return;

      e.preventDefault();
      e.stopPropagation();
      this._selectEventFromElement(eventEl);
    });

    this._enhanceEventAccessibility();
  }

  _selectEventFromElement(eventEl) {
    const eventId = eventEl.dataset.eventId;
    const event = this.stateManager.getEvents().find(ev => ev.id === eventId);
    if (event) {
      this.stateManager.selectEvent(event);
    }
  }

  /**
   * WAI-ARIA semantics and keyboard navigation for time grids (week/day
   * views). The DOM is column-major (a column per day, an hour line per
   * slot), so each day column is exposed as a row of 24 hour gridcells.
   * Arrow keys navigate visually: Up/Down moves hours, Left/Right moves
   * days, Home/End jumps to the day's bounds, PageUp/PageDown navigates
   * periods, Enter/Space selects the slot's date and time.
   * @param {string} columnSelector - Selector for the day columns
   * @param {string} gridLabel - Accessible label for the grid
   */
  _enhanceTimeGridAccessibility(columnSelector, gridLabel) {
    const grid = this.container.querySelector('.fc-time-grid');
    if (!grid) return;
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', gridLabel);
    const gutter = this.container.querySelector('.fc-time-gutter');
    if (gutter) gutter.setAttribute('aria-hidden', 'true');

    const locale = this.stateManager.getState().config.locale || 'en-US';
    const dayFormatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    const columns = Array.from(this.container.querySelectorAll(columnSelector));
    for (const col of columns) {
      col.setAttribute('role', 'row');
      const colDate = new Date(col.dataset.date);
      const colLabel = dayFormatter.format(colDate);
      col.setAttribute('aria-label', colLabel);
      for (const slot of col.querySelectorAll('.fc-hour-slot')) {
        slot.setAttribute('role', 'gridcell');
        slot.setAttribute('tabindex', '-1');
        slot.setAttribute(
          'aria-label',
          `${colLabel}, ${this.formatHour(Number(slot.dataset.hour))}`
        );
      }
    }

    this._applySlotRovingTabindex(columns);

    if (this._pendingSlotFocus) {
      const { colIndex, hour } = this._pendingSlotFocus;
      this._pendingSlotFocus = null;
      const target = this._slotAt(columns, colIndex, hour);
      if (target) {
        this._applySlotRovingTabindex(columns, target);
        target.focus();
      }
    }

    this.addListener(this.container, 'keydown', e => {
      const slot = e.target.closest('.fc-hour-slot');
      if (!slot || !this.container.contains(slot)) return;
      const col = slot.closest(columnSelector);
      const colIndex = columns.indexOf(col);
      const hour = Number(slot.dataset.hour);
      let target = null;

      switch (e.key) {
        case 'ArrowDown':
          target = this._slotAt(columns, colIndex, hour + 1);
          break;
        case 'ArrowUp':
          target = this._slotAt(columns, colIndex, hour - 1);
          break;
        case 'ArrowRight':
          target = this._slotAt(columns, colIndex + 1, hour);
          break;
        case 'ArrowLeft':
          target = this._slotAt(columns, colIndex - 1, hour);
          break;
        case 'Home':
          target = this._slotAt(columns, colIndex, 0);
          break;
        case 'End':
          target = this._slotAt(columns, colIndex, 23);
          break;
        case 'PageUp':
        case 'PageDown':
          e.preventDefault();
          this._pendingSlotFocus = { colIndex, hour };
          if (e.key === 'PageDown') {
            this.stateManager.next();
          } else {
            this.stateManager.previous();
          }
          return;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const date = new Date(col.dataset.date);
          date.setHours(hour, 0, 0, 0);
          this._pendingSlotFocus = { colIndex, hour };
          this.stateManager.selectDate(date);
          return;
        }
        default:
          return;
      }

      e.preventDefault();
      if (target) {
        this._applySlotRovingTabindex(columns, target);
        target.scrollIntoView?.({ block: 'nearest' });
        target.focus();
      }
    });
  }

  /**
   * Get the hour slot at a column/hour position
   * @private
   */
  _slotAt(columns, colIndex, hour) {
    if (colIndex < 0 || colIndex >= columns.length || hour < 0 || hour > 23) return null;
    return columns[colIndex].querySelector(`.fc-hour-slot[data-hour="${hour}"]`);
  }

  /**
   * Keep exactly one hour slot tabbable. Defaults to 9:00 AM in the
   * first column (today's column when present).
   * @private
   */
  _applySlotRovingTabindex(columns, active = null) {
    const slots = this.container.querySelectorAll('.fc-hour-slot');
    if (slots.length === 0) return;
    if (!active) {
      const todayCol =
        columns.find(c => this.isToday(new Date(c.dataset.date))) || columns[0];
      active = todayCol && todayCol.querySelector('.fc-hour-slot[data-hour="9"]');
      active = active || slots[0];
    }
    for (const s of slots) {
      s.setAttribute('tabindex', s === active ? '0' : '-1');
    }
  }

  /**
   * Make rendered events keyboard-reachable and screen-reader labeled.
   * Runs after every render, across all views.
   */
  _enhanceEventAccessibility() {
    for (const el of this.container.querySelectorAll('.fc-event')) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('aria-label')) {
        const label = (el.getAttribute('title') || el.textContent || '').trim();
        if (label) {
          el.setAttribute('aria-label', `Event: ${label}`);
        }
      }
    }
  }
}

export default BaseViewRenderer;
