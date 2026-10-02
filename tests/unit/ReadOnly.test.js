import { ForceCalendar } from '../../src/components/ForceCalendar.js';
import StateManager from '../../src/core/StateManager.js';
import { MonthViewRenderer } from '../../src/renderers/MonthViewRenderer.js';
import { WeekViewRenderer } from '../../src/renderers/WeekViewRenderer.js';
import { DayViewRenderer } from '../../src/renderers/DayViewRenderer.js';

const seed = (id = 'event-1') => ({
  id,
  title: 'Meeting',
  start: new Date('2026-07-15T10:00:00'),
  end: new Date('2026-07-15T11:00:00')
});
const pointer = (type, x = 10, y = 600) =>
  new MouseEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y, button: 0 });
const key = value => new KeyboardEvent('keydown', { key: value, bubbles: true, composed: true });
const uiEvent = (type, detail) => new CustomEvent(type, { detail, bubbles: true, composed: true });
const rect = (left = 0, top = 0) => ({ left, right: left + 100, top, bottom: top + 1440 });

function mockLayout(container) {
  for (const [index, cell] of [...container.querySelectorAll('.fc-month-day')].entries()) {
    cell.getBoundingClientRect = () => ({
      left: (index % 7) * 100,
      right: (index % 7) * 100 + 100,
      top: Math.floor(index / 7) * 80,
      bottom: Math.floor(index / 7) * 80 + 80
    });
  }
  for (const [index, column] of [
    ...container.querySelectorAll('.fc-week-day-column, .fc-day-column')
  ].entries()) {
    column.getBoundingClientRect = () => rect(index * 100);
  }
}

function startDrag(element, mode) {
  const container = element.shadowRoot.querySelector('#calendar-view-container');
  mockLayout(container);
  const eventEl = container.querySelector('.fc-event');
  if (mode === 'month-move') {
    const cells = [...container.querySelectorAll('.fc-month-day')];
    const index = cells.indexOf(eventEl.closest('.fc-month-day'));
    const target = cells[index + 1].getBoundingClientRect();
    eventEl.dispatchEvent(pointer('pointerdown', 10, 10));
    document.dispatchEvent(pointer('pointermove', target.left + 20, target.top + 20));
  } else {
    const column = eventEl.closest('.fc-week-day-column, .fc-day-column');
    const x = column.getBoundingClientRect().left + 10;
    const target =
      mode === 'resize'
        ? eventEl.querySelector('.fc-resize-handle')
        : mode === 'create'
          ? column.querySelector('.fc-hour-slot')
          : eventEl;
    target.dispatchEvent(pointer('pointerdown', x, 600));
    document.dispatchEvent(pointer('pointermove', x, 660));
  }
  return eventEl;
}

