import StateManager from '../../src/core/StateManager.js';
import { WeekViewRenderer } from '../../src/renderers/WeekViewRenderer.js';
import { DayViewRenderer } from '../../src/renderers/DayViewRenderer.js';

function setup(RendererClass, view) {
    const manager = new StateManager({ view, date: new Date('2026-07-15T12:00:00') });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const renderer = new RendererClass(container, manager);
    renderer.render();
    return { manager, container, renderer };
}

describe('Time grid accessibility (week view)', () => {
    let ctx;
    beforeEach(() => { ctx = setup(WeekViewRenderer, 'week'); });
    afterEach(() => { ctx.renderer.cleanup(); ctx.container.remove(); });

    test('exposes grid, rows, and hour gridcells', () => {
        const grid = ctx.container.querySelector('[role="grid"]');
        expect(grid).not.toBeNull();
        expect(grid.getAttribute('aria-label')).toContain('Week of');
        expect(ctx.container.querySelectorAll('[role="row"]').length).toBe(7);
        expect(ctx.container.querySelectorAll('[role="gridcell"]').length).toBe(7 * 24);
        const slot = ctx.container.querySelector('.fc-hour-slot[data-hour="9"]');
        expect(slot.getAttribute('aria-label')).toMatch(/9/);
    });

    test('exactly one slot is tabbable', () => {
        expect(ctx.container.querySelectorAll('.fc-hour-slot[tabindex="0"]').length).toBe(1);
    });

    test('arrow keys move between hours and days', () => {
        const cols = Array.from(ctx.container.querySelectorAll('.fc-week-day-column'));
        const start = cols[2].querySelector('.fc-hour-slot[data-hour="9"]');
        start.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(cols[2].querySelector('.fc-hour-slot[data-hour="10"]').getAttribute('tabindex')).toBe('0');
        cols[2].querySelector('.fc-hour-slot[data-hour="10"]')
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(cols[3].querySelector('.fc-hour-slot[data-hour="10"]').getAttribute('tabindex')).toBe('0');
    });

    test('Enter selects the slot date and hour', () => {
        const cols = Array.from(ctx.container.querySelectorAll('.fc-week-day-column'));
        const slot = cols[1].querySelector('.fc-hour-slot[data-hour="14"]');
        slot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        const selected = ctx.manager.getState().selectedDate;
        expect(selected).not.toBeNull();
        expect(selected.getHours()).toBe(14);
    });
});

describe('Time grid accessibility (day view)', () => {
    let ctx;
    beforeEach(() => { ctx = setup(DayViewRenderer, 'day'); });
    afterEach(() => { ctx.renderer.cleanup(); ctx.container.remove(); });

    test('exposes a single row of 24 hour gridcells', () => {
        expect(ctx.container.querySelector('[role="grid"]')).not.toBeNull();
        expect(ctx.container.querySelectorAll('[role="row"]').length).toBe(1);
        expect(ctx.container.querySelectorAll('[role="gridcell"]').length).toBe(24);
    });

    test('Home and End jump to day bounds', () => {
        const slot = ctx.container.querySelector('.fc-hour-slot[data-hour="9"]');
        slot.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(ctx.container.querySelector('.fc-hour-slot[data-hour="23"]').getAttribute('tabindex')).toBe('0');
        ctx.container.querySelector('.fc-hour-slot[data-hour="23"]')
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
        expect(ctx.container.querySelector('.fc-hour-slot[data-hour="0"]').getAttribute('tabindex')).toBe('0');
    });

    test('time gutter is hidden from assistive tech', () => {
        expect(ctx.container.querySelector('.fc-time-gutter').getAttribute('aria-hidden')).toBe('true');
    });
});
