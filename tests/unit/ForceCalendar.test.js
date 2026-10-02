import '../../src/components/ForceCalendar.js';

describe('ForceCalendar week titles', () => {
  let el;
  const flush = () => new Promise(r => setTimeout(r, 20));

  beforeEach(() => {
    el = document.createElement('forcecal-main');
    el.setAttribute('view', 'week');
  });

  afterEach(() => {
    el.remove();
  });

  test.each([
    [undefined, '2026-10-02', '2026-09-27', '2026-10-03', 'Sep 27, 2026 - October 3, 2026'],
    [0, '2026-10-04', '2026-10-04', '2026-10-10', 'Oct 4, 2026 - October 10, 2026'],
    [1, '2026-10-02', '2026-09-28', '2026-10-04', 'Sep 28, 2026 - October 4, 2026'],
    [1, '2026-10-05', '2026-10-05', '2026-10-11', 'Oct 5, 2026 - October 11, 2026'],
    [0, '2027-01-01', '2026-12-27', '2027-01-02', 'December 27, 2026 - January 2, 2027'],
    [1, '2027-01-01', '2026-12-28', '2027-01-03', 'December 28, 2026 - January 3, 2027']
  ])(
    'weekStartsOn=%s on %s keeps the title, visible range and grid aligned',
    async (weekStartsOn, date, start, end, title) => {
      el.setAttribute('date', `${date}T12:00:00`);
      if (weekStartsOn !== undefined) {
        el.setAttribute('week-starts-on', String(weekStartsOn));
      }
      document.body.appendChild(el);
      await flush();

      const range = el.getVisibleRange();
      const startDate = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      const columns = el.shadowRoot.querySelectorAll('.fc-week-day-column');

      expect(range.start).toEqual(startDate);
      expect(range.end).toEqual(new Date(`${end}T23:59:59.999`));
      expect(columns).toHaveLength(7);
      expect(new Date(columns[0].dataset.date)).toEqual(startDate);
      expect(new Date(columns[6].dataset.date)).toEqual(endDate);
      expect(el.getTitle(new Date(`${date}T12:00:00`), 'week')).toBe(title);
      expect(el.shadowRoot.querySelector('.fc-title').textContent).toBe(title);
    }
  );

  test('changing the week start and locale updates the rendered title', async () => {
    el.setAttribute('date', '2027-01-01T12:00:00');
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot.querySelector('.fc-title').textContent).toBe(
      'December 27, 2026 - January 2, 2027'
    );

    el.setAttribute('week-starts-on', '1');
    el.setAttribute('locale', 'de-DE');
    await flush();

    expect(el.shadowRoot.querySelector('.fc-title').textContent).toBe(
      '28. Dezember 2026 - 3. Januar 2027'
    );
    expect(el.getVisibleRange().start).toEqual(new Date(2026, 11, 28));
  });
});

describe('ForceCalendar attribute reactivity', () => {
  let el;

  beforeEach(async () => {
    el = document.createElement('forcecal-main');
    el.setAttribute('view', 'month');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 20));
  });

  afterEach(() => {
    el.remove();
  });

  test('initializes with the view attribute', () => {
    expect(el.stateManager.getView()).toBe('month');
  });

  test('changing the view attribute switches the calendar view', () => {
    el.setAttribute('view', 'week');
    expect(el.stateManager.getView()).toBe('week');
    el.setAttribute('view', 'day');
    expect(el.stateManager.getView()).toBe('day');
  });

  test('changing the date attribute navigates the calendar', () => {
    el.setAttribute('date', '2026-03-15');
    const current = el.stateManager.getCurrentDate();
    expect(current.getFullYear()).toBe(2026);
    expect(current.getMonth()).toBe(2);
  });

  test('changing locale and week-starts-on updates calendar config', () => {
    el.setAttribute('locale', 'de-DE');
    el.setAttribute('week-starts-on', '1');
    const state = el.stateManager.getState();
    expect(state.config.locale).toBe('de-DE');
    expect(state.config.weekStartsOn).toBe(1);
  });

  test('changing the timezone attribute updates the calendar timezone', () => {
    el.setAttribute('timezone', 'Asia/Tokyo');
    expect(el.stateManager.calendar.getTimezone()).toBe('Asia/Tokyo');
  });

  test('events survive a view switch', () => {
    el.addEvent({
      id: 'e1',
      title: 'Persistent',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString()
    });
    el.setAttribute('view', 'week');
    expect(el.getEvents()).toHaveLength(1);
  });
});

