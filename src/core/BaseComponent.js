/**
 * BaseComponent - Foundation for all Force Calendar Web Components
 *
 * Provides common functionality:
 * - Shadow DOM setup
 * - Event handling
 * - State management integration
 * - Lifecycle management
 * - Style management
 */

export class BaseComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._listeners = [];
    this._state = null;
    this._props = new Map();
    this._initialized = false;
  }

  // Lifecycle methods
  connectedCallback() {
    if (!this._initialized) {
      this.initialize();
      this._initialized = true;
    }
    this.mount();
  }

  disconnectedCallback() {
    this.unmount();
    this.cleanup();
    this._styleEl = null;
    this._contentWrapper = null;
  }

  // To be overridden by child classes
  initialize() {
    // Setup component-specific initialization
  }

  mount() {
    // Component mounted to DOM
    this.render();
  }

  unmount() {
    // Component removed from DOM
  }

  cleanup() {
    // Clean up event listeners
    this._listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this._listeners = [];
  }

  // State management
  setState(newState) {
    const oldState = this._state;
    this._state = { ...this._state, ...newState };
    this.stateChanged(oldState, this._state);
    this.render();
  }

  getState() {
    return this._state;
  }

  stateChanged(_oldState, _newState) {
    // Override in child classes to handle state changes
  }

  // Props management
  setProp(key, value) {
    const oldValue = this._props.get(key);
    this._props.set(key, value);
    this.propChanged(key, oldValue, value);
  }

  getProp(key) {
    return this._props.get(key);
  }

  propChanged(_key, _oldValue, _newValue) {
    // Override in child classes to handle prop changes
  }

  // Event handling
  addListener(element, event, handler) {
    if (!element || !event || !handler) {
      console.warn('addListener called with invalid parameters', { element, event, handler });
      return;
    }
    const boundHandler = handler.bind(this);
    element.addEventListener(event, boundHandler);
    this._listeners.push({ element, event, handler: boundHandler });
  }

  emit(eventName, detail = {}) {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  // Style management
  getStyles() {
    // Override in child classes to provide component styles
    return '';
  }

  getBaseStyles() {
    return `
            :host {
                display: block;
                box-sizing: border-box;
            }

            *, *::before, *::after {
                box-sizing: inherit;
            }
        `;
  }

  // Template rendering
  render() {
    // Clean up existing listeners before replacing DOM
    this.cleanup();

    const template = this.template();

    // First render: create style element and content wrapper
    if (!this._styleEl) {
      this._styleEl = document.createElement('style');
      this._styleEl.textContent = this.getBaseStyles() + '\n' + this.getStyles();
      this.shadowRoot.appendChild(this._styleEl);
      this._contentWrapper = document.createElement('div');
      this._contentWrapper.setAttribute('id', 'fc-root');
      this._contentWrapper.style.display = 'contents';
      this.shadowRoot.appendChild(this._contentWrapper);
    }

    // Save scroll positions and focused element before DOM replacement
    const scrollPositions = this._saveScrollPositions();
    const activeSelector = this._getActiveElementSelector();

    this._contentWrapper.innerHTML = template;

    // Restore scroll positions and focus
    this._restoreScrollPositions(scrollPositions);
    this._restoreFocus(activeSelector);

    this.afterRender();
  }

  /**
   * Save scroll positions of all scrollable containers within shadow DOM
   * @returns {Map<string, {top: number, left: number}>}
   */
  _saveScrollPositions() {
    const positions = new Map();
    if (!this._contentWrapper) return positions;
    const scrollables = this._contentWrapper.querySelectorAll('[id]');
    scrollables.forEach(el => {
      if (el.scrollTop !== 0 || el.scrollLeft !== 0) {
        positions.set(el.id, { top: el.scrollTop, left: el.scrollLeft });
      }
    });
    return positions;
  }

  /**
   * Restore previously saved scroll positions
   * @param {Map<string, {top: number, left: number}>} positions
   */
  _restoreScrollPositions(positions) {
    if (!this._contentWrapper || positions.size === 0) return;
    positions.forEach((pos, id) => {
      const el = this._contentWrapper.querySelector('#' + id);
      if (el) {
        el.scrollTop = pos.top;
        el.scrollLeft = pos.left;
      }
    });
  }

  /**
   * Get a CSS selector for the currently focused element within shadow DOM
   * @returns {string|null}
   */
  _getActiveElementSelector() {
    const active = this.shadowRoot.activeElement;
    if (!active || active === this._contentWrapper) return null;
    if (active.id) return '#' + active.id;
    if (active.tagName) {
      const tag = active.tagName.toLowerCase();
      const className = active.className ? '.' + active.className.split(/\s+/).join('.') : '';
      return tag + className;
    }
    return null;
  }

  /**
   * Restore focus to a previously focused element
   * @param {string|null} selector
   */
  _restoreFocus(selector) {
    if (!selector || !this._contentWrapper) return;
    try {
      const el = this._contentWrapper.querySelector(selector);
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
    } catch (_) {
      // Invalid selector, ignore
    }
  }

  template() {
    // Override in child classes to provide component template
    return '';
  }

  afterRender() {
    // Override in child classes for post-render operations
  }

  // Utility methods
  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  $$(selector) {
    return this.shadowRoot.querySelectorAll(selector);
  }

  // Attribute observation
  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.setProp(name, newValue);
    if (this._initialized) {
      this.render();
    }
  }
}
