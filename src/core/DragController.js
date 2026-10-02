/**
 * DragController - pointer-driven interactions for calendar views.
 *
 * Implements drag-to-move (month and time grids), drag-to-resize, and
 * drag-to-create using Pointer Events only: no HTML5 drag-and-drop (which
 * misbehaves in shadow roots), no dependencies, Locker Service safe.
 *
 * Keyboard users have equivalent paths via the WAI-ARIA grid navigation
 * (arrow keys + Enter) that every view already implements.
 */

import { isRecurringEvent } from '../utils/EventUtils.js';

const DRAG_THRESHOLD_PX = 4;
const SNAP_MINUTES = 15;
const PX_PER_MINUTE = 1; // time grids render 60px per hour

/** Snap a minute offset to the grid. Exported for tests. */
export function snapMinutes(minutes, snap = SNAP_MINUTES) {
  return Math.round(minutes / snap) * snap;
}

/** Clamp a start minute so [start, start+duration] stays inside a day. */
export function clampStartMinutes(startMinutes, durationMinutes) {
  return Math.max(0, Math.min(startMinutes, 24 * 60 - durationMinutes));
}

/**
 * Combine a target day with an original start's time-of-day.
 * Exported for tests.
 */
export function moveDatePreservingTime(targetDay, originalStart) {
  const next = new Date(targetDay);
  next.setHours(
    originalStart.getHours(),
    originalStart.getMinutes(),
    originalStart.getSeconds(),
    originalStart.getMilliseconds()
  );
  return next;
}

export class DragController {
  constructor(renderer) {
    this.renderer = renderer;
    this.container = renderer.container;
    this.stateManager = renderer.stateManager;
    this._active = null;
    this._docListeners = [];
    this._clickCleanup = null;
    this._destroyed = false;
  }

  /** Month view: drag an event chip onto another day cell. */
  enableMonthMove() {
    if (this._destroyed || this.renderer.readOnly) return;
    this.renderer.addListener(this.container, 'pointerdown', e => {
      if (e.button !== 0 || this._destroyed || this.renderer.readOnly) return;
      const eventEl = e.target.closest('.fc-event');
      if (!eventEl || !this.container.contains(eventEl)) return;
      const originCell = eventEl.closest('.fc-month-day');
      if (!originCell) return;

      this._arm(e, {
        mode: 'month-move',
        eventEl,
        eventId: eventEl.dataset.eventId,
        onDragMove: ev => this._monthDragMove(ev),
        onDrop: ev => this._monthDrop(ev)
      });
    });
  }

  /**
   * Time grids (week/day): drag events vertically/across columns to move,
   * drag the bottom handle to resize, drag empty grid to create.
   */
  enableTimeGrid(columnSelector) {
    if (this._destroyed || this.renderer.readOnly) return;
    this._columnSelector = columnSelector;
    this._injectResizeHandles();

    this.renderer.addListener(this.container, 'pointerdown', e => {
      if (e.button !== 0 || this._destroyed || this.renderer.readOnly) return;

      const handle = e.target.closest('.fc-resize-handle');
      if (handle) {
        const eventEl = handle.closest('.fc-timed-event');
        if (!eventEl) return;
        e.preventDefault();
        this._arm(e, {
          mode: 'resize',
          eventEl,
          eventId: eventEl.dataset.eventId,
          originTop: parseFloat(eventEl.style.top) || 0,
          originHeight: parseFloat(eventEl.style.height) || 30,
          onDragMove: ev => this._resizeDragMove(ev),
          onDrop: () => this._resizeDrop()
        });
        return;
      }

      const eventEl = e.target.closest('.fc-timed-event');
      if (eventEl && this.container.contains(eventEl)) {
        this._arm(e, {
          mode: 'time-move',
          eventEl,
          eventId: eventEl.dataset.eventId,
          originTop: parseFloat(eventEl.style.top) || 0,
          originColumn: eventEl.closest(columnSelector),
          onDragMove: ev => this._timeMoveDragMove(ev),
          onDrop: () => this._timeMoveDrop()
        });
        return;
      }

      const column = e.target.closest(columnSelector);
      if (column && !e.target.closest('.fc-event')) {
        this._arm(e, {
          mode: 'create',
          column,
          onDragMove: ev => this._createDragMove(ev),
          onDrop: () => this._createDrop()
        });
      }
    });
  }

  /** Track from pointerdown; promote to a drag past the threshold. */
  _arm(e, spec) {
    if (this._destroyed || this.renderer.readOnly) return;
    this._cancel();
    if (spec.mode !== 'create' && !this._canMutateInstance(spec.eventId)) return;
    this._active = {
      ...spec,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false
    };
    const move = ev => this._onPointerMove(ev);
    const up = ev => this._onPointerUp(ev);
    const cancel = () => this._cancel();
    const key = ev => {
      if (ev.key === 'Escape') this._cancel();
    };
    const doc = this.container.ownerDocument;
    doc.addEventListener('pointermove', move);
    doc.addEventListener('pointerup', up);
    doc.addEventListener('pointercancel', cancel);
    doc.addEventListener('keydown', key);
    this._docListeners = [
      ['pointermove', move],
      ['pointerup', up],
      ['pointercancel', cancel],
      ['keydown', key]
    ];
  }

