import '../../src/components/ForceCalendar.js';

describe('ForceCalendar attribute reactivity', () => {
    let el;

    beforeEach(async () => {
        el = document.createElement('forcecal-main');
        el.setAttribute('view', 'month');
        document.body.appendChild(el);
        await new Promise((r) => setTimeout(r, 20));
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
            end: new Date(Date.now() + 3600000).toISOString(),
        });
        el.setAttribute('view', 'week');
        expect(el.getEvents()).toHaveLength(1);
    });
});
