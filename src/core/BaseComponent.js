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

    const styles = `
            <style>
                ${this.getBaseStyles()}
                ${this.getStyles()}
            </style>
        `;

    const template = this.template();
    this.shadowRoot.innerHTML = styles + template;
    this.afterRender();
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
