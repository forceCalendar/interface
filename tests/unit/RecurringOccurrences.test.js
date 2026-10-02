import StateManager from '../../src/core/StateManager.js';
import { MonthViewRenderer } from '../../src/renderers/MonthViewRenderer.js';
import { WeekViewRenderer } from '../../src/renderers/WeekViewRenderer.js';
import { DayViewRenderer } from '../../src/renderers/DayViewRenderer.js';
import { Event as CoreEvent } from '@forcecalendar/core';

const pointer = (type, x, y) =>
  new MouseEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y, button: 0 });

// Weekly series starting Wed 1 Jul 2026 10:00-11:00: 1, 8, 15, 22, 29 July
const series = () => ({
  id: 'standup',
  title: 'Standup',
  start: new Date(2026, 6, 1, 10, 0),
  end: new Date(2026, 6, 1, 11, 0),
  recurrenceRule: 'FREQ=WEEKLY;COUNT=5'
});
const occurrenceId = day => CoreEvent.occurrenceId('standup', new Date(2026, 6, day, 10, 0));

describe('StateManager occurrence resolution', () => {
  let manager;

  beforeEach(() => {
    manager = new StateManager({ view: 'month', date: new Date(2026, 6, 15, 12) });
    manager.addEvent(series());
  });

  afterEach(() => manager.destroy());

  test('findEvent() resolves occurrence ids to the master, with a state fallback', () => {
    const master = manager.getEvents()[0];
    expect(manager.findEvent('standup')).toBe(master);
    expect(manager.findEvent(occurrenceId(15))).toBe(master);
    expect(manager.findEvent('missing')).toBeNull();
    expect(manager.findEvent('missing_123')).toBeNull();

    manager.calendar.getEvent = undefined;
    expect(manager.findEvent(occurrenceId(22))).toBe(master);
    expect(manager.findEvent('standup')).toBe(master);
  });

  test('resolveEventInstance() reports the occurrence times with the master', () => {
    const master = manager.getEvents()[0];
    const instance = manager.resolveEventInstance(occurrenceId(15));
    expect(instance.event).toBe(master);
    expect(instance.start).toEqual(new Date(2026, 6, 15, 10, 0));
    expect(instance.end).toEqual(new Date(2026, 6, 15, 11, 0));

    const own = manager.resolveEventInstance('standup');
    expect(own.start).toEqual(new Date(2026, 6, 1, 10, 0));
    expect(manager.resolveEventInstance('missing')).toBeNull();
  });

  test('selectEventById() selects the master for an occurrence id', () => {
    const selected = [];
    manager.eventBus.on('event:selected', data => selected.push(data.event));
    manager.selectEventById(occurrenceId(8));
    expect(selected).toEqual([manager.getEvents()[0]]);
    expect(manager.getState().selectedEvent).toBe(manager.getEvents()[0]);
  });
});

describe('Clicking a recurring occurrence chip', () => {
  let manager, container, renderer;

  beforeEach(() => {
    manager = new StateManager({ view: 'month', date: new Date(2026, 6, 15, 12) });
    manager.addEvent(series());
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new MonthViewRenderer(container, manager);
    renderer.render();
  });

  afterEach(() => {
    renderer.cleanup();
    container.remove();
    manager.destroy();
  });

  test('selects and emits the master event', () => {
    const chips = container.querySelectorAll('.fc-event[data-event-id^="standup_"]');
    expect(chips).toHaveLength(5);
    const selected = [];
    manager.eventBus.on('event:selected', data => selected.push(data.event));

    chips[2].click();

    const master = manager.getEvents()[0];
    expect(chips[2].dataset.eventId).toBe(occurrenceId(15));
    expect(selected).toEqual([master]);
    expect(manager.getState().selectedEvent).toBe(master);
    expect(master.isOccurrence).toBeFalsy();
  });
});

describe('Recurring drag/resize safety', () => {
  let manager, container, renderer;
  const mount = (Renderer, view) => {
    manager = new StateManager({ view, date: new Date(2026, 6, 15, 12) });
    manager.addEvent(series());
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new Renderer(container, manager);
    renderer.render();
    return jest.spyOn(manager, 'updateEvent');
  };
  afterEach(() => {
    renderer.cleanup();
    container.remove();
    manager.destroy();
  });
  test.each([
    ['month', MonthViewRenderer],
    ['week', WeekViewRenderer],
    ['day', DayViewRenderer]
  ])('%s prevents pointer mutation while keeping selection available', (view, Renderer) => {
    const update = mount(Renderer, view);
    const before = manager.getEvents()[0].toObject();
    const chip = container.querySelector(`.fc-event[data-event-id="${occurrenceId(15)}"]`);
    expect(chip).not.toBeNull();
    expect(chip.querySelector('.fc-resize-handle')).toBeNull();
    chip.dispatchEvent(pointer('pointerdown', 10, 600));
    document.dispatchEvent(pointer('pointermove', 130, 690));
    document.dispatchEvent(pointer('pointerup', 130, 690));
    expect(renderer._dragController._active).toBeNull();
    expect(renderer._dragController._docListeners).toHaveLength(0);
    expect(chip.classList.contains('fc-dragging')).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(manager.getEvents()[0].toObject()).toEqual(before);
    chip.click();
    expect(manager.getState().selectedEvent.id).toBe('standup');
  });
  test('commit methods reject a recurring master even with stale interaction state', () => {
    const update = mount(WeekViewRenderer, 'week');
    const controller = renderer._dragController;
    const master = manager.getEvents()[0];
    const column = container.querySelector('.fc-week-day-column');
    controller._active = {
      eventId: occurrenceId(15),
      dropCell: { dataset: { date: '2026-07-18' } }
    };
    controller._monthDrop();
    controller._active = { eventId: occurrenceId(15), deltaMinutes: 30, dropColumn: column };
    controller._timeMoveDrop();
    controller._active = { eventId: occurrenceId(15), newHeight: 90, originHeight: 60 };
    controller._resizeDrop();
    controller._shiftEvent(master, 60000);
    expect(update).not.toHaveBeenCalled();
    controller._active = null;
  });
  test.each(['pointermove', 'pointerup'])(
    'rechecks recurrence at %s and cancels an armed resize',
    type => {
      const update = mount(WeekViewRenderer, 'week');
      const event = manager.addEvent({
        id: 'single',
        title: 'Single',
        start: new Date(2026, 6, 15, 12),
        end: new Date(2026, 6, 15, 13)
      });
      renderer.render();
      update.mockClear();
      const chip = container.querySelector('.fc-event[data-event-id="single"]');
      const handle = chip.querySelector('.fc-resize-handle');
      expect(handle).not.toBeNull();
      const height = chip.style.height;
      handle.dispatchEvent(pointer('pointerdown', 10, 780));
      document.dispatchEvent(pointer('pointermove', 10, 810));
      event.recurring = true; // Host mutates state while the pointer gesture is active.
      document.dispatchEvent(pointer(type, 10, 830));
      expect(renderer._dragController._active).toBeNull();
      expect(chip.style.height).toBe(height);
      expect(update).not.toHaveBeenCalled();
    }
  );
  test.each(['recurring', 'recurrenceRule', 'isOccurrence', 'recurringEventId'])(
    'shared guard recognizes %s',
    flag => {
      const update = mount(WeekViewRenderer, 'week');
      const event = {
        id: 'single',
        [flag]: flag === 'recurring' || flag === 'isOccurrence' ? true : 'series'
      };
      renderer._dragController._shiftEvent(event, 60000);
      expect(update).not.toHaveBeenCalled();
    }
  );
});
