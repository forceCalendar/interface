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

Attributes: `view` (`month` | `week` | `day`), `date`, `locale`, `timezone`, `week-starts-on`, `height`, `theme`. Views without a renderer fall back with a console warning.

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

Rendered chips of a recurring series carry occurrence ids (`<masterId>_<startMs>`). Clicking, selecting, dragging or resizing an occurrence resolves to the series master (`stateManager.findEvent(id)`), so `calendar-event-update` and the selection always carry the master event. There is no per-occurrence edit yet: dragging an occurrence shifts the whole series by the dragged delta (a change of date and time of day for every occurrence) and resizing one changes the duration of every occurrence.

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
