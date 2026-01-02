import { EventForm } from '../../src/components/EventForm.js';
import { DOMUtils } from '../../src/utils/DOMUtils.js';

// Mock focus trap as it depends on complex DOM visibility
jest.spyOn(DOMUtils, 'trapFocus').mockImplementation(() => () => {});

describe('EventForm', () => {
    let form;

    beforeEach(() => {
        form = document.createElement('force-calendar-event-form');
        document.body.appendChild(form);
    });

    afterEach(() => {
        document.body.removeChild(form);
    });

    test('initializes with default colors from config', () => {
        expect(form.config.colors.length).toBeGreaterThan(0);
        expect(form._formData.color).toBe(form.config.colors[0].color);
    });

    test('opens and resets form state', () => {
        form.open(new Date('2026-01-01'));
        expect(form.hasAttribute('open')).toBe(true);
        expect(form.$('#event-title').value).toBe('');
    });

    test('validates required title', () => {
        form.open();
        form.$('#event-title').value = '';
        const isValid = form.validate();
        expect(isValid).toBe(false);
        expect(form.$('#title-group').classList.contains('has-error')).toBe(true);
    });

    test('validates date range (end after start)', () => {
        form.open();
        form.$('#event-title').value = 'Test';
        form.$('#event-start').value = '2026-01-01T10:00';
        form.$('#event-end').value = '2026-01-01T09:00'; // Before start
        
        const isValid = form.validate();
        expect(isValid).toBe(false);
        expect(form.$('#end-group').classList.contains('has-error')).toBe(true);
    });

    test('emits save event with correct data', (done) => {
        const testData = {
            title: 'My Event',
            start: '2026-01-01T10:00',
            end: '2026-01-01T11:00',
            color: form.config.colors[1].color
        };

        form.open();
        form.$('#event-title').value = testData.title;
        form.$('#event-start').value = testData.start;
        form.$('#event-end').value = testData.end;
        form._formData.color = testData.color;

        form.addEventListener('save', (e) => {
            expect(e.detail.title).toBe(testData.title);
            expect(e.detail.backgroundColor).toBe(testData.color);
            done();
        });

        form.save();
    });
});