import { beforeEach, describe, expect, it } from 'vitest';
import { createTripStore } from '../src/state.js';

describe('trip store', () => {
  let storage;

  beforeEach(() => {
    const values = new Map();
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };
  });

  it('persists completed stops and the selected day-four option', () => {
    const store = createTripStore(storage);
    store.toggleStop('d1-kix');
    store.selectDay4('slow-kyoto');

    const restored = createTripStore(storage).getState();
    expect(restored.completedStops).toContain('d1-kix');
    expect(restored.day4Option).toBe('slow-kyoto');
  });

  it('toggles a completed stop back off', () => {
    const store = createTripStore(storage);
    store.toggleStop('d1-kix');
    store.toggleStop('d1-kix');
    expect(store.getState().completedStops).not.toContain('d1-kix');
  });

  it('adds packing progress to an older saved trip without losing its choices', () => {
    storage.setItem('osaka-kyoto-family-trip-v1', JSON.stringify({ completedStops: ['d1-kix'], day4Option: 'fushimi-inari' }));
    const store = createTripStore(storage);
    expect(store.getState().completedPreparation).toEqual([]);
    store.togglePreparation('passports');
    const restored = createTripStore(storage);
    expect(restored.getState()).toEqual({ completedStops: ['d1-kix'], day4Option: 'fushimi-inari', completedPreparation: ['passports'] });
    restored.getState().completedPreparation.push('phone');
    expect(restored.getState().completedPreparation).toEqual(['passports']);
    restored.togglePreparation('passports');
    expect(createTripStore(storage).getState().completedPreparation).toEqual([]);
  });
});
