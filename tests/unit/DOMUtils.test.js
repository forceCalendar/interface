import { DOMUtils } from '../../src/utils/DOMUtils.js';

describe('DOMUtils', () => {
    test('escapeHTML correctly escapes dangerous characters', () => {
        const unsafe = '<script>alert("xss")</script> &';
        const safe = DOMUtils.escapeHTML(unsafe);
        expect(safe).not.toContain('<script>');
        expect(safe).toContain('&lt;script&gt;');
        expect(safe).toContain('&amp;');
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

    test('trapFocus wraps focus using the shadow root activeElement', () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });
        const container = document.createElement('div');
        container.innerHTML = `
            <button id="first">First</button>
            <button id="last">Last</button>
        `;
        shadow.appendChild(container);

        const first = container.querySelector('#first');
        const last = container.querySelector('#last');

        const cleanup = DOMUtils.trapFocus(container);
        expect(shadow.activeElement).toBe(first);

        // Tab from the last element must wrap to the first — this relies on
        // reading shadowRoot.activeElement, not document.activeElement
        last.focus();
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        container.dispatchEvent(tabEvent);
        expect(shadow.activeElement).toBe(first);
        expect(tabEvent.defaultPrevented).toBe(true);

        cleanup();
        document.body.removeChild(host);
    });

    test('waitForAnimation resolves when the animation event fires', async () => {
        const el = document.createElement('div');
        const promise = DOMUtils.waitForAnimation(el);
        el.dispatchEvent(new Event('animationend'));
        await expect(promise).resolves.toBeUndefined();
    });

    test('waitForAnimation resolves via timeout when no event fires', async () => {
        jest.useFakeTimers();
        try {
            const el = document.createElement('div');
            const promise = DOMUtils.waitForAnimation(el, 'animationend', 100);
            jest.advanceTimersByTime(150);
            await expect(promise).resolves.toBeUndefined();
        } finally {
            jest.useRealTimers();
        }
    });

    test('parseHTML strips script elements and event handler attributes', () => {
        const node = DOMUtils.parseHTML(
            '<div onclick="alert(1)"><script>alert(2)</script><img src="x" onerror="alert(3)"><a href="javascript:alert(4)">x</a></div>'
        );
        expect(node.hasAttribute('onclick')).toBe(false);
        expect(node.querySelector('script')).toBeNull();
        expect(node.querySelector('img').hasAttribute('onerror')).toBe(false);
        expect(node.querySelector('a').hasAttribute('href')).toBe(false);
    });

    test('parseHTML keeps safe markup intact', () => {
        const node = DOMUtils.parseHTML('<div class="a"><a href="https://example.com">link</a><b>text</b></div>');
        expect(node.className).toBe('a');
        expect(node.querySelector('a').getAttribute('href')).toBe('https://example.com');
        expect(node.querySelector('b').textContent).toBe('text');
    });
});