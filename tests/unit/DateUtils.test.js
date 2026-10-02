import { DateUtils as CoreDateUtils } from '@forcecalendar/core';
import { DateUtils } from '../../src/utils/DateUtils.js';

describe('DateUtils.formatTime signatures', () => {
  const date = new Date(2026, 9, 2, 13, 45);
  test('preserves the interface minute and locale options', () => {
    expect(DateUtils.formatTime(date, false, true, 'en-GB')).toBe(
      new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false }).format(date)
    );
    expect(DateUtils.formatTime(date, true, false, 'en-US')).toBe(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date)
    );
  });
  test('accepts the inherited Core locale signature', () => {
    expect(DateUtils.formatTime(date, 'de-DE', true)).toBe(
      CoreDateUtils.formatTime(date, 'de-DE', true)
    );
    expect(DateUtils.formatTime(date, 'en-US')).toBe(CoreDateUtils.formatTime(date, 'en-US'));
  });
});