  _canMutateInstance(eventId) {
    const target = this.stateManager.resolveEventInstance(eventId);
    return Boolean(target && !isRecurringEvent(target.event));
  }

  _activeMutationBlocked() {
    return (
      this._active &&
      this._active.mode !== 'create' &&
      !this._canMutateInstance(this._active.eventId)
    );
  }

  _onPointerMove(e) {
    if (this._destroyed || this.renderer.readOnly || this._activeMutationBlocked()) {
      this._cancel();
      return;
    }
    const a = this._active;
    if (!a) return;
    if (!a.dragging) {
      if (
        Math.abs(e.clientX - a.startX) < DRAG_THRESHOLD_PX &&
        Math.abs(e.clientY - a.startY) < DRAG_THRESHOLD_PX
      ) {
        return;
      }
      a.dragging = true;
      if (a.eventEl) {
        a.eventEl.classList.add('fc-dragging');
      }
    }
    e.preventDefault();
    a.onDragMove(e);
  }

  _onPointerUp(e) {
    if (this._destroyed || this.renderer.readOnly || this._activeMutationBlocked()) {
      this._cancel();
      return;
    }
    const a = this._active;
    this._teardownDocListeners();
    if (!a) return;
    if (a.dragging) {
      a.onDrop(e);
      // A successful update may synchronously render a new controller. Give
      // that live owner the trailing-click guard so its next cleanup can
      // release it (including a readOnly toggle or detach).
      const controller = this._destroyed ? this.renderer._dragController : this;
      controller?._suppressNextClick();
    }
    this._cleanupVisuals(a);
    this._active = null;
  }

  _suppressNextClick() {
    if (this._destroyed || this.renderer.readOnly) return;
    const doc = this.container.ownerDocument;
    this._clickCleanup?.();
    const swallow = ev => {
      // Do not consume a click intended for another calendar instance.
      if (!ev.composedPath().includes(this.container)) return;
      ev.stopPropagation();
      ev.preventDefault();
      this._clickCleanup?.();
    };
    doc.addEventListener('click', swallow, { capture: true });
    const timer = setTimeout(() => this._clickCleanup?.(), 0);
    this._clickCleanup = () => {
      doc.removeEventListener('click', swallow, { capture: true });
      clearTimeout(timer);
      this._clickCleanup = null;
    };
  }

  _cancel() {
    const a = this._active;
    this._teardownDocListeners();
    this._active = null;
    if (a) {
      if (a.mode === 'resize' && a.eventEl) {
        a.eventEl.style.height = `${a.originHeight}px`;
      }
      this._cleanupVisuals(a);
    }
  }

  /** Cancel active interactions and release all document-level listeners. */
  destroy() {
    this._destroyed = true;
    this._cancel();
    this._clickCleanup?.();
  }

  _teardownDocListeners() {
    const doc = this.container.ownerDocument;
    for (const [name, fn] of this._docListeners) {
      doc.removeEventListener(name, fn);
    }
    this._docListeners = [];
  }

  _cleanupVisuals(a) {
    if (a.eventEl) {
      a.eventEl.classList.remove('fc-dragging');
      a.eventEl.style.transform = '';
    }
    this.container
      .querySelectorAll('.fc-drop-target')
      .forEach(el => el.classList.remove('fc-drop-target'));
    this._selectionEl?.remove();
    this._selectionEl = null;
  }

  // ----- month move -----

  _cellAtPoint(x, y) {
    for (const cell of this.container.querySelectorAll('.fc-month-day')) {
      const r = cell.getBoundingClientRect();
      if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return cell;
    }
    return null;
  }

  _monthDragMove(e) {
    const a = this._active;
    a.eventEl.style.transform = `translate(${e.clientX - a.startX}px, ${e.clientY - a.startY}px)`;
    const cell = this._cellAtPoint(e.clientX, e.clientY);
    if (cell !== a.dropCell) {
      a.dropCell?.classList.remove('fc-drop-target');
      cell?.classList.add('fc-drop-target');
      a.dropCell = cell;
    }
  }

  _monthDrop() {
    const a = this._active ?? {};
    const cell = a.dropCell;
    if (!cell) return;
    const target = this.stateManager.resolveEventInstance(a.eventId);
    if (!target || isRecurringEvent(target.event)) return;
    const oldStart = target.start;
    const newStart = moveDatePreservingTime(new Date(cell.dataset.date), oldStart);
    const delta = newStart.getTime() - oldStart.getTime();
    if (delta === 0) return;
    this._shiftEvent(target.event, delta);
  }

  /**
   * Apply a move only to a non-recurring event. Series/occurrence mutation
   * requires an explicit scope UI and is intentionally unavailable here.
   * @param {import('@forcecalendar/core').Event} event - Stored event (master for an occurrence)
   * @param {number} delta - Milliseconds to shift start and end by
   * @private
   */
  _shiftEvent(event, delta) {
    if (isRecurringEvent(event)) return;
    this.stateManager.updateEvent(event.id, {
      start: new Date(new Date(event.start).getTime() + delta),
      end: new Date(new Date(event.end).getTime() + delta)
    });
  }

