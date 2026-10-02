import '../../src/components/ForceCalendar.js';

const event = backgroundColor => ({
  id: 'event',
  title: 'Original',
  backgroundColor,
  start: new Date(2026, 6, 15, 10),
  end: new Date(2026, 6, 15, 11)
});
const click = node =>
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
let calendar;
const q = selector => calendar.shadowRoot.querySelector(selector);
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

test.each([
  [null, true],
  ['true', true],
  ['false', false],
  ['', true],
  [' FALSE ', false]
])('parses show-color-picker=%s and forwards it', (value, expected) => {
  if (value !== null) calendar.setAttribute('show-color-picker', value);
  document.body.appendChild(calendar);
  const form = q('#event-modal');
  expect(calendar.showColorPicker).toBe(expected);
  expect(form.showColorPicker).toBe(expected);
  expect(form.$('#color-group').hidden).toBe(!expected);
  expect([...form.$$('.color-btn')].every(button => button.disabled === !expected)).toBe(true);
});
test.each(['#123456', null])('hidden picker preserves original color %s through edits', color => {
  calendar.showColorPicker = false;
  calendar.setEvents([event(color)]);
  document.body.appendChild(calendar);
  click(q('.fc-event'));
  click(q('#fc-details-edit'));
  const form = q('#event-modal');
  form.titleInput.value = 'Edited';
  click(form.$('.color-btn')); // Even stale/programmatic interaction must not change hidden controls.
  click(form.$('#save-btn'));
  expect(calendar.getEvents()[0].title).toBe('Edited');
  expect(calendar.getEvents()[0].backgroundColor).toBe(color);
});
test('observed attribute and property toggle without discarding an active draft', () => {
  document.body.appendChild(calendar);
  click(q('#create-event-btn'));
  const form = q('#event-modal');
  form.titleInput.value = 'Unsaved';
  calendar.setAttribute('show-color-picker', 'false');
  expect(q('#event-modal')).toBe(form);
  expect(form.hasAttribute('open')).toBe(true);
  expect(form.titleInput.value).toBe('Unsaved');
  expect(form.$('#color-group').hidden).toBe(true);
  calendar.showColorPicker = true;
  expect(form.titleInput.value).toBe('Unsaved');
  expect(form.$('#color-group').hidden).toBe(false);
  calendar.showColorPicker = false;
  calendar.removeAttribute('show-color-picker');
  expect(form.showColorPicker).toBe(true);
  expect(form.$('#color-group').hidden).toBe(false);
});
test('upgrades an own property assigned before connection', () => {
  Object.defineProperty(calendar, 'showColorPicker', {
    value: false,
    configurable: true,
    writable: true
  });
  document.body.appendChild(calendar);
  expect(calendar.getAttribute('show-color-picker')).toBe('false');
  expect(q('#event-modal').showColorPicker).toBe(false);
});
test('standalone EventForm supports the same option before and after attachment', () => {
  const form = document.createElement('forcecal-event-form');
  form.showColorPicker = false;
  document.body.appendChild(form);
  try {
    expect(form.$('#color-group').hidden).toBe(true);
    form.open(new Date());
    form.titleInput.value = 'Draft';
    form.setAttribute('show-color-picker', 'true');
    expect(form.$('#color-group').hidden).toBe(false);
    expect(form.titleInput.value).toBe('Draft');
  } finally {
    form.remove();
  }
});
