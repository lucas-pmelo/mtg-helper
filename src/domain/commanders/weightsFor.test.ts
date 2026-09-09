import { describe, expect, test } from 'vitest';
import { pickWeighted, weightsFor } from './weightsFor';
import { makeDeck } from '../../tests/factories/make-deck';
import { makeMatch } from '../../tests/factories/make-match';
import type { Id, Match } from '../types';
import { seededRng } from '../../tests/rng';

/** `wins` victories out of `played` matches, all with the same deck. */
function history(deckId: Id, wins: number, played: number): Match[] {
  return Array.from({ length: played }, (_, index) =>
    makeMatch({
      id: `${deckId}-${index}`,
      participants: [
        { personId: 'ana', deckId },
        { personId: 'bob', deckId: 'bob-1' },
      ],
      winnerPersonId: index < wins ? 'ana' : 'bob',
    }),
  );
}

const deck = makeDeck({ id: 'ana-1', personId: 'ana' });

describe('weightsFor', () => {
  test('should weigh a deck with five wins in eight matches at 0.4', () => {
    expect(weightsFor([deck], history('ana-1', 5, 8)).get('ana-1')).toBeCloseTo(0.4, 10);
  });

  test('should weigh a deck with one win in eight matches at 0.8', () => {
    expect(weightsFor([deck], history('ana-1', 1, 8)).get('ana-1')).toBeCloseTo(0.8, 10);
  });

  test('should weigh a deck that never played at the neutral 0.5', () => {
    expect(weightsFor([deck], []).get('ana-1')).toBeCloseTo(0.5, 10);
  });

  test('should not zero a deck that won its single match', () => {
    expect(weightsFor([deck], history('ana-1', 1, 1)).get('ana-1')).toBeCloseTo(1 / 3, 10);
  });

  test('should keep every weight strictly between zero and one', () => {
    const flawless = weightsFor([deck], history('ana-1', 20, 20)).get('ana-1') as number;
    const hopeless = weightsFor([deck], history('ana-1', 0, 20)).get('ana-1') as number;

    expect(flawless).toBeGreaterThan(0);
    expect(hopeless).toBeLessThan(1);
  });

  test('should weigh every given deck', () => {
    const decks = [deck, makeDeck({ id: 'ana-2', personId: 'ana' })];

    expect([...weightsFor(decks, []).keys()]).toEqual(['ana-1', 'ana-2']);
  });

  test('should ignore matches the deck did not play', () => {
    expect(weightsFor([deck], history('ana-2', 4, 4)).get('ana-1')).toBeCloseTo(0.5, 10);
  });
});

describe('pickWeighted', () => {
  const strong = makeDeck({ id: 'strong', personId: 'ana' });
  const weak = makeDeck({ id: 'weak', personId: 'ana' });
  // strong: 8 wins in 8 -> 0.1 · weak: 0 wins in 8 -> 0.9
  const matches = [...history('strong', 8, 8), ...history('weak', 0, 8)];

  test('should pick the requested amount without repeating a deck', () => {
    const decks = [strong, weak, makeDeck({ id: 'third', personId: 'ana' })];
    const rng = seededRng(17);

    for (let round = 0; round < 200; round++) {
      const picked = pickWeighted(decks, matches, 2, rng);

      expect(picked).toHaveLength(2);
      expect(new Set(picked).size).toBe(2);
    }
  });

  test('should stop at the number of decks available when asked for more', () => {
    expect(pickWeighted([strong, weak], matches, 5, seededRng(3))).toHaveLength(2);
  });

  test('should return an empty list when there is nothing to pick from', () => {
    expect(pickWeighted([], matches, 3, seededRng(3))).toEqual([]);
  });

  test('should follow the handicap weights over many draws', () => {
    const rng = seededRng(99);
    const counts: Record<string, number> = { strong: 0, weak: 0 };
    const rounds = 20000;

    for (let round = 0; round < rounds; round++) {
      counts[pickWeighted([strong, weak], matches, 1, rng)[0]]++;
    }

    // Expected 0.1 / 0.9 — the 2:1 ceiling of the formula is nowhere near this
    // extreme, so a wrong weight cannot hide inside the margin.
    expect(counts.strong / rounds).toBeCloseTo(0.1, 2);
    expect(counts.weak / rounds).toBeCloseTo(0.9, 2);
  });

  test('should follow the handicap weights across three decks', () => {
    const middling = makeDeck({ id: 'middling', personId: 'ana' });
    // middling: 4 wins in 8 -> 0.5 · total 0.1 + 0.9 + 0.5 = 1.5
    const withMiddling = [...matches, ...history('middling', 4, 8)];
    const expected: Record<string, number> = {
      strong: 0.1 / 1.5,
      weak: 0.9 / 1.5,
      middling: 0.5 / 1.5,
    };
    const rng = seededRng(2024);
    const counts: Record<string, number> = { strong: 0, weak: 0, middling: 0 };
    const rounds = 20000;

    for (let round = 0; round < rounds; round++) {
      counts[pickWeighted([strong, weak, middling], withMiddling, 1, rng)[0]]++;
    }

    for (const [id, share] of Object.entries(expected)) {
      expect(counts[id] / rounds).toBeGreaterThan(share - 0.015);
      expect(counts[id] / rounds).toBeLessThan(share + 0.015);
    }
  });

  test('should draw uniformly when every deck has the same record', () => {
    const decks = ['a', 'b', 'c'].map((id) => makeDeck({ id, personId: 'ana' }));
    const rng = seededRng(5);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const rounds = 12000;

    for (let round = 0; round < rounds; round++) {
      counts[pickWeighted(decks, [], 1, rng)[0]]++;
    }

    for (const count of Object.values(counts)) {
      expect(count / rounds).toBeGreaterThan(0.32);
      expect(count / rounds).toBeLessThan(0.35);
    }
  });
});
