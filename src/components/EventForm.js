import { BaseComponent } from '../core/BaseComponent.js';
import { StyleUtils } from '../utils/StyleUtils.js';
import { DOMUtils } from '../utils/DOMUtils.js';
import { isRecurringEvent } from '../utils/EventUtils.js';

/**
 * @typedef {Object} EditableEvent
 * @property {string} id
 * @property {Date|string} start
 * @property {Date|string} end
 * @property {string} [title]
 * @property {string} [location]
 * @property {boolean} [allDay]
 * @property {string|null} [backgroundColor]
 */

export class EventForm extends BaseComponent {
  constructor() {
    super();
    this._isVisible = false;
    /** @type {string|null} */
    this.editingEventId = null;
    this._cleanupFocusTrap = null;
    this.config = {
      title: 'New Event',
      defaultDuration: 60, // minutes
      colors: [
        { color: '#2563EB', label: 'Blue' },
        { color: '#10B981', label: 'Green' },
        { color: '#F59E0B', label: 'Amber' },
        { color: '#EF4444', label: 'Red' },
        { color: '#8B5CF6', label: 'Purple' },
        { color: '#6B7280', label: 'Gray' }
      ]
    };
    this._formData = {
      title: '',
      start: new Date(),
      end: new Date(),
      allDay: false,
      color: this.config.colors[0].color
    };
  }

  static get observedAttributes() {
    return ['open', 'show-color-picker'];
  }

  get showColorPicker() {
    return this.getAttribute('show-color-picker')?.trim().toLowerCase() !== 'false';
  }

  /** @param {boolean} value */
  set showColorPicker(value) {
    this.setAttribute('show-color-picker', String(Boolean(value)));
  }

