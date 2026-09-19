import { describe, expect, test } from 'vitest';
import {
  MAX_CANDIDATE_SETS,
  checkTotalLookup,
  codesWithSize,
  setsAreStale,
  type SetSize,
} from './setSizes';

const sets: SetSize[] = [
  { code: 'uds', cardCount: 143, releasedAt: '1999-06-07' },
  { code: 'exo', cardCount: 143, releasedAt: '1998-06-15' },
  { code: 'scg', cardCount: 143, releasedAt: '2003-05-26' },
  { code: 'mh3', cardCount: 261, releasedAt: '2024-06-14' },
];

describe('codesWithSize', () => {
  test('should give every set printed with that many cards, newest first', () => {
    expect(codesWithSize(sets, 143)).toEqual(['scg', 'uds', 'exo']);
  });

  test('should give nothing when no set has that size', () => {
    expect(codesWithSize(sets, 7)).toEqual([]);
  });

  test('should cap the list so the search query stays sane', () => {
    const many = Array.from({ length: MAX_CANDIDATE_SETS + 10 }, (_, index) => ({
      code: `s${index}`,
      cardCount: 5,
      releasedAt: `20${String(index).padStart(2, '0')}-01-01`,
    }));

    expect(codesWithSize(many, 5)).toHaveLength(MAX_CANDIDATE_SETS);
  });
});

describe('checkTotalLookup', () => {
  test('should accept the two numbers of an old card footer', () => {
    expect(checkTotalLookup('95', '143')).toBeNull();
  });

  test('should ask for the card number when it is missing', () => {
    expect(checkTotalLookup('', '143')).toBe('Digite o número da carta');
  });

  test('should ask for the total when it is missing', () => {
    expect(checkTotalLookup('95', '')).toBe('Digite o total de cartas do set');
  });

  test('should reject a total that is not a number', () => {
    expect(checkTotalLookup('95', '14a')).toBe('O total do set é só números');
  });

  test('should reject a card number past the total', () => {
    expect(checkTotalLookup('200', '143')).toBe('O número da carta não pode passar do total');
  });
});

describe('setsAreStale', () => {
  test('should be stale when no set list was ever fetched', () => {
    expect(setsAreStale(null, '2026-09-19T12:00:00.000Z')).toBe(true);
  });

  test('should be fresh right after the fetch', () => {
    expect(setsAreStale('2026-09-19T11:00:00.000Z', '2026-09-19T12:00:00.000Z')).toBe(false);
  });

  test('should be stale a month later, when new sets exist', () => {
    expect(setsAreStale('2026-08-01T12:00:00.000Z', '2026-09-19T12:00:00.000Z')).toBe(true);
  });
});