describe('ForceCalendar readOnly contract', () => {
  const elements = [];
  function create(view = 'month', readOnly = false, append = true) {
    const element = document.createElement('forcecal-main');
    elements.push(element);
    element.setAttribute('view', view);
    element.setAttribute('date', '2026-07-15T12:00:00');
    element.readOnly = readOnly;
    element.events = [seed()];
    if (append) document.body.appendChild(element);
    return element;
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    for (const element of elements.splice(0)) {
      element.destroy();
      element.remove();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('reflects a boolean readonly attribute before mount and while connected', () => {
    const element = create('month', false, false);
    expect(element.readOnly).toBe(false);
    element.setAttribute('readonly', 'false');
    expect(element.readOnly).toBe(true);
    document.body.appendChild(element);
    expect(element.stateManager.getState().config.readOnly).toBe(true);
    expect(element.shadowRoot.querySelector('#create-event-btn').disabled).toBe(true);
    element.readOnly = false;
    expect(element.hasAttribute('readonly')).toBe(false);
    expect(element.stateManager.getState().config.readOnly).toBe(false);
    element.readOnly = true;
    expect(element.getAttribute('readonly')).toBe('');
    element.removeAttribute('readonly');
    expect(element.readOnly).toBe(false);
  });

  test('honors a property assigned before custom-element upgrade', () => {
    const element = document.createElement('forcecal-readonly-upgrade-test');
    element.readOnly = true;
    element.setAttribute('date', '2026-07-15');
    document.body.appendChild(element);
    customElements.define('forcecal-readonly-upgrade-test', class extends ForceCalendar {});
    elements.push(element);
    expect(Object.prototype.hasOwnProperty.call(element, 'readOnly')).toBe(false);
    expect(element.readOnly).toBe(true);
    expect(element.stateManager.getState().config.readOnly).toBe(true);
    expect(element.shadowRoot.querySelector('#create-event-btn').disabled).toBe(true);
  });

  test('host snapshots and imperative CRUD retain their existing behavior and notifications', () => {
    const element = create('week', true);
    const added = jest.fn();
    const updated = jest.fn();
    const removed = jest.fn();
    const snapshot = jest.fn();
    element.addEventListener('calendar-event-add', added);
    element.addEventListener('calendar-event-update', updated);
    element.addEventListener('calendar-event-remove', removed);
    element.addEventListener('calendar-events-set', snapshot);
    element.setEvents([{ ...seed(), title: 'Hydrated' }]);
    element.events = [seed(), seed('event-2')];
    expect(snapshot).toHaveBeenCalledTimes(2);
    expect(added).not.toHaveBeenCalled();
    expect(updated).not.toHaveBeenCalled();
    expect(removed).not.toHaveBeenCalled();
    expect(element.shadowRoot.querySelectorAll('.fc-event')).toHaveLength(2);
    expect(element.addEvent(seed('event-3')).id).toBe('event-3');
    expect(element.updateEvent('event-3', { title: 'Host update' }).title).toBe('Host update');
    expect(element.deleteEvent('event-3')).toBe(true);
    expect(added).toHaveBeenCalledTimes(1);
    expect(updated).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot.querySelector('.fc-resize-handle')).toBeNull();
  });

  test.each(['month', 'week', 'day'])(
    '%s keeps selection and navigation without mutation',
    view => {
      const element = create(view, true);
      const shadow = element.shadowRoot;
      const dateSelected = jest.fn();
      const eventSelected = jest.fn();
      element.addEventListener('calendar-date-select', dateSelected);
      element.stateManager.eventBus.on('event:selected', eventSelected);
      const grid = shadow.querySelector('[role="grid"]');
      expect(grid.getAttribute('aria-readonly')).toBe('true');
      const eventEl = shadow.querySelector('.fc-event');
      eventEl.click();
      eventEl.dispatchEvent(key('Enter'));
      eventEl.dispatchEvent(key(' '));
      expect(eventSelected).toHaveBeenCalledTimes(3);
      expect(element.stateManager.getState().selectedEvent.id).toBe('event-1');
      for (const value of ['Delete', 'Backspace', 'F2']) eventEl.dispatchEvent(key(value));
      eventEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }));
      eventEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true }));
      const cell = shadow.querySelector(view === 'month' ? '.fc-month-day' : '.fc-hour-slot');
      cell.click();
      cell.dispatchEvent(key('Enter'));
      cell.dispatchEvent(key(' '));
      expect(dateSelected).toHaveBeenCalledTimes(3);
      cell.dispatchEvent(key('ArrowDown'));
      expect(shadow.activeElement).not.toBe(cell);
      expect(shadow.querySelector('#event-modal').hasAttribute('open')).toBe(false);
      expect(element.getEvents()[0].title).toBe('Meeting');
      const navigated = jest.fn();
      element.addEventListener('calendar-navigate', navigated);
      shadow.querySelector('[data-action="next"]').click();
      expect(navigated).toHaveBeenCalledTimes(1);
      expect(element.readOnly).toBe(true);
      shadow.querySelector('[data-view="day"]').click();
      expect(element.stateManager.getView()).toBe('day');
      expect(shadow.querySelector('[role="grid"]').getAttribute('aria-readonly')).toBe('true');
    }
  );

  test('guards button, synthetic day/range events and dialog saves', () => {
    const element = create('day', true);
    const modal = element.shadowRoot.querySelector('#event-modal');
    const open = jest.spyOn(modal, 'open');
    const added = jest.fn();
    const rangeSelected = jest.fn();
    element.addEventListener('calendar-event-add', added);
    element.addEventListener('calendar-range-select', rangeSelected);
    element.shadowRoot.querySelector('#create-event-btn').dispatchEvent(new MouseEvent('click'));
    element.shadowRoot.dispatchEvent(uiEvent('day-click', { date: new Date() }));
    element.shadowRoot.dispatchEvent(
      uiEvent('range-select', { start: new Date(), end: new Date() })
    );
    modal.dispatchEvent(uiEvent('save', seed('blocked')));
    expect(open).not.toHaveBeenCalled();
    expect(added).not.toHaveBeenCalled();
    expect(rangeSelected).not.toHaveBeenCalled();
    expect(element.getEvents()).toHaveLength(1);
  });

  test('a host can enable readOnly during range notification without reopening the old form', () => {
    const element = create('day');
    const modal = element.shadowRoot.querySelector('#event-modal');
    const open = jest.spyOn(modal, 'open');
    element.addEventListener('calendar-range-select', () => {
      element.readOnly = true;
    });
    element.shadowRoot.dispatchEvent(
      uiEvent('range-select', { start: new Date(), end: new Date() })
    );
    expect(element.readOnly).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(modal._cleanupFocusTrap).toBeNull();
    expect(element.shadowRoot.querySelector('#event-modal').hasAttribute('open')).toBe(false);
  });

  test('enabling readOnly closes an open form and disables stale editor handlers', () => {
    const element = create('day');
    element.shadowRoot.querySelector('#create-event-btn').click();
    const modal = element.shadowRoot.querySelector('#event-modal');
    expect(modal.hasAttribute('open')).toBe(true);
    expect(modal._cleanupFocusTrap).not.toBeNull();
    const close = jest.spyOn(modal, 'close');
    element.readOnly = true;
    expect(close).toHaveBeenCalled();
    expect(modal.hasAttribute('open')).toBe(false);
    expect(modal._cleanupFocusTrap).toBeNull();
    modal.dispatchEvent(uiEvent('save', seed('blocked')));
    expect(element.getEvents()).toHaveLength(1);
    element.readOnly = false;
    modal.dispatchEvent(uiEvent('save', seed('still-stale')));
    expect(element.getEvents()).toHaveLength(1);
    element.shadowRoot.querySelector('#create-event-btn').click();
    expect(element.shadowRoot.querySelector('#event-modal').hasAttribute('open')).toBe(true);
  });

  test.each([
    ['month', 'month-move'],
    ['week', 'time-move'],
    ['day', 'time-move'],
    ['week', 'resize'],
    ['day', 'resize'],
    ['week', 'create'],
    ['day', 'create']
  ])('toggling during %s %s cancels the gesture and all document handlers', (view, mode) => {
    const element = create(view);
    const renderer = element._currentViewInstance;
    const drag = renderer._dragController;
    const eventEl = startDrag(element, mode);
    expect(drag._active.dragging).toBe(true);
    const changed = jest.fn();
    const selected = jest.fn();
    element.addEventListener('calendar-event-update', changed);
    element.addEventListener('calendar-range-select', selected);
    element.readOnly = true;
    expect(drag._active).toBeNull();
    expect(drag._docListeners).toHaveLength(0);
    expect(drag._clickCleanup).toBeNull();
    expect(renderer._listeners).toHaveLength(0);
    expect(eventEl.classList.contains('fc-dragging')).toBe(false);
    expect(eventEl.style.transform).toBe('');
    if (mode === 'resize') expect(eventEl.style.height).toBe('60px');
    document.dispatchEvent(pointer('pointermove', 20, 720));
    document.dispatchEvent(pointer('pointerup', 20, 720));
    expect(changed).not.toHaveBeenCalled();
    expect(selected).not.toHaveBeenCalled();
    expect(element.getEvents()[0].start.getHours()).toBe(10);
    expect(element.getEvents()[0].end.getHours()).toBe(11);
    expect(element.shadowRoot.querySelector('.fc-drag-selection')).toBeNull();
    expect(element.shadowRoot.querySelector('.fc-resize-handle')).toBeNull();
  });

  test.each(['month', 'week', 'day'])(
    '%s readOnly never arms dragging or injects resize controls',
    view => {
      const element = create(view, true);
      const eventEl = element.shadowRoot.querySelector('.fc-event');
      const mutate = jest.spyOn(element.stateManager, 'updateEvent');
      eventEl.dispatchEvent(pointer('pointerdown'));
      document.dispatchEvent(pointer('pointermove', 10, 660));
      document.dispatchEvent(pointer('pointerup', 10, 660));
      const slot = element.shadowRoot.querySelector('.fc-hour-slot, .fc-month-day');
      slot.dispatchEvent(pointer('pointerdown'));
      document.dispatchEvent(pointer('pointermove', 10, 660));
      document.dispatchEvent(pointer('pointerup', 10, 660));
      expect(mutate).not.toHaveBeenCalled();
      expect(element._currentViewInstance._dragController).toBeNull();
      expect(element.shadowRoot.querySelector('.fc-resize-handle')).toBeNull();
      expect(element.shadowRoot.querySelector('.fc-drag-selection')).toBeNull();
    }
  );

  test.each(['month', 'week', 'day'])(
    '%s restores exactly one editing path after repeated toggles',
    view => {
      const element = create(view, true);
      const changed = jest.fn();
      element.addEventListener('calendar-event-update', changed);
      for (let index = 0; index < 3; index++) {
        element.readOnly = false;
        element.readOnly = true;
      }
      element.readOnly = false;
      expect(element.shadowRoot.querySelector('[role="grid"]').getAttribute('aria-readonly')).toBe(
        'false'
      );
      startDrag(element, view === 'month' ? 'month-move' : 'time-move');
      document.dispatchEvent(pointer('pointerup', 10, 660));
      expect(changed).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(0);
      const added = jest.fn();
      element.addEventListener('calendar-event-add', added);
      element.shadowRoot.querySelector('#event-modal').dispatchEvent(uiEvent('save', seed('new')));
      expect(added).toHaveBeenCalledTimes(1);
    }
  );

  test.each(['week', 'day'])(
    '%s restores resize and range creation after readOnly is disabled',
    view => {
      const element = create(view, true);
      element.readOnly = false;
      const updated = jest.fn();
      const range = jest.fn();
      element.addEventListener('calendar-event-update', updated);
      element.addEventListener('calendar-range-select', range);
      startDrag(element, 'resize');
      document.dispatchEvent(pointer('pointerup', 10, 660));
      expect(updated).toHaveBeenCalledTimes(1);
      expect(element.getEvents()[0].end.getHours()).toBe(12);
      jest.advanceTimersByTime(0);
      const modal = element.shadowRoot.querySelector('#event-modal');
      const open = jest.spyOn(modal, 'open');
      startDrag(element, 'create');
      document.dispatchEvent(pointer('pointerup', 10, 660));
      expect(range).toHaveBeenCalledTimes(1);
      // Reflecting the attribute must not recursively reset the form.
      expect(open).toHaveBeenCalledTimes(1);
      expect(modal.endInput.value).toBe(modal.formatDateForInput(range.mock.calls[0][0].detail.end));
      expect(modal.hasAttribute('open')).toBe(true);
    }
  );

  test('changes while detached and after destroy are respected on reattachment', () => {
    const element = create('week');
    element.remove();
    element.readOnly = true;
    expect(element.stateManager.getState().config.readOnly).toBe(true);
    document.body.appendChild(element);
    expect(element.getEvents()).toHaveLength(1);
    expect(element._currentViewInstance._dragController).toBeNull();
    element.destroy();
    element.readOnly = false;
    element.events = [seed('reloaded')];
    element.remove();
    document.body.appendChild(element);
    expect(element.readOnly).toBe(false);
    expect(element._currentViewInstance._dragController).not.toBeNull();
    expect(element.getEvents()[0].id).toBe('reloaded');
  });

  test.each(['month', 'week', 'day'])(
    '%s keeps trailing-click suppression through a successful re-render',
    view => {
      const element = create(view);
      const other = create('day', true);
      const selected = jest.fn();
      const otherSelected = jest.fn();
      element.stateManager.eventBus.on('event:selected', selected);
      other.stateManager.eventBus.on('event:selected', otherSelected);
      const oldDrag = element._currentViewInstance._dragController;
      startDrag(element, view === 'month' ? 'month-move' : 'time-move');
      document.dispatchEvent(pointer('pointerup', 10, 660));
      const liveDrag = element._currentViewInstance._dragController;
      expect(oldDrag._destroyed).toBe(true);
      expect(liveDrag).not.toBe(oldDrag);
      expect(liveDrag._clickCleanup).not.toBeNull();
      other.shadowRoot.querySelector('.fc-event').click();
      expect(otherSelected).toHaveBeenCalledTimes(1);
      element.shadowRoot.querySelector('.fc-event').click();
      expect(selected).not.toHaveBeenCalled();
      expect(liveDrag._clickCleanup).toBeNull();
      element.shadowRoot.querySelector('.fc-event').click();
      expect(selected).toHaveBeenCalledTimes(1);
    }
  );

  test('toggling readOnly releases the completed-drag click guard held by the replacement renderer', () => {
    const element = create('day');
    startDrag(element, 'time-move');
    document.dispatchEvent(pointer('pointerup', 10, 660));
    const liveDrag = element._currentViewInstance._dragController;
    expect(liveDrag._clickCleanup).not.toBeNull();
    element.readOnly = true;
    expect(liveDrag._clickCleanup).toBeNull();
    const selected = jest.fn();
    element.stateManager.eventBus.on('event:selected', selected);
    element.shadowRoot.querySelector('.fc-event').click();
    expect(selected).toHaveBeenCalledTimes(1);
  });

  test('a readOnly calendar does not block another instance or cancel its active interaction', () => {
    const readOnly = create('week', true);
    const editable = create('day');
    const changed = jest.fn();
    editable.addEventListener('calendar-event-update', changed);
    startDrag(editable, 'time-move');
    readOnly.readOnly = false;
    readOnly.readOnly = true;
    document.dispatchEvent(pointer('pointerup', 10, 660));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(editable.getEvents()[0].start.getHours()).toBe(11);
    expect(readOnly.getEvents()[0].start.getHours()).toBe(10);
    expect(editable.readOnly).toBe(false);
  });
});