  _updateColorPickerVisibility() {
    const group = this.$('#color-group');
    if (!group) return;
    group.hidden = !this.showColorPicker;
    group.querySelectorAll('button').forEach(button => {
      button.disabled = !this.showColorPicker;
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'show-color-picker') {
      this._updateColorPickerVisibility();
      return;
    }
    if (name === 'open' && oldValue !== newValue && !this._reflectingOpen) {
      if (newValue !== null) {
        this.open();
      } else {
        this.close();
      }
    }
  }

  getStyles() {
    return `
            ${StyleUtils.getBaseStyles()}
            ${StyleUtils.getButtonStyles()}

            :host {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: var(--fc-z-modal);
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(2px);
            }

            :host([open]) {
                display: flex;
            }

            .modal-content {
                background: var(--fc-background);
                width: 400px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: hidden;
                border-radius: var(--fc-border-radius-lg);
                box-shadow: var(--fc-shadow-lg);
                border: 1px solid var(--fc-border-color);
                display: flex;
                flex-direction: column;
                animation: fc-scale-in var(--fc-transition);
            }

            .modal-header {
                flex-shrink: 0;
                padding: var(--fc-spacing-lg);
                border-bottom: 1px solid var(--fc-border-color);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .modal-title {
                font-size: var(--fc-font-size-lg);
                font-weight: var(--fc-font-weight-semibold);
                color: var(--fc-text-color);
            }

            .close-btn {
                background: transparent;
                border: none;
                color: var(--fc-text-secondary);
                cursor: pointer;
                padding: 4px;
                border-radius: var(--fc-border-radius-sm);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .close-btn:hover {
                background: var(--fc-background-hover);
                color: var(--fc-text-color);
            }

            .modal-body {
                min-height: 0;
                overflow-y: auto;
                padding: var(--fc-spacing-lg);
                display: flex;
                flex-direction: column;
                gap: var(--fc-spacing-md);
            }

            .form-group[hidden] { display: none; }

            .form-group {
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            label {
                font-size: var(--fc-font-size-sm);
                font-weight: var(--fc-font-weight-medium);
                color: var(--fc-text-secondary);
            }

            input[type="text"],
            input[type="datetime-local"],
            select {
                width: 100%;
                min-width: 0;
                padding: 8px 12px;
                border: 1px solid var(--fc-border-color);
                border-radius: var(--fc-border-radius);
                font-family: var(--fc-font-family);
                font-size: var(--fc-font-size-base);
                color: var(--fc-text-color);
                background: var(--fc-background);
                transition: border-color var(--fc-transition-fast);
            }

            input:focus,
            select:focus {
                outline: none;
                border-color: var(--fc-primary-color);
                box-shadow: 0 0 0 2px var(--fc-primary-light);
            }

            .row {
                display: flex;
                flex-direction: column;
                gap: var(--fc-spacing-md);
            }
            
            .row .form-group {
                flex: 1;
            }

            .modal-footer {
                flex-shrink: 0;
                padding: var(--fc-spacing-lg);
                border-top: 1px solid var(--fc-border-color);
                display: flex;
                justify-content: flex-end;
                gap: var(--fc-spacing-md);
                background: var(--fc-background-alt);
                border-bottom-left-radius: var(--fc-border-radius-lg);
                border-bottom-right-radius: var(--fc-border-radius-lg);
            }

            /* Color picker style */
            .color-options {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 4px;
            }

            .color-btn {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid transparent;
                transition: transform var(--fc-transition-fast), border-color var(--fc-transition-fast);
                padding: 0;
                position: relative;
            }

            .color-btn:hover {
                transform: scale(1.1);
            }

            .color-btn.selected {
                border-color: var(--fc-text-color);
                box-shadow: 0 0 0 2px var(--fc-background), 0 0 0 4px var(--fc-primary-color);
            }

            .color-btn:focus {
                outline: none;
                box-shadow: 0 0 0 2px var(--fc-background), 0 0 0 4px var(--fc-primary-color);
            }

            .error-message {
                color: var(--fc-danger-color);
                font-size: 11px;
                margin-top: 2px;
                display: none;
            }

            .form-group.has-error .error-message {
                display: block;
            }

            .form-group.has-error input {
                border-color: var(--fc-danger-color);
            }
        `;
  }

  template() {
    return `
            <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <header class="modal-header">
                    <h3 class="modal-title" id="modal-title">${DOMUtils.escapeHTML(this.config.title)}</h3>
                    <button class="close-btn" id="close-x" aria-label="Close modal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </header>
                
                <div class="modal-body">
                    <div class="form-group" id="title-group">
                        <label for="event-title">Title</label>
                        <input type="text" id="event-title" placeholder="Event name" aria-describedby="title-error" required>
                        <span class="error-message" id="title-error">Title is required</span>
                    </div>

                    <div class="form-group">
                        <label for="event-location">Location</label>
                        <input type="text" id="event-location" placeholder="Add a location">
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="event-all-day"> All day</label>
                    </div>
                    <p id="save-error" role="alert" hidden></p>
                    <div class="row">
                        <div class="form-group" id="start-group">
                            <label for="event-start">Start</label>
                            <input type="datetime-local" id="event-start" aria-describedby="start-error" required>
                            <span class="error-message" id="start-error">Enter a valid start time</span>
                        </div>
                        <div class="form-group" id="end-group">
                            <label for="event-end">End</label>
                            <input type="datetime-local" id="event-end" aria-describedby="end-error" required>
                            <span class="error-message" id="end-error">Enter a valid end time after the start time</span>
                        </div>
                    </div>

                    <div class="form-group" id="color-group">
                        <label id="color-label">Color</label>
                        <div class="color-options" id="color-picker" role="radiogroup" aria-labelledby="color-label">
                            ${this.config.colors
                              .map(
                                c => `
                                <button type="button"
                                        class="color-btn ${c.color === this._formData.color ? 'selected' : ''}"
                                        style="background-color: ${StyleUtils.sanitizeColor(c.color)}"
                                        data-color="${DOMUtils.escapeHTML(c.color)}"
                                        title="${DOMUtils.escapeHTML(c.label)}"
                                        aria-label="${DOMUtils.escapeHTML(c.label)}"
                                        aria-checked="${c.color === this._formData.color ? 'true' : 'false'}"
                                        role="radio"></button>
                            `
                              )
                              .join('')}
                        </div>
                    </div>
                </div>

                <footer class="modal-footer">
                    <button class="fc-btn fc-btn-secondary" id="cancel-btn">Cancel</button>
                    <button class="fc-btn fc-btn-primary" id="save-btn">Save Event</button>
                </footer>
            </div>
        `;
  }

  afterRender() {
    // Bind elements
    this.modalContent = this.$('.modal-content');
    this.titleInput = this.$('#event-title');
    this.locationInput = this.$('#event-location');
    this.allDayInput = this.$('#event-all-day');
    this.startInput = this.$('#event-start');
    this.endInput = this.$('#event-end');
    this.colorContainer = this.$('#color-picker');
    this._updateColorPickerVisibility();

    this.titleGroup = this.$('#title-group');
    this.startGroup = this.$('#start-group');
    this.endGroup = this.$('#end-group');

    // Event Listeners using addListener for automatic cleanup
    this.addListener(this.$('#close-x'), 'click', () => this.close());
    this.addListener(this.$('#cancel-btn'), 'click', () => this.close());
    this.addListener(this.$('#save-btn'), 'click', () => this.save());
    this.addListener(this.allDayInput, 'change', () => this._syncDateInputMode());

    this.colorContainer.querySelectorAll('.color-btn').forEach(btn => {
      this.addListener(btn, 'click', e => {
        if (!this.showColorPicker) return;
        this._formData.color = e.currentTarget.dataset.color;
        this._colorChanged = true;
        this.updateColorSelection();
      });
    });

    // Shadow DOM retargets inside clicks to the host. Only dismiss when the
    // composed path does not pass through the dialog, including nested shadows.
    this.addListener(this, 'click', e => {
      if (!e.composedPath().includes(this.modalContent)) this.close();
    });

    // Scope dismissal to this dialog: another calendar's Escape must not close it.
    this.addListener(this, 'keydown', e => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });
    if (this.hasAttribute('open')) this.open();
  }

