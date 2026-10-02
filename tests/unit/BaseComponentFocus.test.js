import { BaseComponent } from '../../src/core/BaseComponent.js';

class FocusFixture extends BaseComponent {
  template() {
    return '<section><button id="target">Target</button></section>';
  }
}
customElements.define('fc-focus-fixture', FocusFixture);

describe('BaseComponent focus restoration', () => {
  let component;
  let target;
  let focus;
  beforeEach(() => {
    component = document.createElement('fc-focus-fixture');
    document.body.appendChild(component);
    target = component.shadowRoot.querySelector('#target');
    focus = jest.spyOn(target, 'focus');
  });
  afterEach(() => {
    component.remove();
  });

  test('restores a visible fixed-position target', () => {
    target.style.position = 'fixed';
    component._restoreFocus('#target');
    expect(focus).toHaveBeenCalledTimes(1);
    expect(component.shadowRoot.activeElement).toBe(target);
  });
  test.each(['display: none', 'visibility: hidden', 'visibility: collapse'])(
    'does not focus a target styled %s',
    style => {
      target.style.cssText = style;
      component._restoreFocus('#target');
      expect(focus).not.toHaveBeenCalled();
    }
  );
  test.each(['hidden', 'inert', 'aria-hidden', 'display'])('honors ancestor %s', kind => {
    const parent = target.parentElement;
    if (kind === 'display') parent.style.display = 'none';
    else parent.setAttribute(kind, kind === 'aria-hidden' ? 'true' : '');
    component._restoreFocus('#target');
    expect(focus).not.toHaveBeenCalled();
  });
  test('honors hidden shadow hosts', () => {
    component.style.display = 'none';
    component._restoreFocus('#target');
    expect(focus).not.toHaveBeenCalled();
  });
  test('does not focus disabled or removed targets', () => {
    target.disabled = true;
    component._restoreFocus('#target');
    target.disabled = false;
    target.remove();
    component._restoreFocus('#target');
    expect(focus).not.toHaveBeenCalled();
  });
  test('ignores invalid selectors', () => {
    expect(() => component._restoreFocus('[')).not.toThrow();
    expect(focus).not.toHaveBeenCalled();
  });
});
