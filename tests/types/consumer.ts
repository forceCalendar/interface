import {
  BaseComponent,
  BaseViewRenderer,
  DateUtils,
  ForceCalendar,
  EventForm,
  StateManager,
  type CalendarEvent,
  type ForceCalendarElement
} from '../../types/index.js';
import { DateUtils as CoreDateUtils } from '@forcecalendar/core';

const element: ForceCalendarElement = document.createElement('forcecal-main');
element.addEventListener('calendar-events-set', event => {
  const added: CalendarEvent[] = event.detail.added;
  const ids: string[] = added.map(item => item.id);
  void ids;
});
const base: typeof BaseComponent = ForceCalendar;
const dates: typeof CoreDateUtils = DateUtils;
DateUtils.formatTime(new Date(), true, false, 'en-US');
DateUtils.formatTime(new Date(), 'en-GB', true);
new BaseViewRenderer(document.createElement('div'), new StateManager());
void base;
void dates;

element.readOnly = true;
const readOnly: boolean = element.readOnly;
const classReadOnly: boolean = new ForceCalendar().readOnly;
void readOnly;
void classReadOnly;

const editor = new EventForm();
editor.open(new Date(), new Date());
editor.edit({ id: 'existing', title: 'Existing event', start: new Date(), end: new Date(), backgroundColor: null });
editor.showError('Please try again');
editor.close(false);
