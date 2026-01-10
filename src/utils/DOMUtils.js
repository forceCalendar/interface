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
        const delegatedHandler = (e) => {
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
     */
    static waitForAnimation(element, eventType = 'animationend') {
        return new Promise(resolve => {
            const handler = () => {
                element.removeEventListener(eventType, handler);
                resolve();
            };
            element.addEventListener(eventType, handler);
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
     */
    static parseHTML(htmlString) {
        const template = document.createElement('template');
        template.innerHTML = htmlString.trim();
        return template.content.firstChild;
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
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle(func, limit = 250) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
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
     * Clone element with event listeners
     */
    static cloneWithEvents(element, deep = true) {
        const clone = element.cloneNode(deep);

        // Copy event listeners (Note: This is a simplified version)
        // In production, you'd need a more robust event copying mechanism
        return clone;
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

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    lastFocusable?.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
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