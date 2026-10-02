import '../../src/components/ForceCalendar.js';
import StateManager from '../../src/core/StateManager.js';

const event = id => ({
  id,
  title: id,
  start: new Date('2026-10-02T10:00:00Z'),
  end: new Date('2026-10-02T11:00:00Z')
});

describe('owned calendar lifecycle', () => {
  let element;

  beforeEach(() => {
    jest.useFakeTimers();
    element = document.createElement('forcecal-main');
    element.setAttribute('date', '2026-10-02');
  });

  afterEach(() => {
    element.destroy();
    element.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('StateManager destroys its owned Calendar exactly once', () => {
    const manager = new StateManager();
    const calendar = manager.calendar;
    const destroy = jest.spyOn(calendar, 'destroy');
    manager.destroy();
    manager.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(manager.calendar).toBeNull();
    expect(manager.state).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(['before mounting', 'after destroy'])('%s the complete public API is safe', state => {
    if (state === 'after destroy') {
      document.body.appendChild(element);
      element.destroy();
    }
    const navigated = jest.fn();
    element.addEventListener('calendar-navigate', navigated);
    expect(element.getEvents()).toEqual([]);
    expect(element.addEvent(event('ignored'))).toBeNull();
    expect(element.updateEvent('ignored', { title: 'ignored' })).toBeNull();
    expect(element.deleteEvent('ignored')).toBe(false);
    expect(() => element.setView('week')).not.toThrow();
    expect(() => element.setDate(new Date())).not.toThrow();
    expect(() => element.next()).not.toThrow();
    expect(() => element.previous()).not.toThrow();
    expect(() => element.today()).not.toThrow();
    expect(element.getVisibleRange()).toBeNull();
    expect(navigated).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    expect(element.setEvents([event('queued')])).toBeNull();
    expect(element.getEvents().map(item => item.id)).toEqual(['queued']);
  });

  test('repeated destroy and reattach release every owned timer and replay queued snapshots', () => {
    document.body.appendChild(element);
    const firstCalendar = element.stateManager.calendar;
    jest.advanceTimersByTime(0);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    for (let cycle = 0; cycle < 3; cycle++) {
      element.destroy();
      element.destroy();
      expect(jest.getTimerCount()).toBe(0);
      element.setEvents([event(`queued-${cycle}`)]);
      element.remove();
      document.body.appendChild(element);
      jest.advanceTimersByTime(0);
      expect(element.getEvents().map(item => item.id)).toEqual([`queued-${cycle}`]);
      expect(element.stateManager.calendar).not.toBe(firstCalendar);
      expect(element.stateManager.subscribers.size).toBe(1);
      expect(element.shadowRoot.querySelectorAll('#fc-root')).toHaveLength(1);
    }
    element.destroy();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('detach retains the Calendar while explicit destroy releases it', () => {
    document.body.appendChild(element);
    jest.advanceTimersByTime(0);
    const calendar = element.stateManager.calendar;
    const destroy = jest.spyOn(calendar, 'destroy');
    element.addEvent(event('retained'));
    element.remove();
    expect(destroy).not.toHaveBeenCalled();
    expect(element.getEvents().map(item => item.id)).toEqual(['retained']);
    document.body.appendChild(element);
    expect(element.stateManager.calendar).toBe(calendar);
    element.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
