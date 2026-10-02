import '../../src/components/ForceCalendar.js';
import { Event as CoreEvent } from '@forcecalendar/core';

const seed = (id = 'meeting') => ({
  id,
  title: 'Planning',
  location: 'Boardroom',
  start: new Date(2026, 6, 15, 10),
  end: new Date(2026, 6, 15, 11),
  backgroundColor: '#123456',
  description: 'Keep this description',
  metadata: { salesforceId: 'record-42', source: { name: 'CRM' } },
  attendees: [{ email: 'attendee@example.com', name: 'Attendee' }]
});
const key = (element, value, shiftKey = false) =>
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: value,
      shiftKey,
      bubbles: true,
      composed: true,
      cancelable: true
    })
  );
const click = element =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

describe('built-in event details and editing', () => {
  const owned = [];
  const create = (view = 'month', events = [seed()]) => {
    const calendar = document.createElement('forcecal-main');
    calendar.setAttribute('date', '2026-07-15T12:00:00');
    calendar.setAttribute('view', view);
    calendar.events = events;
    document.body.appendChild(calendar);
    owned.push(calendar);
    return calendar;
  };
  const q = (calendar, selector) => calendar.shadowRoot.querySelector(selector);
  const form = calendar => q(calendar, '#event-modal');
  const activate = (calendar, id = 'meeting') => {
    const chip = [...calendar.shadowRoot.querySelectorAll('.fc-event')].find(
      el => el.dataset.eventId === id
    );
    chip.focus();
    click(chip);
    return chip;
  };
  const edit = calendar => {
    activate(calendar);
    click(q(calendar, '#fc-details-edit'));
    return form(calendar);
  };
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    owned.forEach(calendar => {
      calendar.destroy();
      calendar.remove();
    });
    owned.length = 0;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test.each(['month', 'week', 'day'])(
    '%s activation opens accessible details before editing',
    view => {
      const calendar = create(view);
      activate(calendar);
      const dialog = q(calendar, '[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(q(calendar, '#fc-details-title').textContent).toBe('Planning');
      expect(dialog.textContent).toContain('Boardroom');
      expect(dialog.textContent).toContain('10:00');
      expect(calendar.shadowRoot.activeElement.id).toBe('fc-details-close');
      expect(form(calendar).hasAttribute('open')).toBe(false);
      expect(calendar.getEvents()).toHaveLength(1);
    }
  );

  test.each(['Enter', ' '])('%s opens details from a focused event', value => {
    const calendar = create();
    const chip = q(calendar, '.fc-event');
    chip.focus();
    key(chip, value);
    expect(q(calendar, '#event-details').hidden).toBe(false);
    expect(calendar.stateManager.getState().selectedEvent.id).toBe('meeting');
  });

  test('details text cannot introduce markup or script', () => {
    const hostile = '<img src=x onerror="alert(1)">';
    const calendar = create('month', [{ ...seed(), title: hostile, location: hostile }]);
    activate(calendar);
    const dialog = q(calendar, '[role="dialog"]');
    expect(dialog.textContent).toContain(hostile);
    expect(dialog.querySelector('img')).toBeNull();
    click(q(calendar, '#fc-details-delete'));
    expect(q(calendar, '[role="alertdialog"]').textContent).toContain(hostile);
    expect(q(calendar, '[role="alertdialog"] img')).toBeNull();
  });

  test('Tab and Shift+Tab wrap inside details, Escape restores the invoking event', () => {
    const calendar = create();
    const chip = activate(calendar);
    const first = q(calendar, '#fc-details-close');
    const last = q(calendar, '#fc-details-delete');
    key(first, 'Tab', true);
    expect(calendar.shadowRoot.activeElement).toBe(last);
    key(last, 'Tab');
    expect(calendar.shadowRoot.activeElement).toBe(first);
    key(first, 'Escape');
    expect(q(calendar, '#event-details').hidden).toBe(true);
    expect(calendar.shadowRoot.activeElement).toBe(chip);
  });

  test.each(['close', 'backdrop'])('%s dismisses without mutation and restores focus', action => {
    const calendar = create();
    const chip = activate(calendar);
    const changed = jest.fn();
    calendar.addEventListener('calendar-event-update', changed);
    click(q(calendar, action === 'close' ? '#fc-details-close' : '#event-details'));
    expect(calendar.shadowRoot.activeElement).toBe(chip);
    expect(q(calendar, '#event-details').hidden).toBe(true);
    expect(changed).not.toHaveBeenCalled();
  });

  test('inside clicks do not dismiss across a nested shadow boundary', () => {
    const wrapper = document.createElement('div');
    wrapper.attachShadow({ mode: 'open' });
    document.body.appendChild(wrapper);
    const calendar = create();
    wrapper.shadowRoot.appendChild(calendar);
    try {
      activate(calendar);
      click(q(calendar, '#fc-details-title'));
      expect(q(calendar, '#event-details').hidden).toBe(false);
    } finally {
      document.body.appendChild(calendar);
      wrapper.remove();
    }
  });

  test('editing prefills and updates once without adding or losing host-owned fields', () => {
    const calendar = create();
    const previous = calendar.getEvents()[0];
    const added = jest.fn(),
      updated = jest.fn();
    calendar.addEventListener('calendar-event-add', added);
    calendar.addEventListener('calendar-event-update', updated);
    const editor = edit(calendar);
    expect(q(calendar, '#event-details').hidden).toBe(true);
    expect(editor.titleInput.value).toBe('Planning');
    expect(editor.locationInput.value).toBe('Boardroom');
    expect(editor.startInput.value).toBe('2026-07-15T10:00');
    expect(editor._formData.color).toBe('#123456');
    editor.titleInput.value = 'Updated planning';
    editor.locationInput.value = 'Room 2';
    editor.endInput.value = '2026-07-15T12:30';
    expect(previous.title).toBe('Planning');
    click(editor.$('#save-btn'));
    expect(added).not.toHaveBeenCalled();
    expect(updated).toHaveBeenCalledTimes(1);
    expect(calendar.getEvents()).toHaveLength(1);
    const event = calendar.getEvents()[0];
    expect(event.id).toBe('meeting');
    expect(event.title).toBe('Updated planning');
    expect(event.location).toBe('Room 2');
    expect(event.end.getHours()).toBe(12);
    expect(event.backgroundColor).toBe('#123456');
    expect(event.description).toBe(previous.description);
    expect(event.metadata).toEqual(previous.metadata);
    expect(event.attendees).toEqual(previous.attendees);
    expect(editor.hasAttribute('open')).toBe(false);
    expect(calendar.shadowRoot.activeElement.dataset.eventId).toBe('meeting');
  });

  test.each(['cancel', 'escape', 'backdrop'])(
    '%s discards editing without modifying the event',
    action => {
      const calendar = create();
      const previous = calendar.getEvents()[0];
      const editor = edit(calendar);
      editor.titleInput.value = 'Unsaved';
      if (action === 'escape') key(editor.titleInput, 'Escape');
      else click(action === 'cancel' ? editor.$('#cancel-btn') : editor);
      expect(editor.hasAttribute('open')).toBe(false);
      expect(calendar.getEvents()[0]).toBe(previous);
      expect(calendar.shadowRoot.activeElement.dataset.eventId).toBe('meeting');
    }
  );

  test('title-only edit preserves sub-minute instants and nullable color', () => {
    const input = {
      ...seed(),
      start: new Date(2026, 6, 15, 10, 0, 1, 123),
      end: new Date(2026, 6, 15, 10, 0, 59, 987),
      backgroundColor: null,
      timeZone: 'UTC',
      endTimeZone: 'UTC'
    };
    const calendar = create('month', [input]);
    const editor = edit(calendar);
    expect(editor.startInput.value).toBe(editor.endInput.value);
    editor.titleInput.value = 'Precise event';
    click(editor.$('#save-btn'));
    const saved = calendar.getEvents()[0];
    expect(editor.hasAttribute('open')).toBe(false);
    expect(saved.start.getTime()).toBe(input.start.getTime());
    expect(saved.end.getTime()).toBe(input.end.getTime());
    expect(saved.backgroundColor).toBeNull();
    expect(saved.timeZone).toBe('UTC');
    expect(saved.endTimeZone).toBe('UTC');
  });

  test('title-only edit preserves the distinct destination time zone of a flight', () => {
    const input = {
      ...seed(),
      end: new Date(2026, 6, 15, 18),
      timeZone: 'America/New_York',
      endTimeZone: 'Europe/London'
    };
    const calendar = create('month', [input]);
    const previousEndUTC = calendar.getEvents()[0].endUTC;
    const editor = edit(calendar);
    editor.titleInput.value = 'Flight details';
    click(editor.$('#save-btn'));
    expect(calendar.getEvents()[0].timeZone).toBe('America/New_York');
    expect(calendar.getEvents()[0].endTimeZone).toBe('Europe/London');
    expect(calendar.getEvents()[0].endUTC).toEqual(previousEndUTC);
  });

  test('title-only edit retains exact instants through a DST fall-back hour', () => {
    // Run this suite under TZ=America/New_York as well as the default zone.
    const input = {
      ...seed(),
      start: new Date('2026-11-01T05:45:00Z'),
      end: new Date('2026-11-01T06:15:00Z')
    };
    const calendar = create('month', []);
    calendar.setDate(new Date(2026, 10, 1, 12));
    calendar.events = [input];
    const editor = edit(calendar);
    editor.titleInput.value = 'DST event';
    click(editor.$('#save-btn'));
    expect(editor.hasAttribute('open')).toBe(false);
    expect(calendar.getEvents()[0].start.getTime()).toBe(input.start.getTime());
    expect(calendar.getEvents()[0].end.getTime()).toBe(input.end.getTime());
  });

  test.each(['hidden', 'inert', 'aria-hidden', 'display', 'visibility'])(
    'does not restore focus into a %s calendar',
    state => {
      const calendar = create();
      const chip = activate(calendar);
      const focus = jest.spyOn(chip, 'focus');
      if (state === 'display') calendar.style.display = 'none';
      else if (state === 'visibility') calendar.style.visibility = 'hidden';
      else calendar.setAttribute(state, state === 'aria-hidden' ? 'true' : '');
      click(q(calendar, '#fc-details-close'));
      expect(focus).not.toHaveBeenCalled();
    }
  );

  test('creation after editing has no stale id, location, all-day or color', () => {
    const calendar = create('month', [{ ...seed(), allDay: true }]);
    const editor = edit(calendar);
    expect(editor.allDayInput.checked).toBe(true);
    click(editor.$('#cancel-btn'));
    click(q(calendar, '#create-event-btn'));
    expect(editor.editingEventId).toBeNull();
    expect(editor.titleInput.value).toBe('');
    expect(editor.locationInput.value).toBe('');
    expect(editor.allDayInput.checked).toBe(false);
    expect(editor._formData.color).toBe(editor.config.colors[0].color);
    editor.titleInput.value = 'New event';
    click(editor.$('#save-btn'));
    expect(calendar.getEvents()).toHaveLength(2);
    expect(calendar.getEvents()[0].id).toBe('meeting');
  });

  test('delete requires a confirmation, Cancel and Escape both retain the event', () => {
    const calendar = create();
    activate(calendar);
    click(q(calendar, '#fc-details-delete'));
    expect(calendar.getEvents()).toHaveLength(1);
    expect(q(calendar, '[role="alertdialog"]')).not.toBeNull();
    expect(calendar.shadowRoot.activeElement.id).toBe('fc-delete-cancel');
    click(q(calendar, '#fc-delete-cancel'));
    expect(q(calendar, '[role="dialog"]')).not.toBeNull();
    click(q(calendar, '#fc-details-delete'));
    key(q(calendar, '#fc-delete-cancel'), 'Escape');
    expect(q(calendar, '[role="dialog"]')).not.toBeNull();
    expect(calendar.getEvents()).toHaveLength(1);
  });

  test('confirmed delete removes once and restores a valid fallback focus target', () => {
    const calendar = create();
    const deleted = jest.fn();
    calendar.addEventListener('calendar-event-remove', deleted);
    activate(calendar);
    click(q(calendar, '#fc-details-delete'));
    const confirm = q(calendar, '#fc-delete-confirm');
    click(confirm);
    click(confirm);
    expect(calendar.getEvents()).toHaveLength(0);
    expect(deleted).toHaveBeenCalledTimes(1);
    expect(deleted.mock.calls[0][0].detail.eventId).toBe('meeting');
    expect(q(calendar, '#event-details').hidden).toBe(true);
    expect(calendar.shadowRoot.activeElement.dataset.action).toBe('today');
  });

  test('stale confirmation controls cannot delete a later selected event', () => {
    const calendar = create('month', [seed(), seed('another')]);
    activate(calendar);
    click(q(calendar, '#fc-details-delete'));
    const oldConfirm = q(calendar, '#fc-delete-confirm');
    click(q(calendar, '#event-details'));
    activate(calendar, 'another');
    click(oldConfirm);
    expect(calendar.getEvents()).toHaveLength(2);
  });

  test.each(['update', 'remove'])(
    'external %s leaves edits visible but prevents stale writes',
    action => {
      const calendar = create();
      const editor = edit(calendar);
      editor.titleInput.value = 'Unsaved work';
      if (action === 'update') calendar.updateEvent('meeting', { title: 'Changed on server' });
      else calendar.deleteEvent('meeting');
      const mutate = jest.spyOn(calendar.stateManager, 'updateEvent');
      expect(editor.titleInput.value).toBe('Unsaved work');
      expect(editor.$('#save-error').hidden).toBe(false);
      click(editor.$('#save-btn'));
      expect(mutate).not.toHaveBeenCalled();
      expect(editor.hasAttribute('open')).toBe(true);
    }
  );

  test('unrelated hydration does not prevent editing and preserves updated metadata', () => {
    const calendar = create();
    const editor = edit(calendar);
    calendar.updateEvent('meeting', { metadata: { source: 'refreshed' } });
    calendar.addEvent(seed('another'));
    editor.titleInput.value = 'My change';
    click(editor.$('#save-btn'));
    expect(calendar.getEvents().find(event => event.id === 'meeting').metadata).toEqual({
      source: 'refreshed'
    });
    expect(calendar.getEvents().find(event => event.id === 'meeting').title).toBe('My change');
  });

  test('save failure preserves the draft and allows retry without adding an event', () => {
    const calendar = create();
    const editor = edit(calendar);
    editor.titleInput.value = 'Retry me';
    const update = jest.spyOn(calendar.stateManager, 'updateEvent').mockImplementationOnce(() => {
      throw new Error('offline');
    });
    click(editor.$('#save-btn'));
    expect(editor.hasAttribute('open')).toBe(true);
    expect(editor.$('#save-error').textContent).toContain('could not be saved');
    click(editor.$('#save-btn'));
    expect(update).toHaveBeenCalledTimes(2);
    expect(editor.hasAttribute('open')).toBe(false);
    expect(calendar.getEvents()).toHaveLength(1);
    expect(calendar.getEvents()[0].title).toBe('Retry me');
  });

  test('delete failure preserves the confirmation and supports retry', () => {
    const calendar = create();
    activate(calendar);
    click(q(calendar, '#fc-details-delete'));
    jest.spyOn(calendar.stateManager, 'deleteEvent').mockImplementationOnce(() => {
      throw new Error('offline');
    });
    click(q(calendar, '#fc-delete-confirm'));
    expect(q(calendar, '[role="alert"] ').textContent).toContain('could not be deleted');
    expect(calendar.getEvents()).toHaveLength(1);
    click(q(calendar, '#fc-delete-confirm'));
    expect(calendar.getEvents()).toHaveLength(0);
  });

  test.each(['month', 'week', 'day'])('%s readOnly permits details and blocks mutations', view => {
    const calendar = create(view);
    calendar.readOnly = true;
    activate(calendar);
    expect(q(calendar, '#fc-details-title').textContent).toBe('Planning');
    expect(q(calendar, '#fc-details-edit')).toBeNull();
    expect(q(calendar, '#fc-details-delete')).toBeNull();
  });

  test.each(['edit', 'delete'])('readOnly toggle cancels an active %s flow', action => {
    const calendar = create();
    activate(calendar);
    click(q(calendar, action === 'edit' ? '#fc-details-edit' : '#fc-details-delete'));
    const oldConfirm = q(calendar, '#fc-delete-confirm');
    const oldForm = form(calendar);
    calendar.readOnly = true;
    if (oldConfirm) click(oldConfirm);
    oldForm.save();
    expect(calendar.getEvents()).toHaveLength(1);
    expect(form(calendar).hasAttribute('open')).toBe(false);
    activate(calendar);
    expect(q(calendar, '#fc-details-edit')).toBeNull();
  });

  test.each(['next', 'setView', 'detach', 'destroy'])(
    '%s closes interactions and releases old traps',
    action => {
      const calendar = create();
      activate(calendar);
      const details = calendar._eventDetails;
      if (action === 'next') calendar.next();
      if (action === 'setView') calendar.setView('week');
      if (action === 'detach') calendar.remove();
      if (action === 'destroy') calendar.destroy();
      expect(details._cleanupFocusTrap).toBeNull();
      expect(details.container.hidden).toBe(true);
      if (action === 'detach' || action === 'destroy') {
        calendar.remove();
        document.body.appendChild(calendar);
      }
      expect(form(calendar).hasAttribute('open')).toBe(false);
    }
  );

  test('Escape is scoped to its own calendar and repeated open/close cycles do not duplicate updates', () => {
    const calendar = create();
    const other = create();
    activate(other);
    for (let cycle = 0; cycle < 3; cycle++) {
      activate(calendar);
      key(q(calendar, '#fc-details-close'), 'Escape');
    }
    expect(q(other, '#event-details').hidden).toBe(false);
    const update = jest.fn();
    calendar.addEventListener('calendar-event-update', update);
    const editor = edit(calendar);
    editor.titleInput.value = 'Final';
    click(editor.$('#save-btn'));
    expect(update).toHaveBeenCalledTimes(1);
    expect(q(other, '#event-details').hidden).toBe(false);
  });

  test.each(['month', 'week', 'day'])(
    '%s recurring details use the clicked occurrence and withhold unsafe mutations',
    view => {
      const recurring = {
        ...seed(),
        start: new Date(2026, 6, 1, 10),
        end: new Date(2026, 6, 1, 11),
        recurrenceRule: 'FREQ=WEEKLY;COUNT=5'
      };
      const calendar = create(view, [recurring]);
      const id = CoreEvent.occurrenceId('meeting', new Date(2026, 6, 15, 10));
      activate(calendar, id);
      expect(q(calendar, '#fc-details-description').textContent).toContain('Jul 15, 2026');
      expect(q(calendar, '#fc-details-description').textContent).not.toContain('Jul 1, 2026');
      expect(q(calendar, '[role="dialog"]').textContent).toContain('Recurring event');
      expect(q(calendar, '#fc-details-edit')).toBeNull();
      expect(q(calendar, '#fc-details-delete')).toBeNull();
      expect(calendar.getEvents()[0].start).toEqual(new Date(2026, 6, 1, 10));
    }
  );
});
