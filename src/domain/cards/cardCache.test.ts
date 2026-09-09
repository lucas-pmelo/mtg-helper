import { describe, expect, test } from 'vitest';
import { MAX_RECENT, cardKey, checkLookup, findCard, rememberCard } from './cardCache';
import type { CardLookup } from '../types';
import { makeCardLookup } from '../../tests/factories/make-card-lookup';

/** Every test here identifies a card by its key; the rest comes from the factory. */
function makeLookup(key: string): CardLookup {
  const [set, collectorNumber] = key.split('/');

  return makeCardLookup({ key, set, collectorNumber });
}

describe('cardKey', () => {
  test('should join set and number in lowercase', () => {
    expect(cardKey('MH3', '125')).toBe('mh3/125');
  });

  test('should trim what the phone keyboard added around the code', () => {
    expect(cardKey('  neo ', ' 33 ')).toBe('neo/33');
  });

  test('should keep the leading zero because Scryfall decides what it means', () => {
    expect(cardKey('lci', '005')).toBe('lci/005');
  });
});

describe('checkLookup', () => {
  test('should accept a valid code', () => {
    expect(checkLookup('MH3', '125')).toBeNull();
  });

  test('should accept a collector number with a letter', () => {
    expect(checkLookup('sld', '125a')).toBeNull();
  });

  test('should ask for the set when it is empty', () => {
    expect(checkLookup('  ', '125')).toBe('Digite o código do set');
  });

  test('should reject a set with characters no set code has', () => {
    expect(checkLookup('mh-3', '125')).toBe('O código do set usa só letras e números');
  });

  test('should ask for the collector number when it is empty', () => {
    expect(checkLookup('mh3', ' ')).toBe('Digite o número da carta');
  });
});

describe('rememberCard', () => {
  test('should put the card on top of an empty list', () => {
    const card = makeLookup('mh3/125');

    expect(rememberCard([], card)).toEqual([card]);
  });

  test('should promote a card that was already consulted instead of duplicating it', () => {
    const older = makeLookup('mh3/125');
    const other = makeLookup('neo/33');
    const again = { ...older, fetchedAt: '2026-09-09T13:00:00.000Z' };

    expect(rememberCard([older, other], again)).toEqual([again, other]);
  });

  test('should drop the oldest card once the list is full', () => {
    const full = Array.from({ length: MAX_RECENT }, (_, index) => makeLookup(`mh3/${index}`));

    const recent = rememberCard(full, makeLookup('neo/33'));

    expect(recent).toHaveLength(MAX_RECENT);
    expect(recent[0].key).toBe('neo/33');
    expect(findCard(recent, `mh3/${MAX_RECENT - 1}`)).toBeUndefined();
  });
});

describe('findCard', () => {
  test('should return the cached card so tapping a recent one fetches nothing', () => {
    const card = makeLookup('mh3/125');

    expect(findCard([card], 'mh3/125')).toBe(card);
  });

  test('should return undefined for a card that was never consulted', () => {
    expect(findCard([makeLookup('mh3/125')], 'neo/33')).toBeUndefined();
  });
});
