/**
 * DateUtils - Date formatting and manipulation utilities
 *
 * Extends Core DateUtils with UI-specific formatting
 */

import { DateUtils as CoreDateUtils } from '@forcecalendar/core';

export class DateUtils extends CoreDateUtils {
  /**
   * Format date for display
   */
  static formatDate(date, format = 'default', locale = 'en-US') {
    if (!date) return '';

    const formats = {
      default: { year: 'numeric', month: 'long', day: 'numeric' },
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
      month: { year: 'numeric', month: 'long' },
      monthShort: { year: 'numeric', month: 'short' },
      day: { weekday: 'long', day: 'numeric' },
      dayShort: { weekday: 'short', day: 'numeric' },
      time: { hour: 'numeric', minute: '2-digit' },
      timeShort: { hour: 'numeric' },
      datetime: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }
    };

    const options = formats[format] || formats.default;
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  /**
   * Format time for display
   */
  static formatTime(date, showMinutes = true, use24Hour = false, locale = 'en-US') {
    if (!date) return '';

    const options = {
      hour: 'numeric',
      minute: showMinutes ? '2-digit' : undefined,
      hour12: !use24Hour
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  /**
   * Format date range for display
   */
  static formatDateRange(start, end, locale = 'en-US') {
    if (!start) return '';
    if (!end || this.isSameDay(start, end)) {
      return this.formatDate(start, 'default', locale);
    }

    const startFormat = this.isSameYear(start, end) ? 'short' : 'default';
    return `${this.formatDate(start, startFormat, locale)} - ${this.formatDate(end, 'default', locale)}`;
  }

  /**
   * Format time range for display
   */
  static formatTimeRange(start, end, locale = 'en-US') {
    if (!start) return '';

    const startTime = this.formatTime(start, true, false, locale);
    if (!end) return startTime;

    const endTime = this.formatTime(end, true, false, locale);
    return `${startTime} - ${endTime}`;
  }

  /**
   * Get relative time string (e.g., "2 hours ago", "in 3 days")
   */
  static getRelativeTime(date, baseDate = new Date(), locale = 'en-US') {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diff = date - baseDate;
    const diffInSeconds = Math.floor(diff / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(diffInSeconds, 'second');
    } else if (Math.abs(diffInMinutes) < 60) {
      return rtf.format(diffInMinutes, 'minute');
    } else if (Math.abs(diffInHours) < 24) {
      return rtf.format(diffInHours, 'hour');
    } else if (Math.abs(diffInDays) < 7) {
      return rtf.format(diffInDays, 'day');
    } else if (Math.abs(diffInWeeks) < 4) {
      return rtf.format(diffInWeeks, 'week');
    } else if (Math.abs(diffInMonths) < 12) {
      return rtf.format(diffInMonths, 'month');
    } else {
      return rtf.format(diffInYears, 'year');
    }
  }

  /**
   * Check if date is today
   */
  static isToday(date) {
    const today = new Date();
    return this.isSameDay(date, today);
  }

  /**
   * Check if date is in the past
   */
  static isPast(date) {
    return date < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date) {
    return date > new Date();
  }

  /**
   * Get calendar week number
   */
  static getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Get day abbreviation
   */
  static getDayAbbreviation(dayIndex, locale = 'en-US') {
    const date = new Date(2024, 0, 7 + dayIndex); // Jan 7, 2024 is a Sunday
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  }

  /**
   * Get month name
   */
  static getMonthName(monthIndex, format = 'long', locale = 'en-US') {
    const date = new Date(2024, monthIndex, 1);
    return new Intl.DateTimeFormat(locale, { month: format }).format(date);
  }

  /**
   * Parse time string (e.g., "14:30" or "2:30 PM")
   */
  static parseTimeString(timeStr, baseDate = new Date()) {
    const date = new Date(baseDate);
    const [time, period] = timeStr.split(/\s+/);
    const [hours, minutes] = time.split(':').map(Number);

    let adjustedHours = hours;
    if (period) {
      if (period.toLowerCase() === 'pm' && hours < 12) {
        adjustedHours = hours + 12;
      } else if (period.toLowerCase() === 'am' && hours === 12) {
        adjustedHours = 0;
      }
    }

    date.setHours(adjustedHours, minutes || 0, 0, 0);
    return date;
  }
}

export default DateUtils;
