/**
 * Force Calendar Interface
 * Main entry point for the component library
 *
 * A solid foundation for calendar interfaces built on @forcecalendar/core
 */

// Core modules
export { BaseComponent } from './core/BaseComponent.js';
export { default as StateManager } from './core/StateManager.js';
export { default as eventBus, EventBus } from './core/EventBus.js';

// Utilities
export { DateUtils } from './utils/DateUtils.js';
export { DOMUtils } from './utils/DOMUtils.js';
export { StyleUtils } from './utils/StyleUtils.js';

// Components
import './components/ForceCalendar.js';
export { ForceCalendar } from './components/ForceCalendar.js';

// Views
export { MonthView } from './components/views/MonthView.js';
export { WeekView } from './components/views/WeekView.js';
export { DayView } from './components/views/DayView.js';

// Auto-register main component if in browser environment
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    // The ForceCalendar component self-registers
    console.log('Force Calendar Interface loading...');
}