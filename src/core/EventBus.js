/**
 * EventBus - Central event communication system
 *
 * Enables decoupled communication between components
 * Supports event namespacing and wildcard subscriptions
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.wildcardHandlers = new Set();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name or pattern (supports wildcards)
   * @param {Function} handler - Event handler function
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler, options = {}) {
    const { once = false, priority = 0 } = options;

    // Handle wildcard subscriptions
    if (eventName.includes('*')) {
      const subscription = { pattern: eventName, handler, once, priority };
      this.wildcardHandlers.add(subscription);
      return () => this.wildcardHandlers.delete(subscription);
    }

    // Regular event subscription
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const subscription = { handler, once, priority };
    const handlers = this.events.get(eventName);
    handlers.push(subscription);
    handlers.sort((a, b) => b.priority - a.priority);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(subscription);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to an event that fires only once
   */
  once(eventName, handler, options = {}) {
    return this.on(eventName, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off(eventName, handler) {
    // Handle wildcard pattern removal
    if (eventName.includes('*')) {
      for (const sub of this.wildcardHandlers) {
        if (sub.pattern === eventName && sub.handler === handler) {
          this.wildcardHandlers.delete(sub);
          return;
        }
      }
      return;
    }

    if (!this.events.has(eventName)) return;

    const handlers = this.events.get(eventName);
    const index = handlers.findIndex(sub => sub.handler === handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    if (handlers.length === 0) {
      this.events.delete(eventName);
    }
  }

  /**
   * Remove all wildcard handlers matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'event:*')
   */
  offWildcard(pattern) {
    for (const sub of [...this.wildcardHandlers]) {
      if (sub.pattern === pattern) {
        this.wildcardHandlers.delete(sub);
      }
    }
  }

  /**
   * Remove all handlers (regular and wildcard) for a specific handler function
   * Useful for cleanup when a component is destroyed
   * @param {Function} handler - Handler function to remove
   */
  offAll(handler) {
    // Remove from regular events
    for (const [eventName, handlers] of this.events) {
      const index = handlers.findIndex(sub => sub.handler === handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.events.delete(eventName);
      }
    }

    // Remove from wildcard handlers
    for (const sub of [...this.wildcardHandlers]) {
      if (sub.handler === handler) {
        this.wildcardHandlers.delete(sub);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   * @returns {Promise} Resolves when all handlers complete
   */
  async emit(eventName, data) {
    const promises = [];

    // Handle direct subscriptions
    if (this.events.has(eventName)) {
      const handlers = [...this.events.get(eventName)];

      for (const subscription of handlers) {
        const { handler, once } = subscription;

        if (once) {
          this.off(eventName, handler);
        }

        try {
          const result = handler(data, eventName);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      }
    }

    // Handle wildcard subscriptions (copy Set to avoid mutation during iteration)
    const toRemove = [];
    for (const subscription of [...this.wildcardHandlers]) {
      if (this.matchesPattern(eventName, subscription.pattern)) {
        const { handler, once } = subscription;

        if (once) {
          toRemove.push(subscription);
        }

        try {
          const result = handler(data, eventName);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`Error in wildcard handler for ${eventName}:`, error);
        }
      }
    }
    // Remove one-time handlers after iteration
    toRemove.forEach(sub => this.wildcardHandlers.delete(sub));

    return Promise.all(promises);
  }

  /**
   * Check if event name matches a pattern
   */
  matchesPattern(eventName, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(eventName);
  }

  /**
   * Clear all event subscriptions
   */
  clear() {
    this.events.clear();
    this.wildcardHandlers.clear();
  }

  /**
   * Get all registered event names
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get handler count for an event
   */
  getHandlerCount(eventName) {
    return this.events.has(eventName) ? this.events.get(eventName).length : 0;
  }

  /**
   * Get wildcard handler count
   */
  getWildcardHandlerCount() {
    return this.wildcardHandlers.size;
  }

  /**
   * Get total handler count (for debugging/monitoring)
   */
  getTotalHandlerCount() {
    let count = this.wildcardHandlers.size;
    for (const handlers of this.events.values()) {
      count += handlers.length;
    }
    return count;
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Export both the class and singleton
export { EventBus, eventBus as default };
