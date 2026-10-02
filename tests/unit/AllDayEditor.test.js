import '../../src/components/ForceCalendar.js';
const click = node =>
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
let calendar;
const q = s => calendar.shadowRoot.querySelector(s);
const form = () => q('#event-modal');
const toggle = checked => {
  form().allDayInput.checked = checked;
  form().allDayInput.dispatchEvent(new Event('change', { bubbles: true }));
};
beforeEach(() => {
  jest.useFakeTimers();
  calendar = document.createElement('forcecal-main');
  calendar.setAttribute('date', '2026-10-15T12:00:00');
  document.body.appendChild(calendar);
});
afterEach(() => {
  calendar.destroy();
  calendar.remove();
  jest.clearAllTimers();
  jest.useRealTimers();
});
const create = (start, end) => {
  click(q('#create-event-btn'));
  form().titleInput.value = 'All-day';
  toggle(true);
  form().startInput.value = start;
  form().endInput.value = end;
  click(form().$('#save-btn'));
  return calendar.getEvents()[0];
};
const localDate = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

test('uses clearly inclusive date-only fields and allows one-day creation', () => {
  const event = create('2026-10-05', '2026-10-05');
  expect(form().startInput.type).toBe('date');
  expect(form().endInput.type).toBe('date');
  expect(form().$('label[for="event-start"]').textContent).toBe('Start date');
  expect(form().$('label[for="event-end"]').textContent).toBe('Last day (inclusive)');
  expect(localDate(event.start)).toBe('2026-10-05');
  expect(localDate(event.end)).toBe('2026-10-05');
  expect(event.start.getHours()).toBe(0);
  expect(event.end.getHours()).toBe(23);
  expect(event.end.getMilliseconds()).toBe(999);
  expect(calendar.shadowRoot.querySelectorAll('.fc-event')).toHaveLength(1);
});
test('inclusive multi-day creation and title-only roundtrip retain exactly three civil days', () => {
  const event = create('2026-10-05', '2026-10-07');
  expect(calendar.shadowRoot.querySelectorAll('.fc-event')).toHaveLength(3);
  click(q('.fc-event'));
  click(q('#fc-details-edit'));
  expect(form().startInput.value).toBe('2026-10-05');
  expect(form().endInput.value).toBe('2026-10-07');
  form().titleInput.value = 'Updated';
  click(form().$('#save-btn'));
  const updated = calendar.getEvents()[0];
  expect(updated.start.getTime()).toBe(event.start.getTime());
  expect(updated.end.getTime()).toBe(event.end.getTime());
  calendar.setEvents([updated.toObject()]);
  expect(calendar.shadowRoot.querySelectorAll('.fc-event')).toHaveLength(3);
});
test('rejects a last day before the start, but does not reject same day', () => {
  create('2026-10-07', '2026-10-05');
  expect(calendar.getEvents()).toHaveLength(0);
  expect(form().hasAttribute('open')).toBe(true);
  form().endInput.value = '2026-10-07';
  click(form().$('#save-btn'));
  expect(calendar.getEvents()).toHaveLength(1);
});
test.each(['2026-03-08', '2026-11-01', '2026-04-05', '2026-09-27'])(
  'DST civil day %s uses local boundaries, never fixed duration',
  day => {
    const event = create(day, day);
    expect(localDate(event.start)).toBe(day);
    expect(localDate(event.end)).toBe(day);
    const following = new Date(event.start);
    following.setDate(following.getDate() + 1);
    expect(event.end.getTime() + 1).toBe(following.getTime());
  }
);
test('timed/all-day/timed toggle restores original precise instants including DST folds', () => {
  const start = new Date('2026-11-01T06:30:12.345Z'),
    end = new Date('2026-11-01T07:00:45.678Z');
  calendar.setDate(new Date(2026, 10, 1, 12));
  calendar.setEvents([{ id: 'timed', title: 'Timed', start, end }]);
  click(q('.fc-event'));
  click(q('#fc-details-edit'));
  const startText = form().startInput.value,
    endText = form().endInput.value;
  toggle(true);
  expect(form().startInput.type).toBe('date');
  toggle(false);
  expect(form().startInput.value).toBe(startText);
  expect(form().endInput.value).toBe(endText);
  form().titleInput.value = 'Retitled';
  click(form().$('#save-btn'));
  expect(calendar.getEvents()[0].start.getTime()).toBe(start.getTime());
  expect(calendar.getEvents()[0].end.getTime()).toBe(end.getTime());
});
test('existing all-day toggles to a valid local timed interval and back', () => {
  create('2026-10-05', '2026-10-05');
  click(q('.fc-event'));
  click(q('#fc-details-edit'));
  toggle(false);
  expect(form().startInput.value).toBe('2026-10-05T09:00');
  expect(form().endInput.value).toBe('2026-10-05T10:00');
  toggle(true);
  expect(form().startInput.value).toBe('2026-10-05');
  expect(form().endInput.value).toBe('2026-10-05');
  click(form().$('#save-btn'));
  expect(calendar.getEvents()).toHaveLength(1);
  expect(calendar.getEvents()[0].allDay).toBe(true);
});

test('standalone same-day all-day input is normalized to inclusive local boundaries', () => {
  const editor = form();
  const date = new Date(2026, 9, 5);
  editor.edit({ id: 'single-day', title: 'Single day', start: date, end: date, allDay: true });
  const saved = jest.fn();
  editor.addEventListener('save', saved);
  editor.save();
  expect(saved).toHaveBeenCalledTimes(1);
  expect(localDate(saved.mock.calls[0][0].detail.start)).toBe('2026-10-05');
  expect(localDate(saved.mock.calls[0][0].detail.end)).toBe('2026-10-05');
  expect(saved.mock.calls[0][0].detail.end.getHours()).toBe(23);
});
