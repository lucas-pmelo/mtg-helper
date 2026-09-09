// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from 'vitest';
import { STORAGE_KEYS } from '../data/storage';
import { MAX_RECENT } from '../domain/cards/cardCache';
import type { CardLookup } from '../domain/types';
import { makeCardLookup } from '../tests/factories/make-card-lookup';
import { useCardStore } from './cardStore';

/** Every test here identifies a card by its key; the rest comes from the factory. */
function makeLookup(key: string): CardLookup {
  const [set, collectorNumber] = key.split('/');

  return makeCardLookup({ key, set, collectorNumber });
}

describe('useCardStore', () => {
  beforeEach(() => {
    useCardStore.setState({ recent: [] });
  });

  test('should keep the consulted card on top of the recent list', () => {
    useCardStore.getState().remember(makeLookup('mh3/125'));
    useCardStore.getState().remember(makeLookup('neo/33'));

    expect(useCardStore.getState().recent.map((card) => card.key)).toEqual([
      'neo/33',
      'mh3/125',
    ]);
  });

  test('should promote a card consulted again instead of listing it twice', () => {
    useCardStore.getState().remember(makeLookup('mh3/125'));
    useCardStore.getState().remember(makeLookup('neo/33'));
    useCardStore.getState().remember(makeLookup('mh3/125'));

    expect(useCardStore.getState().recent.map((card) => card.key)).toEqual([
      'mh3/125',
      'neo/33',
    ]);
  });

  test('should cap the recent list so it stays scrollable with a thumb', () => {
    for (let index = 0; index <= MAX_RECENT; index += 1) {
      useCardStore.getState().remember(makeLookup(`mh3/${index}`));
    }

    expect(useCardStore.getState().recent).toHaveLength(MAX_RECENT);
  });

  test('should empty the list when the player clears the cache', () => {
    useCardStore.getState().remember(makeLookup('mh3/125'));

    useCardStore.getState().clear();

    expect(useCardStore.getState().recent).toEqual([]);
  });

  test('should persist the cache so the cards still open without network', () => {
    useCardStore.getState().remember(makeLookup('mh3/125'));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.cards) ?? '{}');

    expect(stored.state.recent[0].printedName).toBe('Capturador Infernal');
  });
});
