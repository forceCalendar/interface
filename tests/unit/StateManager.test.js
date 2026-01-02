import StateManager from '../../src/core/StateManager.js';

describe('StateManager', () => {
    let manager;

    beforeEach(() => {
        manager = new StateManager({
            view: 'month',
            date: new Date('2026-01-01T00:00:00Z')
        });
    });

    test('initializes with default state', () => {
        const state = manager.getState();
        expect(state.view).toBe('month');
        expect(state.events).toEqual([]);
        expect(state.loading).toBe(false);
    });

    test('updates state correctly', () => {
        manager.setState({ loading: true });
        expect(manager.getState().loading).toBe(true);
    });

    test('adds events correctly', () => {
        const event = {
            id: '1',
            title: 'Test Event',
            start: new Date('2026-01-01T10:00:00Z'),
            end: new Date('2026-01-01T11:00:00Z')
        };
        manager.addEvent(event);
        expect(manager.getState().events.length).toBe(1);
        expect(manager.getState().events[0].title).toBe('Test Event');
    });

    test('selects and deselects dates', () => {
        const date = new Date('2026-01-02');
        manager.selectDate(date);
        expect(manager.getState().selectedDate).toBe(date);
        
        manager.deselectDate();
        expect(manager.getState().selectedDate).toBeNull();
    });

    test('enriches view data with selection state', () => {
        const date = new Date('2026-01-01T00:00:00Z');
        manager.selectDate(date);
        
        const viewData = manager.getViewData();
        // Check if January 1st is marked as selected in viewData
        let foundSelected = false;
        viewData.weeks.forEach(week => {
            week.days.forEach(day => {
                if (new Date(day.date).toDateString() === date.toDateString()) {
                    if (day.isSelected) foundSelected = true;
                }
            });
        });
        expect(foundSelected).toBe(true);
    });
});