  updateColorSelection() {
    const buttons = this.colorContainer.querySelectorAll('.color-btn');
    buttons.forEach(btn => {
      const isSelected = btn.dataset.color === this._formData.color;
      btn.classList.toggle('selected', isSelected);
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
  }

  /**
   * @param {Date} [initialDate]
   * @param {Date|null} [initialEnd]
   */
  open(initialDate = new Date(), initialEnd = null) {
    this.editingEventId = null;
    this._show({
      title: '',
      location: '',
      allDay: false,
      start: new Date(initialDate),
      end: initialEnd
        ? new Date(initialEnd)
        : new Date(initialDate.getTime() + this.config.defaultDuration * 60000),
      backgroundColor: this.config.colors[0].color
    });
  }

  /**
   * Prefill an existing event without modifying it or copying its metadata into the patch.
   * @param {EditableEvent} event
   */
  edit(event) {
    if (isRecurringEvent(event)) {
      this.close();
      return;
    }
    this.editingEventId = event.id;
    this._show(event);
  }

  _show(event) {
    if (!this.isConnected || !this.modalContent?.isConnected) return;
    if (!this._isVisible) this._returnFocus = this.getRootNode().activeElement;
    this._isVisible = true;
    this._reflectingOpen = true;
    this.setAttribute('open', '');
    this._reflectingOpen = false;
    this._originalBackgroundColor = event.backgroundColor;
    this._colorChanged = false;
    this._formData = {
      title: event.title || '',
      location: event.location || '',
      allDay: Boolean(event.allDay),
      start: new Date(event.start),
      end: new Date(event.end),
      color: event.backgroundColor || this.config.colors[0].color
    };
    this.$('#modal-title').textContent =
      this.editingEventId === null ? this.config.title : 'Edit Event';
    this.titleInput.value = this._formData.title;
    this.locationInput.value = this._formData.location;
    this.allDayInput.checked = this._formData.allDay;
    this._timedDraft = null;
    this.startInput.type = this.endInput.type = this._formData.allDay ? 'date' : 'datetime-local';
    this.startInput.value = this.formatDateForInput(this._formData.start).slice(
      0,
      this._formData.allDay ? 10 : undefined
    );
    this.endInput.value = this.formatDateForInput(this._formData.end).slice(
      0,
      this._formData.allDay ? 10 : undefined
    );
    this._updateDateLabels();
    this._initialStartInput = this.startInput.value;
    this._initialEndInput = this.endInput.value;
    this._resetErrors();
    this.updateColorSelection();
    this._cleanupFocusTrap?.();
    this._cleanupFocusTrap = DOMUtils.trapFocus(this.modalContent);
    this.titleInput.focus();
  }

  close(restoreFocus = true) {
    const wasVisible = this._isVisible;
    this._isVisible = false;
    this._reflectingOpen = true;
    this.removeAttribute('open');
    this._reflectingOpen = false;
    this._cleanupFocusTrap?.();
    this._cleanupFocusTrap = null;
    if (wasVisible) {
      if (restoreFocus && DOMUtils.canRestoreFocus(this._returnFocus)) this._returnFocus.focus();
      this._returnFocus = null;
      this.emit('close', { restoreFocus });
    }
    this.editingEventId = null;
  }

  _resetErrors() {
    for (const [group, input] of [
      [this.titleGroup, this.titleInput],
      [this.startGroup, this.startInput],
      [this.endGroup, this.endInput]
    ]) {
      group.classList.remove('has-error');
      input.removeAttribute('aria-invalid');
    }
    this.$('#save-error').hidden = true;
  }

  /** @param {string} message */
  showError(message) {
    const error = this.$('#save-error');
    error.textContent = message;
    error.hidden = false;
  }

  _updateDateLabels() {
    this.$('label[for="event-start"]').textContent = this.allDayInput.checked
      ? 'Start date'
      : 'Start';
    this.$('label[for="event-end"]').textContent = this.allDayInput.checked
      ? 'Last day (inclusive)'
      : 'End';
    this.$('#end-error').textContent = this.allDayInput.checked
      ? 'Choose a last day on or after the start date'
      : 'Enter a valid end time after the start time';
  }

  _syncDateInputMode() {
    const allDay = this.allDayInput.checked;
    const startValue = this.startInput.value;
    const endValue = this.endInput.value;
    if (allDay && this.startInput.type !== 'date') {
      this._timedDraft = { start: startValue, end: endValue };
      this.startInput.type = this.endInput.type = 'date';
      this.startInput.value = startValue.slice(0, 10);
      this.endInput.value = endValue.slice(0, 10);
    } else if (!allDay && this.startInput.type === 'date') {
      this.startInput.type = this.endInput.type = 'datetime-local';
      // Restore the previous timed draft when toggling back. For an existing
      // all-day event, default to sensible local working hours instead.
      this.startInput.value = startValue
        ? `${startValue}T${this._timedDraft?.start.slice(11) || '09:00'}`
        : '';
      this.endInput.value = endValue
        ? `${endValue}T${this._timedDraft?.end.slice(11) || '10:00'}`
        : '';
      if (
        this.startInput.value &&
        this.endInput.value &&
        new Date(this.endInput.value) <= new Date(this.startInput.value)
      ) {
        this.endInput.value = this.formatDateForInput(
          new Date(new Date(this.startInput.value).getTime() + this.config.defaultDuration * 60000)
        );
      }
    }
    this._updateDateLabels();
  }

  _readInputDates() {
    const allDay = this.allDayInput.checked;
    const read = (input, field, initial) => {
      // Unchanged timed inputs preserve sub-minute precision and DST-fold
      // identity. All-day values are civil dates with inclusive end dates.
      if (
        !allDay &&
        this.editingEventId !== null &&
        allDay === this._formData.allDay &&
        input.value === initial
      ) {
        return new Date(this._formData[field]);
      }
      if (!allDay) return new Date(input.value);
      const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(input.value);
      if (!match) return new Date(NaN);
      const date = new Date(0);
      date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      date.setHours(
        field === 'end' ? 23 : 0,
        field === 'end' ? 59 : 0,
        field === 'end' ? 59 : 0,
        field === 'end' ? 999 : 0
      );
      if (
        date.getFullYear() !== Number(match[1]) ||
        date.getMonth() !== Number(match[2]) - 1 ||
        date.getDate() !== Number(match[3])
      )
        return new Date(NaN);
      return date;
    };
    return {
      start: read(this.startInput, 'start', this._initialStartInput),
      end: read(this.endInput, 'end', this._initialEndInput)
    };
  }

  validate() {
    this._syncDateInputMode();
    this._resetErrors();
    const { start, end } = this._readInputDates();
    let firstInvalid = null;
    const checks = [
      [this.titleGroup, this.titleInput, !this.titleInput.value.trim()],
      [this.startGroup, this.startInput, !Number.isFinite(start.getTime())],
      [this.endGroup, this.endInput, !Number.isFinite(end.getTime()) || end <= start]
    ];
    for (const [group, input, invalid] of checks) {
      if (invalid) {
        group.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
        firstInvalid ||= input;
      }
    }
    firstInvalid?.focus();
    return !firstInvalid;
  }

  save() {
    if (!this._isVisible || !this.validate()) return;
    const event = {
      title: this.titleInput.value.trim(),
      location: this.locationInput.value.trim(),
      allDay: this.allDayInput.checked,
      ...this._readInputDates(),
      backgroundColor:
        this.editingEventId !== null && !this._colorChanged
          ? this._originalBackgroundColor
          : this._formData.color
    };
    // The calendar may reject a stale edit or report a storage/validation error.
    // Leave the user's draft visible when the listener cancels the save.
    if (
      this.dispatchEvent(
        new CustomEvent('save', {
          detail: event,
          bubbles: true,
          composed: true,
          cancelable: true
        })
      )
    )
      this.close();
  }

  formatDateForInput(date) {
    // Handle local date string for datetime-local input
    const pad = num => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  unmount() {
    this.close(false);
  }
}

if (!customElements.get('forcecal-event-form')) {
  customElements.define('forcecal-event-form', EventForm);
}