describe('standalone renderer readOnly and drag cleanup', () => {
  const owned = [];
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    for (const { manager, renderer, container } of owned.splice(0)) {
      renderer.cleanup();
      manager.destroy();
      container.remove();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function render(Renderer, view, readOnly = false) {
    const manager = new StateManager({ view, date: new Date('2026-07-15T12:00:00'), readOnly });
    manager.setEvents([seed()]);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const renderer = new Renderer(container, manager);
    renderer.render();
    const instance = { manager, renderer, container };
    owned.push(instance);
    return instance;
  }

  test.each([
    ['month', MonthViewRenderer],
    ['week', WeekViewRenderer],
    ['day', DayViewRenderer]
  ])('%s uses the instance config without enabling edits', (view, Renderer) => {
    const { renderer, container } = render(Renderer, view, true);
    expect(renderer.readOnly).toBe(true);
    expect(renderer._dragController).toBeNull();
    expect(container.querySelector('.fc-resize-handle')).toBeNull();
  });

  test('checks live config when an already-bound pointer interaction starts or ends', () => {
    const { manager, renderer, container } = render(DayViewRenderer, 'day');
    const eventEl = container.querySelector('.fc-event');
    const drag = renderer._dragController;
    manager.updateConfig({ readOnly: true });
    eventEl.dispatchEvent(pointer('pointerdown'));
    expect(drag._active).toBeNull();
    manager.updateConfig({ readOnly: false });
    mockLayout(container);
    eventEl.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', 10, 660));
    expect(drag._active.dragging).toBe(true);
    manager.updateConfig({ readOnly: true });
    document.dispatchEvent(pointer('pointerup', 10, 660));
    expect(manager.getEvents()[0].start.getHours()).toBe(10);
    expect(drag._active).toBeNull();
    expect(drag._docListeners).toHaveLength(0);
  });

  test('renderer cleanup cancels active drag and its stale pointer handlers cannot re-arm', () => {
    const { manager, renderer, container } = render(DayViewRenderer, 'day');
    mockLayout(container);
    const eventEl = container.querySelector('.fc-event');
    const drag = renderer._dragController;
    eventEl.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', 10, 660));
    renderer.cleanup();
    eventEl.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointerup', 10, 660));
    expect(drag._active).toBeNull();
    expect(drag._docListeners).toHaveLength(0);
    expect(manager.getEvents()[0].start.getHours()).toBe(10);
  });

  test('post-drag click suppression is instance-scoped and cleanup releases it', () => {
    const { renderer, container } = render(DayViewRenderer, 'day');
    const other = render(DayViewRenderer, 'day');
    mockLayout(container);
    const eventEl = container.querySelector('.fc-event');
    const drag = renderer._dragController;
    eventEl.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', 10, 660));
    document.dispatchEvent(pointer('pointerup', 10, 660));
    expect(drag._clickCleanup).not.toBeNull();
    const selected = jest.fn();
    other.manager.eventBus.on('event:selected', selected);
    other.container.querySelector('.fc-event').click();
    expect(selected).toHaveBeenCalledTimes(1);
    renderer.cleanup();
    expect(drag._clickCleanup).toBeNull();
  });
});