  // ----- time-grid move -----

  _columnAtPoint(x) {
    for (const col of this.container.querySelectorAll(this._columnSelector)) {
      const r = col.getBoundingClientRect();
      if (x >= r.left && x < r.right) return col;
    }
    return null;
  }

  _timeMoveDragMove(e) {
    const a = this._active;
    const col = this._columnAtPoint(e.clientX) || a.originColumn;
    a.dropColumn = col;
    a.deltaMinutes = snapMinutes((e.clientY - a.startY) / PX_PER_MINUTE);
    const originRect = a.originColumn.getBoundingClientRect();
    const colRect = col.getBoundingClientRect();
    a.eventEl.style.transform = `translate(${colRect.left - originRect.left}px, ${a.deltaMinutes * PX_PER_MINUTE}px)`;
  }

  _timeMoveDrop() {
    const a = this._active ?? {};
    const target = this.stateManager.resolveEventInstance(a.eventId);
    if (
      !target ||
      isRecurringEvent(target.event) ||
      (!a.deltaMinutes && a.dropColumn === a.originColumn)
    )
      return;

    const oldStart = target.start;
    const duration = target.end.getTime() - oldStart.getTime();
    const targetDay = a.dropColumn ? new Date(a.dropColumn.dataset.date) : oldStart;
    const dayAligned = moveDatePreservingTime(targetDay, oldStart);
    const startMinutes = clampStartMinutes(
      dayAligned.getHours() * 60 + dayAligned.getMinutes() + (a.deltaMinutes || 0),
      Math.round(duration / 60000)
    );
    const newStart = new Date(dayAligned);
    newStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    if (newStart.getTime() === oldStart.getTime()) return;
    this._shiftEvent(target.event, newStart.getTime() - oldStart.getTime());
  }

  // ----- resize -----

  _resizeDragMove(e) {
    const a = this._active;
    const deltaMinutes = snapMinutes((e.clientY - a.startY) / PX_PER_MINUTE);
    a.newHeight = Math.max(SNAP_MINUTES, a.originHeight + deltaMinutes);
    a.newHeight = Math.min(a.newHeight, 24 * 60 - a.originTop);
    a.eventEl.style.height = `${a.newHeight}px`;
  }

  _resizeDrop() {
    const a = this._active ?? {};
    if (!a.newHeight || a.newHeight === a.originHeight) return;
    const target = this.stateManager.resolveEventInstance(a.eventId);
    if (!target || isRecurringEvent(target.event)) return;
    const { event } = target;
    const newEnd = new Date(new Date(event.start).getTime() + a.newHeight * 60000);
    this.stateManager.updateEvent(event.id, { end: newEnd });
  }

  // ----- drag-to-create -----

  _createDragMove(e) {
    const a = this._active;
    const colRect = a.column.getBoundingClientRect();
    const fromY = a.startY - colRect.top;
    const toY = e.clientY - colRect.top;
    a.fromMinutes = snapMinutes(Math.min(fromY, toY) / PX_PER_MINUTE);
    a.toMinutes = snapMinutes(Math.max(fromY, toY) / PX_PER_MINUTE);
    a.fromMinutes = Math.max(0, a.fromMinutes);
    a.toMinutes = Math.min(24 * 60, Math.max(a.toMinutes, a.fromMinutes + SNAP_MINUTES));

    if (!this._selectionEl) {
      this._selectionEl = this.container.ownerDocument.createElement('div');
      this._selectionEl.className = 'fc-drag-selection';
      a.column.appendChild(this._selectionEl);
    }
    this._selectionEl.style.top = `${a.fromMinutes * PX_PER_MINUTE}px`;
    this._selectionEl.style.height = `${(a.toMinutes - a.fromMinutes) * PX_PER_MINUTE}px`;
  }

  _createDrop() {
    const a = this._active ?? {};
    if (a.fromMinutes == null) return;
    const start = new Date(a.column.dataset.date);
    start.setHours(Math.floor(a.fromMinutes / 60), a.fromMinutes % 60, 0, 0);
    const end = new Date(a.column.dataset.date);
    end.setHours(Math.floor(a.toMinutes / 60), a.toMinutes % 60, 0, 0);
    this.container.dispatchEvent(
      new CustomEvent('range-select', {
        detail: { start, end },
        bubbles: true,
        composed: true
      })
    );
  }

  /** Append a resize handle to every timed event (idempotent per render). */
  _injectResizeHandles() {
    for (const el of this.container.querySelectorAll('.fc-timed-event')) {
      if (!this._canMutateInstance(el.dataset.eventId)) continue;
      if (el.querySelector('.fc-resize-handle')) continue;
      const handle = this.container.ownerDocument.createElement('div');
      handle.className = 'fc-resize-handle';
      handle.setAttribute('aria-hidden', 'true');
      el.appendChild(handle);
    }
  }
}

export default DragController;
