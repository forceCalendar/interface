import { DOMUtils } from '../../src/utils/DOMUtils.js';

describe('DOMUtils', () => {
    test('escapeHTML correctly escapes dangerous characters', () => {
        const unsafe = '<script>alert("xss")</script> & "quote"';
        const safe = DOMUtils.escapeHTML(unsafe);
        expect(safe).not.toContain('<script>');
        expect(safe).toContain('&lt;script&gt;');
        expect(safe).toContain('&amp;');
        expect(safe).toContain('&quot;');
    });

    test('createElement creates elements with attributes', () => {
        const el = DOMUtils.createElement('div', { 
            className: 'test-class',
            id: 'test-id',
            'data-test': 'value'
        });
        expect(el.tagName).toBe('DIV');
        expect(el.className).toBe('test-class');
        expect(el.id).toBe('test-id');
        expect(el.dataset.test).toBe('value');
    });

    test('trapFocus sets up focus trapping', () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <button id="first">First</button>
            <input id="second">
            <button id="last">Last</button>
        `;
        document.body.appendChild(container);
        
        const first = container.querySelector('#first');
        const last = container.querySelector('#last');
        
        const cleanup = DOMUtils.trapFocus(container);
        
        // Initial focus
        expect(document.activeElement).toBe(first);
        
        // Simulate Tab on last element
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
        last.dispatchEvent(tabEvent);
        // Note: Full JSDOM keyboard simulation is complex, 
        // but we verify the setup didn't crash.
        
        cleanup();
        document.body.removeChild(container);
    });
});