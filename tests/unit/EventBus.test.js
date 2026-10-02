import { EventBus } from '../../src/core/EventBus.js';

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('matchesPattern', () => {
    test('matches exact event names', () => {
      expect(bus.matchesPattern('event.add', 'event.add')).toBe(true);
    });

    test('treats dots as literals, not regex wildcards', () => {
      expect(bus.matchesPattern('event_add', 'event.add')).toBe(false);
      expect(bus.matchesPattern('eventXadd', 'event.add')).toBe(false);
    });

    test('supports * as a wildcard', () => {
      expect(bus.matchesPattern('event.add', 'event.*')).toBe(true);
      expect(bus.matchesPattern('event.remove', 'event.*')).toBe(true);
      expect(bus.matchesPattern('view.change', 'event.*')).toBe(false);
    });

    test('supports * in the middle of a pattern', () => {
      expect(bus.matchesPattern('event.user.add', 'event.*.add')).toBe(true);
      expect(bus.matchesPattern('event.user.remove', 'event.*.add')).toBe(false);
    });

    test('escapes regex metacharacters in patterns', () => {
      expect(bus.matchesPattern('a+b', 'a+b')).toBe(true);
      expect(bus.matchesPattern('aab', 'a+b')).toBe(false);
      expect(bus.matchesPattern('event(1)', 'event(1)')).toBe(true);
      expect(bus.matchesPattern('event1', 'event(1)')).toBe(false);
      expect(bus.matchesPattern('a|b', 'a|b')).toBe(true);
      expect(bus.matchesPattern('a', 'a|b')).toBe(false);
      expect(bus.matchesPattern('item[0]', 'item[0]')).toBe(true);
      expect(bus.matchesPattern('item0', 'item[0]')).toBe(false);
      expect(bus.matchesPattern('cost$', 'cost$')).toBe(true);
      expect(bus.matchesPattern('x?y', 'x?y')).toBe(true);
      expect(bus.matchesPattern('xy', 'x?y')).toBe(false);
    });

    test('wildcard subscriptions only fire for literal matches', () => {
      const handler = jest.fn();
      bus.on('event.*', handler);

      bus.emit('event.add', { id: 1 });
      bus.emit('eventXadd', { id: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ id: 1 }, 'event.add');
    });
  });
});

describe('compiled wildcard subscriptions', () => {
  test('compiles once per subscription rather than per emitted event', () => {
    const bus = new EventBus();
    const compile = jest.spyOn(bus, 'compilePattern');
    const handler = jest.fn();
    const unsubscribe = bus.on('event.*', handler);
    expect(compile).toHaveBeenCalledTimes(1);
    bus.emit('event.add');
    bus.emit('event.remove');
    bus.emit('unrelated');
    expect(compile).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(2);
    unsubscribe();
    bus.emit('event.add');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(bus.getWildcardHandlerCount()).toBe(0);
  });
  test.each(['off', 'offWildcard', 'offAll', 'clear'])(
    '%s removes compiled subscriptions',
    method => {
      const bus = new EventBus();
      const handler = jest.fn();
      bus.on('event.*', handler);
      if (method === 'off') bus.off('event.*', handler);
      if (method === 'offWildcard') bus.offWildcard('event.*');
      if (method === 'offAll') bus.offAll(handler);
      if (method === 'clear') bus.clear();
      bus.emit('event.add');
      expect(handler).not.toHaveBeenCalled();
      expect(bus.getWildcardHandlerCount()).toBe(0);
    }
  );
  test('once subscriptions retain their existing one-shot behavior', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.once('event.*', handler);
    bus.emit('event.add');
    bus.emit('event.add');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.getWildcardHandlerCount()).toBe(0);
  });
});
