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
    entries.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

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
                        font-weight: 500; color: white; overflow: hidden;
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
      const eventId = eventEl.dataset.eventId;
      const event = this.stateManager.getEvents().find(ev => ev.id === eventId);
      if (event) {
        this.stateManager.selectEvent(event);
      }
    });
  }
}

export default BaseViewRenderer;
