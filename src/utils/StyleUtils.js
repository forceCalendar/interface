/**
 * StyleUtils - Styling utilities and theme management
 */

export class StyleUtils {
    /**
     * Default theme colors
     */
    static colors = {
        primary: '#3B82F6', // Modern Blue
        secondary: '#64748B', // Slate
        accent: '#F59E0B', // Amber
        danger: '#EF4444', // Red
        warning: '#F97316', // Orange
        info: '#06B6D4', // Cyan
        success: '#22C55E', // Green
        light: '#F8FAFC',
        dark: '#0F172A',
        white: '#FFFFFF',
        gray: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A'
        }
    };

    /**
     * Common CSS variables
     */
    static cssVariables = {
        // "Pro" Palette - Functional & Sharp
        '--fc-primary-color': '#2563EB', // International Blue (Focus)
        '--fc-primary-hover': '#1D4ED8',
        '--fc-primary-light': '#EFF6FF',
        
        // Neutral Scale (Slate/Gray for structure)
        '--fc-text-color': '#111827', // Almost Black
        '--fc-text-secondary': '#6B7280', // Cool Gray
        '--fc-text-light': '#9CA3AF',
        
        '--fc-border-color': '#E5E7EB', // Crisp Light Gray
        '--fc-border-color-hover': '#D1D5DB',
        
        '--fc-background': '#FFFFFF',
        '--fc-background-alt': '#FAFAFA', // Very subtle off-white
        '--fc-background-hover': '#F3F4F6',
        '--fc-background-active': '#E5E7EB',

        // Semantic Colors
        '--fc-accent-color': '#F59E0B',
        '--fc-danger-color': '#EF4444',
        '--fc-success-color': '#10B981',

        // Typography - optimized for UI density
        '--fc-font-family': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        '--fc-font-size-xs': '11px',
        '--fc-font-size-sm': '12px',
        '--fc-font-size-base': '13px', // Slightly smaller for density
        '--fc-font-size-lg': '15px',
        '--fc-font-size-xl': '18px',
        '--fc-font-size-2xl': '24px',
        '--fc-line-height': '1.4',
        '--fc-font-weight-normal': '400',
        '--fc-font-weight-medium': '500',
        '--fc-font-weight-semibold': '600',
        '--fc-font-weight-bold': '700',

        // Spacing - Tighter
        '--fc-spacing-xs': '2px',
        '--fc-spacing-sm': '6px',
        '--fc-spacing-md': '10px',
        '--fc-spacing-lg': '14px',
        '--fc-spacing-xl': '20px',
        '--fc-spacing-2xl': '28px',

        // Border
        '--fc-border-width': '1px',
        '--fc-border-radius-sm': '3px', // Micro rounding
        '--fc-border-radius': '5px',
        '--fc-border-radius-lg': '8px',
        '--fc-border-radius-full': '9999px',

        // Shadows - Minimal/Functional
        '--fc-shadow-sm': '0 1px 1px rgba(0,0,0,0.05)',
        '--fc-shadow': '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        '--fc-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        '--fc-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',

        // Transitions - Snappy
        '--fc-transition-fast': '100ms ease-out',
        '--fc-transition': '150ms ease-out',
        '--fc-transition-slow': '250ms ease-out',

        // Z-index
        '--fc-z-dropdown': '1000',
        '--fc-z-modal': '2000',
        '--fc-z-tooltip': '3000'
    };

    /**
     * Get CSS variable value
     */
    static getCSSVariable(name, element = document.documentElement) {
        return getComputedStyle(element).getPropertyValue(name).trim();
    }

    /**
     * Set CSS variables
     */
    static setCSSVariables(variables, element = document.documentElement) {
        Object.entries(variables).forEach(([key, value]) => {
            element.style.setProperty(key, value);
        });
    }

    /**
     * Generate base styles
     */
    static getBaseStyles() {
        return `
            :host {
                /* Apply CSS variables */
                ${Object.entries(this.cssVariables)
                    .map(([key, value]) => `${key}: ${value};`)
                    .join('\n                ')}

                /* Base styles */
                display: block;
                box-sizing: border-box;
                font-family: var(--fc-font-family);
                font-size: var(--fc-font-size-base);
                line-height: var(--fc-line-height);
                color: var(--fc-text-color);
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            *, *::before, *::after {
                box-sizing: inherit;
            }

            /* Reset styles */
            h1, h2, h3, h4, h5, h6, p {
                margin: 0;
                font-weight: normal;
            }

            button {
                font-family: inherit;
                font-size: inherit;
                line-height: inherit;
                margin: 0;
            }

            /* Accessibility */
            .visually-hidden {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }

            /* Focus styles */
            :focus-visible {
                outline: 2px solid var(--fc-primary-color);
                outline-offset: 2px;
            }
        `;
    }

    /**
     * Generate button styles
     */
    static getButtonStyles() {
        return `
            .fc-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 8px 16px;
                font-size: var(--fc-font-size-sm);
                font-weight: var(--fc-font-weight-medium);
                line-height: 1.25rem;
                border-radius: var(--fc-border-radius);
                border: 1px solid transparent;
                cursor: pointer;
                transition: all var(--fc-transition-fast);
                outline: none;
                user-select: none;
                gap: var(--fc-spacing-sm);
                white-space: nowrap;
            }

            .fc-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .fc-btn-primary {
                background: var(--fc-primary-color);
                color: white;
                box-shadow: var(--fc-shadow-sm);
            }

            .fc-btn-primary:hover:not(:disabled) {
                background: var(--fc-primary-hover);
                box-shadow: var(--fc-shadow);
            }

            .fc-btn-secondary {
                background: white;
                border-color: var(--fc-border-color);
                color: var(--fc-text-color);
                box-shadow: var(--fc-shadow-sm);
            }

            .fc-btn-secondary:hover:not(:disabled) {
                background: var(--fc-background-hover);
                border-color: var(--fc-border-color-hover);
            }

            .fc-btn-outline {
                background: transparent;
                border-color: var(--fc-border-color);
                color: var(--fc-text-secondary);
            }

            .fc-btn-outline:hover:not(:disabled) {
                background: var(--fc-background-hover);
                color: var(--fc-text-color);
                border-color: var(--fc-border-color-hover);
            }

            .fc-btn-ghost {
                background: transparent;
                color: var(--fc-text-secondary);
            }

            .fc-btn-ghost:hover:not(:disabled) {
                background: var(--fc-background-hover);
                color: var(--fc-text-color);
            }

            .fc-btn-sm {
                padding: 6px 12px;
                font-size: var(--fc-font-size-xs);
            }

            .fc-btn-lg {
                padding: 10px 20px;
                font-size: var(--fc-font-size-base);
            }

            .fc-btn-icon {
                width: 32px;
                height: 32px;
                padding: 0;
                border-radius: var(--fc-border-radius-full);
            }
        `;
    }

    /**
     * Darken color by percentage
     */
    static darken(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Lighten color by percentage
     */
    static lighten(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Get contrast color (black or white) for background
     */
    static getContrastColor(bgColor) {
        const color = bgColor.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128 ? '#000000' : '#FFFFFF';
    }

    /**
     * Sanitize color value to prevent CSS injection
     * Returns the color if valid, or a fallback color if invalid
     */
    static sanitizeColor(color, fallback = 'var(--fc-primary-color)') {
        if (!color || typeof color !== 'string') {
            return fallback;
        }

        // Trim and check for dangerous characters that could break out of CSS
        const trimmed = color.trim();
        if (/[;{}()<>\"\'\\]/.test(trimmed)) {
            return fallback;
        }

        // Allow hex colors (#RGB, #RRGGBB, #RRGGBBAA)
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
            return trimmed;
        }

        // Allow CSS variables
        if (/^var\(--[a-zA-Z0-9-]+\)$/.test(trimmed)) {
            return trimmed;
        }

        // Allow rgb/rgba with numbers only
        if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*(0|1|0?\.\d+))?\s*\)$/.test(trimmed)) {
            return trimmed;
        }

        // Allow safe CSS color keywords
        const safeKeywords = [
            'transparent', 'currentColor', 'inherit',
            'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
            'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
            'teal', 'aqua', 'maroon', 'olive', 'silver', 'fuchsia'
        ];
        if (safeKeywords.includes(trimmed.toLowerCase())) {
            return trimmed;
        }

        return fallback;
    }

    /**
     * Convert hex to rgba
     */
    static hexToRgba(hex, alpha = 1) {
        const color = hex.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Generate grid styles
     */
    static getGridStyles() {
        return `
            .fc-grid {
                display: grid;
                gap: 1px;
                background: var(--fc-border-color);
                border: 1px solid var(--fc-border-color);
                border-radius: var(--fc-border-radius);
                overflow: hidden;
            }

            .fc-grid-cell {
                background: var(--fc-background);
                padding: var(--fc-spacing-sm);
                min-height: 100px;
                position: relative;
            }

            .fc-grid-cell:hover {
                background: var(--fc-background-hover);
            }

            .fc-grid-header {
                background: var(--fc-background-alt);
                padding: var(--fc-spacing-sm);
                font-weight: var(--fc-font-weight-semibold);
                text-align: center;
                color: var(--fc-text-secondary);
                font-size: var(--fc-font-size-xs);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
        `;
    }

    /**
     * Get responsive breakpoints
     */
    static breakpoints = {
        xs: '320px',
        sm: '576px',
        md: '768px',
        lg: '992px',
        xl: '1200px',
        '2xl': '1400px'
    };

    /**
     * Generate media query
     */
    static mediaQuery(breakpoint, styles) {
        const size = this.breakpoints[breakpoint];
        if (!size) return '';
        return `@media (min-width: ${size}) { ${styles} }`;
    }

    /**
     * Animation keyframes
     */
    static getAnimations() {
        return `
            @keyframes fc-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes fc-slide-in-up {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fc-slide-in-down {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fc-scale-in {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes fc-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .fc-fade-in {
                animation: fc-fade-in var(--fc-transition);
            }

            .fc-slide-in-up {
                animation: fc-slide-in-up var(--fc-transition);
            }

            .fc-scale-in {
                animation: fc-scale-in var(--fc-transition);
            }
        `;
    }
}

export default StyleUtils;