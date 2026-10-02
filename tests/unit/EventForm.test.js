import { EventForm } from '../../src/components/EventForm.js';
import { DOMUtils } from '../../src/utils/DOMUtils.js';

// Mock focus trap as it depends on complex DOM visibility
jest.spyOn(DOMUtils, 'trapFocus').mockImplementation(() => () => {});

describe('EventForm', () => {
    let form;

    beforeEach(() => {
        form = document.createElement('forcecal-event-form');
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

        // Use the native method directly on the element
        form.addEventListener('save', (e) => {
            expect(e.detail.title).toBe(testData.title);
            expect(e.detail.backgroundColor).toBe(testData.color);
            done();
        });

        form.save();
    });

    describe('composed click interactions', () => {
        const click = element => element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            composed: true
        }));

        test.each(['#event-title', '#event-start', '#event-end', '.modal-content']) (
            'keeps the dialog open when clicking %s across the shadow boundary', selector => {
                form.open();
                const received = jest.fn();
                form.addEventListener('click', received);

                click(form.$(selector));

                // A real composed event is retargeted to the host, even for an inside click.
                expect(received).toHaveBeenCalledTimes(1);
                expect(received.mock.calls[0][0].target).toBe(form);
                expect(form.hasAttribute('open')).toBe(true);
            }
        );

        test('selects a color without dismissing or saving, then saves that color', () => {
            form.open();
            form.titleInput.value = 'Release planning';
            const onSave = jest.fn();
            form.addEventListener('save', onSave);
            const purple = form.$('[aria-label="Purple"]');

            click(purple);

            expect(form.hasAttribute('open')).toBe(true);
            expect(purple.getAttribute('aria-checked')).toBe('true');
            expect(form.titleInput.value).toBe('Release planning');
            expect(onSave).not.toHaveBeenCalled();

            click(form.$('#save-btn'));

            expect(onSave).toHaveBeenCalledTimes(1);
            expect(onSave.mock.calls[0][0].detail.backgroundColor).toBe(purple.dataset.color);
            expect(form.hasAttribute('open')).toBe(false);
        });

        test.each(['title', 'date range'])('keeps invalid %s errors visible after Save', invalidField => {
            form.open();
            form.titleInput.value = invalidField === 'title' ? '' : 'Release planning';
            if (invalidField === 'date range') form.endInput.value = form.startInput.value;
            const onSave = jest.fn();
            form.addEventListener('save', onSave);

            click(form.$('#save-btn'));

            expect(form.hasAttribute('open')).toBe(true);
            expect(form.$(invalidField === 'title' ? '#title-group' : '#end-group')
                .classList.contains('has-error')).toBe(true);
            expect(onSave).not.toHaveBeenCalled();
        });

        test.each(['#cancel-btn', '#close-x', '#close-x path'])('still dismisses with %s', selector => {
            form.open();
            click(form.$(selector));
            expect(form.hasAttribute('open')).toBe(false);
        });

        test('closes only on the backdrop after repeated opening inside another shadow root', () => {
            const outer = document.createElement('div');
            const root = outer.attachShadow({ mode: 'open' });
            document.body.appendChild(outer);
            root.appendChild(form);
            try {
                for (let attempt = 0; attempt < 2; attempt++) {
                    form.open();
                    click(form.$('[aria-label="Purple"]'));
                    expect(form.hasAttribute('open')).toBe(true);
                    click(form);
                    expect(form.hasAttribute('open')).toBe(false);
                }
            } finally {
                document.body.appendChild(form);
                outer.remove();
            }
        });
    });

});