describe('Theme presets', () => {
  test('theme="slds" applies and clears host-level tokens', async () => {
    const el = document.createElement('forcecal-main');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 0));

    el.setAttribute('theme', 'slds');
    await new Promise(r => setTimeout(r, 0));
    expect(el.style.getPropertyValue('--fc-primary-color')).toBe('#0176d3');
    expect(el.style.getPropertyValue('--fc-background-alt')).toBe('#f3f3f3');

    el.removeAttribute('theme');
    await new Promise(r => setTimeout(r, 0));
    expect(el.style.getPropertyValue('--fc-primary-color')).toBe('');
    el.remove();
  });
});

describe('ForceCalendar detach and re-attach', () => {
  const flush = () => new Promise(r => setTimeout(r, 0));
  let el;

  beforeEach(async () => {
    el = document.createElement('forcecal-main');
    el.setAttribute('view', 'month');
    document.body.appendChild(el);
    await flush();
  });

  afterEach(() => {
    el.remove();
  });

  test('moving the element to another container keeps state, events and DOM working', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    el.setAttribute('view', 'week');
    el.addEvent({
      id: 'keep-me',
      title: 'Survivor',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString()
    });

    expect(() => target.appendChild(el)).not.toThrow();
    await flush();

    expect(el.parentNode).toBe(target);
    expect(el.stateManager.state).not.toBeNull();
    expect(el.stateManager.calendar).not.toBeNull();
    expect(el.stateManager.getView()).toBe('week');
    expect(el.getEvents()).toHaveLength(1);
    expect(el.shadowRoot.querySelector('#calendar-view-container').children.length).toBeGreaterThan(
      0
    );
    expect(el.shadowRoot.querySelectorAll('#fc-root')).toHaveLength(1);
    expect(el.shadowRoot.querySelectorAll('style')).toHaveLength(1);
    target.remove();
  });

  test('public API and attribute reactivity keep working after re-attach', async () => {
    el.remove();
    document.body.appendChild(el);
    await flush();

    expect(() =>
      el.addEvent({
        id: 'after',
        title: 'After',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString()
      })
    ).not.toThrow();
    expect(el.getEvents()).toHaveLength(1);

    el.setAttribute('view', 'day');
    expect(el.stateManager.getView()).toBe('day');
    expect(
      el.shadowRoot.querySelector('.fc-view-btn.active, [data-view="day"].active')
    ).not.toBeNull();

    el.setAttribute('date', '2026-03-15');
    expect(el.stateManager.getCurrentDate().getMonth()).toBe(2);
    expect(() => el.next()).not.toThrow();
    expect(() => el.today()).not.toThrow();
  });

  test('repeated attach cycles do not multiply subscriptions, listeners or timers', async () => {
    el.setAttribute('view', 'week');
    await flush();
    const listenersAfterFirstMount = el._listeners.length;
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    for (let i = 0; i < 4; i++) {
      el.remove();
      document.body.appendChild(el);
    }
    await flush();

    // Each detach clears the now-indicator timer and each re-attach starts one,
    // so exactly one interval is live at the end
    expect(setIntervalSpy).toHaveBeenCalledTimes(4);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(4);
    expect(el._currentViewInstance._nowIndicatorTimer).toBeTruthy();
    expect(el.stateManager.subscribers.size).toBe(1);
    expect(el.stateManager.eventBus.events.get('view:changed')).toHaveLength(1);
    expect(el._listeners.length).toBe(listenersAfterFirstMount);

    const seen = [];
    el.addEventListener('calendar-view-change', e => seen.push(e.detail));
    el.setView('day');
    expect(seen).toHaveLength(1);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  test('synchronous unmount and remount (StrictMode style) keeps a single rendered tree', async () => {
    const parent = el.parentNode;
    parent.removeChild(el);
    parent.appendChild(el);
    parent.removeChild(el);
    parent.appendChild(el);
    await flush();

    expect(el.shadowRoot.querySelectorAll('#fc-root')).toHaveLength(1);
    expect(el.shadowRoot.querySelectorAll('.fc-title')).toHaveLength(1);
    expect(el.stateManager.getView()).toBe('month');
  });

  test('explicit destroy() is still honoured and a later re-attach starts fresh', async () => {
    el.addEvent({
      id: 'gone',
      title: 'Gone',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString()
    });
    el.destroy();
    expect(el.stateManager.state).toBeNull();

    el.remove();
    expect(() => document.body.appendChild(el)).not.toThrow();
    await flush();

    expect(el.stateManager.state).not.toBeNull();
    expect(el.getEvents()).toHaveLength(0);
    expect(el.stateManager.getView()).toBe('month');
  });
});

describe('ForceCalendar detached and destroyed behaviour', () => {
  let el;
  const flush = () => new Promise(r => setTimeout(r, 20));
  const event = id => ({
    id,
    title: id,
    start: new Date(2026, 2, 3, 9).toISOString(),
    end: new Date(2026, 2, 3, 10).toISOString()
  });

  beforeEach(async () => {
    el = document.createElement('forcecal-main');
    el.setAttribute('view', 'month');
    el.setAttribute('date', '2026-03-15T12:00:00');
    document.body.appendChild(el);
    await flush();
  });

  afterEach(() => {
    el.remove();
  });

  test('after destroy() the API queues or no-ops instead of throwing', async () => {
    el.destroy();

    expect(el.events).toEqual([]);
    expect(el.getVisibleRange()).toBeNull();
    expect(el.setEvents([event('queued')])).toBeNull();
    expect(el.events.map(e => e.id)).toEqual(['queued']);
    expect(() => el.setAttribute('view', 'week')).not.toThrow();
    expect(() => el.setAttribute('date', '2026-05-01')).not.toThrow();

    el.remove();
    document.body.appendChild(el);
    await flush();

    expect(el.stateManager.getView()).toBe('week');
    expect(el.stateManager.getCurrentDate().getMonth()).toBe(4);
    expect(el.getEvents().map(e => e.id)).toEqual(['queued']);
  });

  test('attribute changes while detached update state without rendering, then render on re-attach', async () => {
    const seen = [];
    el.addEventListener('calendar-range-change', e => seen.push(e.detail.view));
    el.remove();
    const renderSpy = jest.spyOn(el, 'render');
    const intervalSpy = jest.spyOn(window, 'setInterval');

    el.setAttribute('view', 'week');

    expect(el.stateManager.getView()).toBe('week');
    expect(renderSpy).not.toHaveBeenCalled();
    expect(intervalSpy).not.toHaveBeenCalled();
    expect(el._currentViewInstance).toBeNull();
    // The range change caused by the attribute is still dispatched on the element
    expect(seen).toEqual(['week']);

    document.body.appendChild(el);
    await flush();

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot.querySelector('[data-view="week"].active')).not.toBeNull();
    expect(el.shadowRoot.querySelectorAll('#fc-root')).toHaveLength(1);
    // Re-attaching announces the (now current) window once
    expect(seen).toEqual(['week', 'week']);
    renderSpy.mockRestore();
    intervalSpy.mockRestore();
  });

  test('API calls made while detached still dispatch their DOM events', async () => {
    const counts = {};
    [
      'calendar-events-set',
      'calendar-navigate',
      'calendar-view-change',
      'calendar-event-add'
    ].forEach(name => {
      counts[name] = 0;
      el.addEventListener(name, () => counts[name]++);
    });
    el.remove();

    el.setEvents([event('a')]);
    el.next();
    el.setView('day');
    el.addEvent(event('z'));

    expect(counts).toEqual({
      'calendar-events-set': 1,
      'calendar-navigate': 1,
      'calendar-view-change': 1,
      'calendar-event-add': 1
    });

    document.body.appendChild(el);
    await flush();
    expect(el.stateManager.eventBus.events.get('view:changed')).toHaveLength(1);
    expect(el.getEvents()).toHaveLength(2);
  });

  test('views without a renderer fall back with a warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    el.setAttribute('view', 'list');
    expect(el.stateManager.getView()).toBe('month');
    el.setView('week');
    el.setView('agenda');
    expect(el.stateManager.getView()).toBe('week');
    expect(warn).toHaveBeenCalledTimes(2);

    const fresh = document.createElement('forcecal-main');
    fresh.setAttribute('view', 'list');
    document.body.appendChild(fresh);
    await flush();
    expect(fresh.stateManager.getView()).toBe('month');
    expect(
      fresh.shadowRoot.querySelector('#calendar-view-container').children.length
    ).toBeGreaterThan(0);
    fresh.remove();
    warn.mockRestore();
  });
});
