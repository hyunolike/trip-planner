import { describe, expect, it, vi } from 'vitest';
import { createCompletionStore } from './completion';

describe('createCompletionStore', () => {
  it('toggles stops and checklist items and keeps them per trip', () => {
    const store = createCompletionStore('osaka-kyoto-family-2026', localStorage);
    store.toggleStop('d1-kix');
    store.toggleItem('passports');
    store.toggleStop('d1-gmp');
    store.toggleStop('d1-kix');

    expect(store.getSnapshot()).toEqual({ stops: ['d1-gmp'], items: ['passports'] });
    expect(JSON.parse(localStorage.getItem('tripnote:completion:v1:osaka-kyoto-family-2026') ?? '{}')).toEqual({
      stops: ['d1-gmp'],
      items: ['passports'],
    });
    expect(createCompletionStore('danang-hoian-family-2027', localStorage).getSnapshot()).toEqual({
      stops: [],
      items: [],
    });
  });

  it('returns the same snapshot object until something changes', () => {
    const store = createCompletionStore('a', localStorage);
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);
    store.toggleStop('x');
    expect(store.getSnapshot()).not.toBe(first);
  });

  it('notifies subscribers and survives broken or blocked storage', () => {
    localStorage.setItem('tripnote:completion:v1:broken', '{not json');
    const broken = createCompletionStore('broken', localStorage);
    expect(broken.getSnapshot()).toEqual({ stops: [], items: [] });

    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    const store = createCompletionStore('blocked', blocked);
    const listener = vi.fn();
    store.subscribe(listener);
    store.toggleStop('d1-kix');
    expect(store.getSnapshot().stops).toEqual(['d1-kix']);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
