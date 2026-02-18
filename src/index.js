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

// View Renderers (pure JS classes, Locker Service compatible)
export { BaseViewRenderer } from './renderers/BaseViewRenderer.js';
export { MonthViewRenderer } from './renderers/MonthViewRenderer.js';
export { WeekViewRenderer } from './renderers/WeekViewRenderer.js';
export { DayViewRenderer } from './renderers/DayViewRenderer.js';

// Components
import './components/ForceCalendar.js';
export { ForceCalendar } from './components/ForceCalendar.js';
