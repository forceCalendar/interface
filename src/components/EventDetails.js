import { DOMUtils } from '../utils/DOMUtils.js';

/**
 * Calendar-owned event details. Uses ordinary DOM nodes in the calendar's
 * shadow root, without portals, native popover APIs or another custom element.
 */
export class EventDetails {
  constructor(container, { onEdit, onDelete, onClose }) {
    this.container = container;
    this.onEdit = onEdit;
    this.onDelete = onDelete;
    this.onClose = onClose;
    this._cleanupFocusTrap = null;
    this._click = e => {
      e.stopPropagation();
      if (e.target === this.container) this.close();
    };
    this._keydown = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (this._confirming) this._render();
        else this.close();
      }
    };
    this._resize = () => {
      const dialog = this.container.firstElementChild;
      if (!this.container.hidden && dialog) this._position(dialog);
    };
    container.addEventListener('click', this._click);
    container.addEventListener('keydown', this._keydown);
  }

  static getStyles() {
    return `
      .fc-details-overlay[hidden] { display: none; }
      .fc-details-overlay { position: fixed; inset: 0; z-index: var(--fc-z-modal); }
      .fc-details-dialog {
        position: absolute; width: 360px; max-width: calc(100vw - 24px);
        max-height: calc(100vh - 24px); overflow-y: auto;
        padding: var(--fc-spacing-lg); background: var(--fc-background);
        color: var(--fc-text-color); border: 1px solid var(--fc-border-color);
        border-radius: var(--fc-border-radius-lg); box-shadow: var(--fc-shadow-lg);
        overflow-wrap: anywhere;
      }
      .fc-details-dialog h3 { margin: 0 0 12px; font-size: var(--fc-font-size-lg); }
      .fc-details-dialog p { margin: 8px 0; }
      .fc-details-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
      .fc-details-note { color: var(--fc-text-secondary); font-size: var(--fc-font-size-sm); }
      .fc-details-dialog button:focus-visible { outline: 2px solid var(--fc-primary-color); outline-offset: 2px; }
    `;
  }

  open(instance, anchor, readOnly = false, locale = 'en-US') {
    this.instance = instance;
    this.anchor = anchor;
    this.readOnly = readOnly;
    this.locale = locale;
    this.container.hidden = false;
    this.container.ownerDocument.defaultView.addEventListener('resize', this._resize);
    this._render();
  }

  _button(label, action, id) {
    const button = this.container.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'fc-btn fc-btn-secondary';
    button.id = id;
    button.textContent = label;
    button.addEventListener('click', () => {
      if (!this.container.hidden && this.container.contains(button)) action();
    });
    return button;
  }

  _render(confirming = false) {
    this._cleanupFocusTrap?.();
    this._confirming = confirming;
    const { event, start, end } = this.instance;
    const doc = this.container.ownerDocument;
    const dialog = doc.createElement('section');
    dialog.className = 'fc-details-dialog';
    dialog.setAttribute('role', confirming ? 'alertdialog' : 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'fc-details-title');
    const title = doc.createElement('h3');
    title.id = 'fc-details-title';
    title.textContent = confirming ? 'Delete event?' : event.title || 'Untitled event';
    dialog.appendChild(title);
    const description = doc.createElement('p');
    description.id = 'fc-details-description';
    dialog.setAttribute('aria-describedby', description.id);
    if (confirming) {
      description.textContent = `Delete “${event.title || 'Untitled event'}”? This cannot be undone in the calendar.`;
    } else {
      const options = { dateStyle: 'medium', ...(event.allDay ? {} : { timeStyle: 'short' }) };
      const format = new Intl.DateTimeFormat(this.locale, options);
      description.textContent = `${format.format(start)} – ${format.format(end)}${event.allDay ? ' · All day' : ' · Local time'}`;
    }
    dialog.appendChild(description);
    if (!confirming && event.location) {
      const location = doc.createElement('p');
      location.textContent = `Location: ${event.location}`;
      dialog.appendChild(location);
    }
    const actions = doc.createElement('div');
    actions.className = 'fc-details-actions';
    if (confirming) {
      actions.appendChild(this._button('Cancel', () => this._render(), 'fc-delete-cancel'));
      actions.appendChild(this._button('Delete event', () => this.onDelete(), 'fc-delete-confirm'));
    } else {
      actions.appendChild(this._button('Close', () => this.close(), 'fc-details-close'));
      if (!this.readOnly && !EventDetails.isRecurring(event)) {
        actions.appendChild(this._button('Edit', () => this.onEdit(), 'fc-details-edit'));
        actions.appendChild(this._button('Delete', () => this._render(true), 'fc-details-delete'));
      }
      if (EventDetails.isRecurring(event)) {
        const note = doc.createElement('p');
        note.className = 'fc-details-note';
        note.textContent = 'Recurring event. Editing and deleting a series is not available here.';
        dialog.appendChild(note);
      }
    }
    dialog.appendChild(actions);
    this.container.replaceChildren(dialog);
    this._position(dialog);
    this._cleanupFocusTrap = DOMUtils.trapFocus(dialog);
  }

  static isRecurring(event) {
    return Boolean(
      event.recurring || event.recurrenceRule || event.isOccurrence || event.recurringEventId
    );
  }

  _position(dialog) {
    const bounds = this.anchor?.getBoundingClientRect();
    const win = this.container.ownerDocument.defaultView;
    const width = dialog.getBoundingClientRect().width || 360;
    const height = dialog.getBoundingClientRect().height || 250;
    const left = Math.max(12, Math.min(bounds?.left ?? 12, win.innerWidth - width - 12));
    const top = Math.max(12, Math.min(bounds?.bottom ?? 12, win.innerHeight - height - 12));
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
  }

  showError(message) {
    let error = this.container.querySelector('[role="alert"]');
    if (!error) {
      error = this.container.ownerDocument.createElement('p');
      error.setAttribute('role', 'alert');
      this.container.firstElementChild?.appendChild(error);
    }
    error.textContent = message;
  }

  close(restoreFocus = true) {
    if (this.container.hidden) return;
    this._cleanupFocusTrap?.();
    this._cleanupFocusTrap = null;
    this.container.hidden = true;
    this.container.ownerDocument.defaultView.removeEventListener('resize', this._resize);
    this.container.replaceChildren();
    this.onClose(restoreFocus);
  }

  destroy() {
    this.close(false);
    this.container.removeEventListener('click', this._click);
    this.container.removeEventListener('keydown', this._keydown);
  }
}
