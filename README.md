# @forcecalendar/interface

[![Tests](https://github.com/forceCalendar/interface/actions/workflows/test.yml/badge.svg)](https://github.com/forceCalendar/interface/actions/workflows/test.yml)
[![Code Quality](https://github.com/forceCalendar/interface/actions/workflows/code-quality.yml/badge.svg)](https://github.com/forceCalendar/interface/actions/workflows/code-quality.yml)
[![npm version](https://img.shields.io/npm/v/@forcecalendar/interface.svg)](https://www.npmjs.com/package/@forcecalendar/interface)
[![npm downloads](https://img.shields.io/npm/dt/@forcecalendar/interface.svg)](https://www.npmjs.com/package/@forcecalendar/interface)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official interface layer for forceCalendar Core — enterprise calendar components for Salesforce and the web.

## Installation

```bash
npm install @forcecalendar/interface @forcecalendar/core
```

```js
import '@forcecalendar/interface'; // registers <forcecal-main> and <forcecal-event-form>
```

```html
<forcecal-main view="month" date="2026-04-15" week-starts-on="1" locale="en-AU"></forcecal-main>
```

Attributes: `view` (`month` | `week` | `day`), `date`, `locale`, `timezone`, `week-starts-on`, `height`, `theme`, `readonly`. Views without a renderer fall back with a console warning.

## Loading events

`setEvents()` and the `events` property take a _complete snapshot_ and reconcile it with what the calendar already holds: unchanged events keep their instance, changed ones are replaced, new ones are added and events missing from the snapshot are removed (pass `{ removeMissing: false }` to keep them). The view re-renders at most once per snapshot.

```js
const calendar = document.querySelector('forcecal-main');

// Declarative: reconcile with removeMissing: true
calendar.events = rows;

// Imperative: the change set is returned and dispatched as calendar-events-set
const { added, updated, removed, unchanged } = calendar.setEvents(rows, { removeMissing: false });

calendar.addEventListener('calendar-events-set', e => {
  console.log(e.detail.added.length, 'added', e.detail.removed.length, 'removed');
});
```

Rules of the road:

- Every entry must be an object with an `id`; `null`/`undefined` clears the calendar and anything else that is not iterable throws a `TypeError` (nothing is applied).
- No per-event `calendar-event-add`/`-update`/`-remove` events are dispatched for a snapshot, so listeners that persist user edits are not triggered by a data load.
- Occurrences of a recurring series (the expanded instances found in view data, `getEventsInRange()` results and click events) are mapped back to their master, so displayed events can be echoed through a snapshot without collapsing the series.
- Calls made before the element is connected (or after `destroy()`) are queued and replayed in order once it initialises; `setEvents()` returns `null` in that case and `events` reads back the queued snapshot.
- `calendar-events-set` carries `{ events, added, updated, removed, unchanged }`; `updated` entries are `{ event, oldEvent }` pairs.

### Recurring events

Rendered chips of a recurring series carry occurrence ids (`<masterId>_<startMs>`). Clicking or selecting an occurrence resolves to its master (`stateManager.findEvent(id)`), while details retain the clicked occurrence's time. Built-in drag, resize, Edit and Delete are unavailable for recurring events: changing one occurrence or a whole series requires an explicit scope workflow, which is not supported yet. Host APIs remain available for applications that implement their own scoped editing.

## Event details and editing

Click an event, or focus it and press Enter/Space, to open its details: title, the displayed instance's date/time, location and available actions. Times use the browser's local display, as the calendar grid does. The calendar-owned dialog uses ordinary DOM nodes inside the calendar's shadow root, without a portal or the native Popover API.

- **Edit** prefills the existing event. Save updates its stable id and emits the normal `calendar-event-update` / `calendar-event-updated` pair; it does not add a duplicate. Description, attendees, metadata and other host-owned fields are retained. Unchanged date inputs preserve the original full-precision instants, including DST-overlap times.
- **Delete** first opens an explicit confirmation. Cancel or Escape returns to details; confirming emits the normal remove/deleted pair. Failed saves/deletes leave the draft or confirmation available to retry.
- Close, backdrop click and Escape dismiss details; Tab stays inside the dialog and focus returns to the event (or Today after deletion). Cancelling the editor discards its draft. Navigation, teardown and enabling read-only mode dismiss active interactions.
- If the event changes or disappears while being edited, the draft stays visible with an error and cannot overwrite the newer data. Close and reopen the event to edit its current state. Changes to unrelated events or host-owned metadata do not block a save.
- Recurring details display the clicked occurrence's time, with a clear recurring-event notice. Built-in Edit/Delete are intentionally unavailable for recurring events until an explicit series/occurrence editing workflow is supported; host APIs remain available.

The standalone `EventForm` also supports `edit(event)` and `open(start, end)` for prefilled editing and creation ranges. Its cancellable `save` event carries editable fields; a host can call `preventDefault()` and `showError(message)` to retain a failed draft. Its `close` event reports `{ restoreFocus }`. The main calendar wires these to its state manager automatically.

## Read-only interaction mode

Set the boolean HTML attribute `readonly`, or the reflected JavaScript property `readOnly`, to disable built-in user editing. The default is `false`.

```html
<forcecal-main readonly view="week"></forcecal-main>
```

```js
const calendar = document.createElement('forcecal-main');
calendar.readOnly = true; // Can be set before registration/connection
calendar.events = rows; // Snapshot hydration still works
host.appendChild(calendar);
calendar.readOnly = false; // Re-enable editing at any time
```

Attribute spelling is `readonly` (no hyphen); property spelling is `readOnly`. Like native boolean attributes, `readonly="false"` still enables it: remove the attribute or assign `calendar.readOnly = false` to turn it off. Framework adapters, including LWC, should assign the boolean property before inserting the element and whenever their option changes.

- Disables New Event, form creation/saves, event dragging, resizing and drag-to-create in month/week/day views. Resize handles and details Edit/Delete actions are omitted and grids expose `aria-readonly`.
- Keeps event details, mouse/keyboard event and date selection, grid focus navigation, view switching and date navigation available.
- Enabling it closes the current details, deletion confirmation or event form, discards its unsaved edits, cancels an active drag/resize/creation gesture and releases the gesture's document listeners. Disabling it restores editing without duplicating listeners. Instances remain independent.
- Host code can still call `setEvents()`, assign `events`, and call `addEvent()`, `updateEvent()` or `deleteEvent()`. Imperative CRUD retains its usual mutation notifications; snapshots still emit only `calendar-events-set`.

This is a UI interaction option, **not a security or authorization boundary**. Host-provided editors/context menus must also honor the option, and applications must enforce permissions and validate all writes on the server.

## Visible range

`getVisibleRange()` returns the `{ start, end }` window the current view covers, including the leading and trailing other-month days of the month grid. `end` is inclusive (the last millisecond of the window), so the pair can be passed straight to a range query. The window is expressed in the browser's local time zone regardless of the `timezone` attribute, and it is computed from the date, view and week start alone, so it is cheap to call.

`calendar-range-change` fires whenever the window changes (navigation, view switch, `week-starts-on`), after the `calendar-navigate`/`calendar-view-change` event that caused it, with `{ start, end, view, date }`. It is also announced once per attach, on the next macrotask after the element is connected, so listeners added right after `appendChild` (framework refs and effects, a lazy `customElements.define()`) receive it. `getVisibleRange()` is the source of truth if you need the window synchronously.

```js
calendar.addEventListener('calendar-range-change', async e => {
  calendar.events = await api.fetchEvents(e.detail.start, e.detail.end);
});
```

## Lifecycle: detach and destroy

Removing the element from the document releases its rendered tree, DOM listeners and view timers but keeps its state (view, date, events) and keeps dispatching `calendar-*` events for API calls, so a re-attach (framework reconciliation, portals, StrictMode double-mount) picks up where it left off. Attribute changes made while detached are applied to state and rendered on the next attach.

`destroy()` tears the state manager and its owned Core Calendar down, including background maintenance timers (use Core 2.5.4 or later for full timer cleanup). Call it when you are finished with an element permanently; detaching alone intentionally preserves the calendar. Repeated calls are safe. Afterwards the public API no-ops or queues instead of throwing (`events` and `getEvents()` read the queued snapshot, `getVisibleRange()` is `null`, `setEvents()` queues, CRUD mutations return `null`/`false`, and navigation no-ops) and the next attach initialises a fresh calendar from the attributes and any queued snapshot.

## Events

| Event                                              | `detail`                                                      |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `calendar-navigate`                                | `{ action: 'next' \| 'previous' \| 'today' \| 'goto', date }` |
| `calendar-view-change`                             | `{ view }`                                                    |
| `calendar-range-change`                            | `{ start, end, view, date }`                                  |
| `calendar-events-set`                              | `{ events, added, updated, removed, unchanged }`              |
| `calendar-event-add` / `calendar-event-added`      | `{ event }`                                                   |
| `calendar-event-update` / `calendar-event-updated` | `{ event }`                                                   |
| `calendar-event-remove` / `calendar-event-deleted` | `{ eventId }`                                                 |
| `calendar-date-select`                             | `{ date }`                                                    |
| `calendar-range-select`                            | `{ start, end }`                                              |

All events bubble and are composed.

## TypeScript

The package ships declarations generated from JSDoc plus DOM typings for the element, so `document.createElement('forcecal-main')` is a `ForceCalendarElement` and `addEventListener` is typed for every `calendar-*` event:

```ts
import type { ForceCalendarElement, CalendarEvent } from '@forcecalendar/interface';

const calendar = document.createElement('forcecal-main');
calendar.addEventListener('calendar-events-set', e => {
  const added: CalendarEvent[] = e.detail.added;
});
```
