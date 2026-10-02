import '../../src/components/ForceCalendar.js';

const seed = {
  id: 'native-instance',
  title: 'Native recurring instance',
  start: new Date(2026, 6, 15, 10),
  end: new Date(2026, 6, 15, 11),
  metadata: { forceCalendarRecurring: true }
};
const click = node =>
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
const pointer = (type, y = 600) =>
  new MouseEvent(type, { bubbles: true, composed: true, button: 0, clientX: 10, clientY: y });
let calendar;
const q = s => calendar.shadowRoot.querySelector(s);
beforeEach(() => {
  jest.useFakeTimers();
  calendar = document.createElement('forcecal-main');
  calendar.setAttribute('date', '2026-07-15T12:00:00');
});
afterEach(() => {
  calendar.destroy();
  calendar.remove();
  jest.clearAllTimers();
  jest.useRealTimers();
});

test.each(['month', 'week', 'day'])(
  '%s displays externally expanded recurrence exactly once without mutation controls',
  view => {
    calendar.setAttribute('view', view);
    calendar.setEvents([seed]);
    document.body.appendChild(calendar);
    expect(calendar.getEvents()[0].recurrenceRule).toBeNull();
    expect(calendar.getEvents()[0].recurring).toBe(false);
    const chips = calendar.shadowRoot.querySelectorAll('.fc-event');
    expect(chips).toHaveLength(1);
    const chip = chips[0];
    expect(chip.dataset.eventId).toBe(seed.id);
    expect(chip.querySelector('.fc-resize-handle')).toBeNull();
    const updated = jest.fn();
    calendar.addEventListener('calendar-event-update', updated);
    chip.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', 690));
    document.dispatchEvent(pointer('pointerup', 690));
    expect(updated).not.toHaveBeenCalled();
    expect(calendar.getEvents()[0].start).toEqual(seed.start);
    click(chip);
    expect(q('#fc-details-title').textContent).toBe(seed.title);
    expect(q('#fc-details-edit')).toBeNull();
    expect(q('#fc-details-delete')).toBeNull();
    expect(q('[role="dialog"]').textContent).toContain('Recurring event');
  }
);
test('direct standalone editor entry declines native recurring instances', () => {
  const form = document.createElement('forcecal-event-form');
  document.body.appendChild(form);
  try {
    const saved = jest.fn();
    form.addEventListener('save', saved);
    form.edit(seed);
    form.save();
    expect(form.hasAttribute('open')).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  } finally {
    form.remove();
  }
});
test('host marking an open edit recurring prevents stale UI save', () => {
  calendar.setEvents([{ ...seed, metadata: {} }]);
  document.body.appendChild(calendar);
  click(q('.fc-event'));
  click(q('#fc-details-edit'));
  const form = q('#event-modal');
  form.titleInput.value = 'Unsafe';
  calendar.setEvents([seed]);
  const updated = jest.fn();
  calendar.addEventListener('calendar-event-update', updated);
  form.save();
  expect(updated).not.toHaveBeenCalled();
  expect(calendar.getEvents()[0].title).toBe(seed.title);
});
test('only boolean true enables the external recurrence marker', () => {
  calendar.setEvents([{ ...seed, metadata: { forceCalendarRecurring: false } }]);
  document.body.appendChild(calendar);
  click(q('.fc-event'));
  expect(q('#fc-details-edit')).not.toBeNull();
});
