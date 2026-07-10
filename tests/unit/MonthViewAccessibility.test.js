import StateManager from '../../src/core/StateManager.js';
import { MonthViewRenderer } from '../../src/renderers/MonthViewRenderer.js';

describe('MonthViewRenderer accessibility', () => {
    let manager;
    let container;
    let renderer;

    beforeEach(() => {
        manager = new StateManager({
            view: 'month',
            date: new Date('2026-07-15T12:00:00')
        });
        manager.addEvent({
            id: 'evt-1',
            title: 'Team Standup',
            start: new Date('2026-07-15T10:00:00'),
            end: new Date('2026-07-15T10:30:00')
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        renderer = new MonthViewRenderer(container, manager);
        renderer.render();
    });

    afterEach(() => {
        renderer.cleanup();
        container.remove();
    });

    test('renders WAI-ARIA grid semantics', () => {
        const grid = container.querySelector('[role="grid"]');
        expect(grid).not.toBeNull();
        expect(grid.getAttribute('aria-label')).toContain('2026');

        expect(container.querySelectorAll('[role="columnheader"]').length).toBe(7);
        expect(container.querySelectorAll('[role="row"]').length).toBeGreaterThanOrEqual(5);
        expect(container.querySelectorAll('[role="gridcell"]').length % 7).toBe(0);
    });

    test('marks today and labels cells with date and event count', () => {
        const cells = container.querySelectorAll('.fc-month-day');
        for (const cell of cells) {
            expect(cell.getAttribute('aria-label')).toBeTruthy();
        }
        const withEvent = Array.from(cells).find(c =>
            (c.getAttribute('aria-label') || '').includes('1 event')
        );
        expect(withEvent).toBeTruthy();
    });

    test('exactly one cell is tabbable (roving tabindex)', () => {
        const tabbable = container.querySelectorAll('.fc-month-day[tabindex="0"]');
        expect(tabbable.length).toBe(1);
    });

    test('arrow keys move focus between cells', () => {
        const cells = Array.from(container.querySelectorAll('.fc-month-day'));
        const start = container.querySelector('.fc-month-day[tabindex="0"]');
        const idx = cells.indexOf(start);
        start.focus();

        start.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
        );
        expect(document.activeElement === cells[idx + 1] ||
               container.getRootNode().activeElement === cells[idx + 1]).toBe(true);
        expect(cells[idx + 1].getAttribute('tabindex')).toBe('0');
        expect(start.getAttribute('tabindex')).toBe('-1');

        cells[idx + 1].dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
        );
        expect(cells[idx + 8].getAttribute('tabindex')).toBe('0');
    });

    test('Enter selects the focused date', () => {
        const cell = container.querySelector('.fc-month-day[tabindex="0"]');
        const date = new Date(cell.dataset.date);
        cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(manager.getState().selectedDate?.toDateString()).toBe(date.toDateString());
    });

    test('selected cell exposes aria-selected', () => {
        const cell = container.querySelector('.fc-month-day[tabindex="0"]');
        cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        renderer.render();
        const selected = container.querySelector('.fc-month-day[aria-selected="true"]');
        expect(selected).not.toBeNull();
    });

    test('events are keyboard-reachable buttons with labels', () => {
        const evt = container.querySelector('.fc-event');
        expect(evt).not.toBeNull();
        expect(evt.getAttribute('role')).toBe('button');
        expect(evt.getAttribute('tabindex')).toBe('0');
        expect(evt.getAttribute('aria-label')).toContain('Team Standup');
    });

    test('Enter on an event selects it', () => {
        const evt = container.querySelector('.fc-event');
        evt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(manager.getState().selectedEvent?.id).toBe('evt-1');
    });
});
