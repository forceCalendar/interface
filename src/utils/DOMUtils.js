/**
 * DOMUtils - DOM manipulation and event utilities
 */

export class DOMUtils {
  /**
   * Create element with attributes and children
   */
  static createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else {
        element[key] = value;
      }
    });

    // Add children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });

    return element;
  }

  /**
   * Add multiple event listeners
   */
  static addEventListeners(element, events) {
    Object.entries(events).forEach(([event, handler]) => {
      element.addEventListener(event, handler);
    });

    // Return cleanup function
    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        element.removeEventListener(event, handler);
      });
    };
  }

  /**
   * Delegate event handling
   */
  static delegate(element, selector, event, handler) {
    const delegatedHandler = e => {
      const target = e.target.closest(selector);
      if (target && element.contains(target)) {
        handler.call(target, e);
      }
    };

    element.addEventListener(event, delegatedHandler);
    return () => element.removeEventListener(event, delegatedHandler);
  }

  /**
   * Get element position relative to viewport
   */
  static getPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      right: rect.right + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  }

  /**
   * Check if element is in viewport
   */
  static isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= -threshold &&
      rect.left >= -threshold &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) + threshold
    );
  }

  /**
   * Smooth scroll to element
   */
  static scrollToElement(element, options = {}) {
    const { behavior = 'smooth', block = 'start', inline = 'nearest' } = options;
    element.scrollIntoView({ behavior, block, inline });
  }

  /**
   * Get computed style value
   */
  static getStyle(element, property) {
    return window.getComputedStyle(element).getPropertyValue(property);
  }

  /**
   * Set multiple styles
   */
  static setStyles(element, styles) {
    Object.assign(element.style, styles);
  }

  /**
   * Add/remove classes with animation support
   */
  static async animateClass(element, className, duration = 300) {
    element.classList.add(className);
    await this.wait(duration);
    element.classList.remove(className);
  }

  /**
   * Wait for animation/transition to complete
   * Resolves after `timeout` ms even if the event never fires (animation
   * cancelled, element removed from DOM, etc.) so awaiting callers can't hang.
   * @param {Element} element - Element to listen on
   * @param {string} [eventType='animationend'] - Event to wait for
   * @param {number} [timeout=3000] - Max wait in ms; 0 disables the timeout
   */
  static waitForAnimation(element, eventType = 'animationend', timeout = 3000) {
    return new Promise(resolve => {
      let timeoutId = null;
      const handler = () => {
        if (timeoutId !== null) clearTimeout(timeoutId);
        element.removeEventListener(eventType, handler);
        resolve();
      };
      element.addEventListener(eventType, handler);
      if (timeout > 0) {
        timeoutId = setTimeout(handler, timeout);
      }
    });
  }

  /**
   * Utility wait function
   */
  static wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse HTML string safely
   * Sanitizes by default: strips script-capable elements, inline event
   * handlers and javascript: URLs so the returned node is inert even if the
   * input contains an XSS payload. Pass { sanitize: false } only for trusted,
   * non-user-controlled markup.
   */
  static parseHTML(htmlString, { sanitize = true } = {}) {
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    if (sanitize) {
      this._sanitizeNode(template.content);
    }
    return template.content.firstChild;
  }

  /**
   * Remove script-capable elements, on* handlers and javascript: URLs
   * from a parsed DOM fragment (in place)
   */
  static _sanitizeNode(root) {
    const DANGEROUS_TAGS = 'script, iframe, object, embed, link, meta, base';
    root.querySelectorAll(DANGEROUS_TAGS).forEach(el => el.remove());

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      for (const attr of Array.from(node.attributes)) {
        const name = attr.name.toLowerCase();
        // Browsers ignore control chars/whitespace inside URL schemes,
        // so strip them before checking for javascript:/data: payloads
        const value = attr.value.replace(/[\u0000-\u0020]/g, '').toLowerCase();
        if (
          name.startsWith('on') ||
          value.startsWith('javascript:') ||
          value.startsWith('data:text/html')
        ) {
          node.removeAttribute(attr.name);
        }
      }
      node = walker.nextNode();
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  static escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Debounce function calls
   */
  static debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle(func, limit = 250) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Get closest parent matching selector
   */
  static closest(element, selector) {
    return element.closest(selector);
  }

  /**
   * Get all parents matching selector
   */
  static parents(element, selector) {
    const parents = [];
    let parent = element.parentElement;

    while (parent) {
      if (parent.matches(selector)) {
        parents.push(parent);
      }
      parent = parent.parentElement;
    }

    return parents;
  }

  /**
   * Measure element dimensions including margins
   */
  static getOuterDimensions(element) {
    const styles = window.getComputedStyle(element);
    const margin = {
      top: parseInt(styles.marginTop),
      right: parseInt(styles.marginRight),
      bottom: parseInt(styles.marginBottom),
      left: parseInt(styles.marginLeft)
    };

    return {
      width: element.offsetWidth + margin.left + margin.right,
      height: element.offsetHeight + margin.top + margin.bottom,
      margin
    };
  }

  /**
   * Clone an element. Event listeners are NOT copied — the Web Platform
   * provides no way to enumerate listeners, so callers must re-attach their
   * own handlers to the clone.
   * @deprecated Use element.cloneNode(deep) directly and re-bind listeners.
   */
  static cloneWithEvents(element, deep = true) {
    return element.cloneNode(deep);
  }

  /**
   * Focus trap for modals/dialogs
   */
  static trapFocus(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // Handle case where there are no focusable elements
    if (focusableElements.length === 0) {
      // Make container focusable as fallback
      container.setAttribute('tabindex', '-1');
      container.focus();
      return () => container.removeAttribute('tabindex');
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = e => {
      if (e.key !== 'Tab') return;

      // Inside Shadow DOM, document.activeElement reports the host element;
      // the shadow root's own activeElement gives the truly focused node.
      const root = container.getRootNode();
      const activeElement = root.activeElement ?? document.activeElement;

      if (e.shiftKey) {
        if (activeElement === firstFocusable) {
          lastFocusable?.focus();
          e.preventDefault();
        }
      } else {
        if (activeElement === lastFocusable) {
          firstFocusable?.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }
}

export default DOMUtils;
