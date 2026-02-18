/**
 * BaseViewRenderer - Foundation for all view renderers
 *
 * Pure JavaScript class (no Web Components) for Salesforce Locker Service compatibility.
 * Provides common functionality for rendering calendar views.
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { DateUtils } from '../utils/DateUtils.js';
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
    if (str == null) return '';
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
   * Get contrasting text color for a background color
   * Uses WCAG luminance formula
   * @param {string} bgColor - Hex color string
   * @returns {string} 'black' or 'white'
   */
  getContrastingTextColor(bgColor) {
    if (!bgColor || typeof bgColor !== 'string') return 'white';

    const color = bgColor.charAt(0) === '#' ? bgColor.substring(1) : bgColor;

    if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(color)) {
      return 'white';
    }

    const fullColor =
      color.length === 3 ? color[0] + color[0] + color[1] + color[1] + color[2] + color[2] : color;

    const r = parseInt(fullColor.substring(0, 2), 16);
    const g = parseInt(fullColor.substring(2, 4), 16);
    const b = parseInt(fullColor.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return 'white';
    }

    const uicolors = [r / 255, g / 255, b / 255];
    const c = uicolors.map(col => {
      if (col <= 0.03928) {
        return col / 12.92;
      }
      return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L > 0.179 ? 'black' : 'white';
  }

  /**
   * Render the "now" indicator line for time-based views
   * @returns {string} HTML string
   */
  renderNowIndicator() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return `<div class="fc-now-indicator" style="position: absolute; left: 0; right: 0; top: ${minutes}px; height: 2px; background: #dc2626; z-index: 15; pointer-events: none;"></div>`;
  }

  /**
   * Render a timed event block
   * @param {Object} event - Event object
   * @param {Object} options - Rendering options
   * @returns {string} HTML string
   */
  renderTimedEvent(event, options = {}) {
    const { compact = true } = options;
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = Math.max((end - start) / (1000 * 60), compact ? 20 : 30);
    const color = this.getEventColor(event);

    const padding = compact ? '4px 8px' : '8px 12px';
    const fontSize = compact ? '11px' : '13px';
    const margin = compact ? '2px' : '12px';
    const rightMargin = compact ? '2px' : '24px';
    const borderRadius = compact ? '4px' : '6px';

    return `
            <div class="fc-event fc-timed-event" data-event-id="${this.escapeHTML(event.id)}"
                 style="position: absolute; top: ${startMinutes}px; height: ${durationMinutes}px;
                        left: ${margin}; right: ${rightMargin};
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
