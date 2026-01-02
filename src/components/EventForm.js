import { BaseComponent } from '../core/BaseComponent.js';
import { StyleUtils } from '../utils/StyleUtils.js';
import { DOMUtils } from '../utils/DOMUtils.js';

export class EventForm extends BaseComponent {
    constructor() {
        super();
        this._isVisible = false;
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
        return ['open'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') {
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
                border-radius: var(--fc-border-radius-lg);
                box-shadow: var(--fc-shadow-lg);
                border: 1px solid var(--fc-border-color);
                display: flex;
                flex-direction: column;
                animation: fc-scale-in var(--fc-transition);
            }

            .modal-header {
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
                padding: var(--fc-spacing-lg);
                display: flex;
                flex-direction: column;
                gap: var(--fc-spacing-md);
            }

            .form-group {
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
                gap: var(--fc-spacing-md);
            }
            
            .row .form-group {
                flex: 1;
            }

            .modal-footer {
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
                    <h3 class="modal-title" id="modal-title">${this.config.title}</h3>
                    <button class="close-btn" id="close-x" aria-label="Close modal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </header>
                
                <div class="modal-body">
                    <div class="form-group" id="title-group">
                        <label for="event-title">Title</label>
                        <input type="text" id="event-title" placeholder="Event name" autofocus required>
                        <span class="error-message">Title is required</span>
                    </div>

                    <div class="row">
                        <div class="form-group" id="start-group">
                            <label for="event-start">Start</label>
                            <input type="datetime-local" id="event-start" required>
                        </div>
                        <div class="form-group" id="end-group">
                            <label for="event-end">End</label>
                            <input type="datetime-local" id="event-end" required>
                            <span class="error-message">End time must be after start time</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label id="color-label">Color</label>
                        <div class="color-options" id="color-picker" role="radiogroup" aria-labelledby="color-label">
                            ${this.config.colors.map(c => `
                                <button type="button" 
                                        class="color-btn ${c.color === this._formData.color ? 'selected' : ''}" 
                                        style="background-color: ${c.color}" 
                                        data-color="${c.color}"
                                        title="${c.label}"
                                        aria-label="${c.label}"
                                        aria-checked="${c.color === this._formData.color ? 'true' : 'false'}"
                                        role="radio"></button>
                            `).join('')}
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
        this.startInput = this.$('#event-start');
        this.endInput = this.$('#event-end');
        this.colorContainer = this.$('#color-picker');
        
        this.titleGroup = this.$('#title-group');
        this.endGroup = this.$('#end-group');

        // Event Listeners
        this.$('#close-x').addEventListener('click', () => this.close());
        this.$('#cancel-btn').addEventListener('click', () => this.close());
        this.$('#save-btn').addEventListener('click', () => this.save());

        this.colorContainer.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this._formData.color = e.target.dataset.color;
                this.updateColorSelection();
            });
        });

        // Close on backdrop click
        this.addEventListener('click', (e) => {
            if (e.target === this) this.close();
        });

        // Close on Escape key
        this._handleKeyDown = (e) => {
            if (e.key === 'Escape' && this.hasAttribute('open')) {
                this.close();
            }
        };
        window.addEventListener('keydown', this._handleKeyDown);
    }

    updateColorSelection() {
        const buttons = this.colorContainer.querySelectorAll('.color-btn');
        buttons.forEach(btn => {
            const isSelected = btn.dataset.color === this._formData.color;
            btn.classList.toggle('selected', isSelected);
            btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });
    }

    open(initialDate = new Date()) {
        this.setAttribute('open', '');
        
        // Reset errors
        this.titleGroup.classList.remove('has-error');
        this.endGroup.classList.remove('has-error');

        // Initialize form data
        this._formData.start = initialDate;
        this._formData.end = new Date(initialDate.getTime() + this.config.defaultDuration * 60 * 1000);
        this._formData.title = '';
        this._formData.color = this.config.colors[0].color;
        
        // Update inputs
        if (this.startInput) {
            this.titleInput.value = '';
            this.startInput.value = this.formatDateForInput(this._formData.start);
            this.endInput.value = this.formatDateForInput(this._formData.end);
            this.updateColorSelection();
            
            // Focus trapping
            this._cleanupFocusTrap = DOMUtils.trapFocus(this.modalContent);
        }
    }

    close() {
        this.removeAttribute('open');
        if (this._cleanupFocusTrap) {
            this._cleanupFocusTrap();
            this._cleanupFocusTrap = null;
        }
    }

    validate() {
        let isValid = true;
        
        // Reset errors
        this.titleGroup.classList.remove('has-error');
        this.endGroup.classList.remove('has-error');

        // Check title
        if (!this.titleInput.value.trim()) {
            this.titleGroup.classList.add('has-error');
            isValid = false;
        }

        // Check date range
        const start = new Date(this.startInput.value);
        const end = new Date(this.endInput.value);
        if (end <= start) {
            this.endGroup.classList.add('has-error');
            isValid = false;
        }

        return isValid;
    }

    save() {
        if (!this.validate()) return;

        const event = {
            title: this.titleInput.value.trim(),
            start: new Date(this.startInput.value),
            end: new Date(this.endInput.value),
            backgroundColor: this._formData.color
        };

        this.emit('save', event);
        this.close();
    }

    formatDateForInput(date) {
        // Handle local date string for datetime-local input
        const pad = (num) => String(num).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    unmount() {
        if (this._cleanupFocusTrap) {
            this._cleanupFocusTrap();
        }
        window.removeEventListener('keydown', this._handleKeyDown);
    }
}

if (!customElements.get('force-calendar-event-form')) {
    customElements.define('force-calendar-event-form', EventForm);
}
