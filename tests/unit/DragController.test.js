import StateManager from '../../src/core/StateManager.js';
import { MonthViewRenderer } from '../../src/renderers/MonthViewRenderer.js';
import { WeekViewRenderer } from '../../src/renderers/WeekViewRenderer.js';
import {
    snapMinutes,
    clampStartMinutes,
    moveDatePreservingTime,
} from '../../src/core/DragController.js';

const pointer = (type, x, y) =>
    new MouseEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y, button: 0 });

function mockRects(els, rectFor) {
    els.forEach((el, i) => {
        el.getBoundingClientRect = () => rectFor(el, i);
    });
}

describe('Drag math', () => {
    test('snapMinutes snaps to the 15-minute grid', () => {
        expect(snapMinutes(0)).toBe(0);
        expect(snapMinutes(7)).toBe(0);
        expect(snapMinutes(8)).toBe(15);
        expect(snapMinutes(-22)).toBe(-15);
    });

    test('clampStartMinutes keeps the event inside the day', () => {
        expect(clampStartMinutes(-30, 60)).toBe(0);
        expect(clampStartMinutes(23 * 60 + 30, 60)).toBe(23 * 60);
        expect(clampStartMinutes(600, 60)).toBe(600);
    });

    test('moveDatePreservingTime keeps the wall-clock time', () => {
        const moved = moveDatePreservingTime(
            new Date('2026-07-20T00:00:00'),
            new Date('2026-07-15T09:30:15')
        );
        expect(moved.getDate()).toBe(20);
        expect(moved.getHours()).toBe(9);
        expect(moved.getMinutes()).toBe(30);
    });
});

describe('Month view drag-to-move', () => {
    let manager, container, renderer;

    beforeEach(() => {
        manager = new StateManager({ view: 'month', date: new Date('2026-07-15T12:00:00') });
        manager.addEvent({
            id: 'evt-1',
            title: 'Movable',
            start: new Date('2026-07-15T10:00:00'),
            end: new Date('2026-07-15T11:00:00'),
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        renderer = new MonthViewRenderer(container, manager);
        renderer.render();

        const cells = Array.from(container.querySelectorAll('.fc-month-day'));
        mockRects(cells, (el, i) => {
            const col = i % 7;
            const row = Math.floor(i / 7);
            return { left: col * 100, right: col * 100 + 100, top: row * 80, bottom: row * 80 + 80 };
        });
    });

    afterEach(() => {
        renderer.cleanup();
        container.remove();
    });

    test('dragging an event to another cell moves it, preserving time of day', () => {
        const eventEl = container.querySelector('.fc-event[data-event-id="evt-1"]');
        const cells = Array.from(container.querySelectorAll('.fc-month-day'));
        const originIdx = cells.indexOf(eventEl.closest('.fc-month-day'));
        const targetIdx = originIdx + 2; // two days later, same row
        const targetCenter = {
            x: (targetIdx % 7) * 100 + 50,
            y: Math.floor(targetIdx / 7) * 80 + 40,
        };

        eventEl.dispatchEvent(pointer('pointerdown', 10, 10));
        document.dispatchEvent(pointer('pointermove', targetCenter.x, targetCenter.y));
        expect(cells[targetIdx].classList.contains('fc-drop-target')).toBe(true);
        document.dispatchEvent(pointer('pointerup', targetCenter.x, targetCenter.y));

        const moved = manager.getEvents().find(e => e.id === 'evt-1');
        expect(new Date(moved.start).getDate()).toBe(17);
        expect(new Date(moved.start).getHours()).toBe(10);
        expect(new Date(moved.end).getHours()).toBe(11);
    });

    test('a sub-threshold drag does not move the event', () => {
        const eventEl = container.querySelector('.fc-event[data-event-id="evt-1"]');
        eventEl.dispatchEvent(pointer('pointerdown', 10, 10));
        document.dispatchEvent(pointer('pointermove', 12, 11));
        document.dispatchEvent(pointer('pointerup', 12, 11));
        const evt = manager.getEvents().find(e => e.id === 'evt-1');
        expect(new Date(evt.start).getDate()).toBe(15);
    });
});

describe('Time grid interactions', () => {
    let manager, container, renderer;

    beforeEach(() => {
        manager = new StateManager({ view: 'week', date: new Date('2026-07-15T12:00:00') });
        manager.addEvent({
            id: 'evt-2',
            title: 'Timed',
            start: new Date('2026-07-15T10:00:00'),
            end: new Date('2026-07-15T11:00:00'),
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        renderer = new WeekViewRenderer(container, manager);
        renderer.render();

        const cols = Array.from(container.querySelectorAll('.fc-week-day-column'));
        mockRects(cols, (el, i) => ({ left: i * 120, right: i * 120 + 120, top: 0, bottom: 1440 }));
    });

    afterEach(() => {
        renderer.cleanup();
        container.remove();
    });

    test('timed events get a resize handle', () => {
        const handle = container.querySelector('.fc-timed-event .fc-resize-handle');
        expect(handle).not.toBeNull();
    });

    test('dragging a timed event down moves its start time (snapped)', () => {
        const eventEl = container.querySelector('.fc-timed-event[data-event-id="evt-2"]');
        const col = eventEl.closest('.fc-week-day-column');
        const colRect = col.getBoundingClientRect();
        const startX = colRect.left + 10;

        eventEl.dispatchEvent(pointer('pointerdown', startX, 600));
        document.dispatchEvent(pointer('pointermove', startX, 600 + 34)); // ~30min snap
        document.dispatchEvent(pointer('pointerup', startX, 600 + 34));

        const moved = manager.getEvents().find(e => e.id === 'evt-2');
        expect(new Date(moved.start).getHours()).toBe(10);
        expect(new Date(moved.start).getMinutes()).toBe(30);
        expect(new Date(moved.end).getMinutes()).toBe(30);
    });

    test('dragging the resize handle extends the event duration', () => {
        const handle = container.querySelector(
            '.fc-timed-event[data-event-id="evt-2"] .fc-resize-handle'
        );
        handle.dispatchEvent(pointer('pointerdown', 10, 660));
        document.dispatchEvent(pointer('pointermove', 10, 660 + 29)); // ~30min snap
        document.dispatchEvent(pointer('pointerup', 10, 660 + 29));

        const resized = manager.getEvents().find(e => e.id === 'evt-2');
        expect(new Date(resized.end).getHours()).toBe(11);
        expect(new Date(resized.end).getMinutes()).toBe(30);
        expect(new Date(resized.start).getHours()).toBe(10);
    });

    test('dragging empty grid emits a snapped range-select', () => {
        const col = container.querySelectorAll('.fc-week-day-column')[2];
        const slot = col.querySelector('.fc-hour-slot[data-hour="14"]');
        const detail = [];
        container.addEventListener('range-select', e => detail.push(e.detail));

        slot.dispatchEvent(pointer('pointerdown', 250, 14 * 60));
        document.dispatchEvent(pointer('pointermove', 250, 15 * 60 + 7));
        document.dispatchEvent(pointer('pointerup', 250, 15 * 60 + 7));

        expect(detail.length).toBe(1);
        expect(detail[0].start.getHours()).toBe(14);
        expect(detail[0].end.getHours()).toBe(15);
        expect(detail[0].end.getMinutes()).toBe(0);
    });
});
