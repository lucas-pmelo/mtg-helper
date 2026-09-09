import { describe, expect, test } from 'vitest';
import { checkDraw, drawCommanders } from './drawCommanders';
import { makeDeck } from '../../tests/factories/make-deck';
import { makePerson } from '../../tests/factories/make-person';
import { seededRng, sequenceRng } from '../../tests/rng';

const ana = makePerson({ id: 'ana', name: 'Ana' });
const bob = makePerson({ id: 'bob', name: 'Bob' });
const carol = makePerson({ id: 'carol', name: 'Carol' });

const anaDecks = [
  makeDeck({ id: 'ana-1', personId: 'ana' }),
  makeDeck({ id: 'ana-2', personId: 'ana' }),
];
const bobDecks = [
  makeDeck({ id: 'bob-1', personId: 'bob' }),
  makeDeck({ id: 'bob-2', personId: 'bob' }),
];

describe('drawCommanders', () => {
  test('should give every present player exactly one deck when mode is own', () => {
    const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', seededRng(1));

    expect(result).toHaveLength(2);
    expect(result.map((assignment) => assignment.personId)).toEqual(['ana', 'bob']);
  });

  test('should only assign a deck owned by the player when mode is own', () => {
    const rng = seededRng(7);

    for (let round = 0; round < 200; round++) {
      const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', rng);

      for (const assignment of result) {
        const deck = [...anaDecks, ...bobDecks].find((candidate) => candidate.id === assignment.deckId);
        expect(deck?.personId).toBe(assignment.personId);
      }
    }
  });

  test('should let two players share the same deck when mode is own and decks are separate', () => {
    const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', sequenceRng([0]));

    expect(result).toEqual([
      { personId: 'ana', deckId: 'ana-1' },
      { personId: 'bob', deckId: 'bob-1' },
    ]);
  });

  test('should never repeat a deck when mode is pool', () => {
    const rng = seededRng(3);

    for (let round = 0; round < 200; round++) {
      const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'pool', rng);

      const deckIds = result.map((assignment) => assignment.deckId);
      expect(new Set(deckIds).size).toBe(deckIds.length);
    }
  });

  test('should give every present player exactly one deck when mode is pool', () => {
    const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'pool', seededRng(5));

    expect(result.map((assignment) => assignment.personId)).toEqual(['ana', 'bob']);
    expect(result).toHaveLength(2);
  });

  test('should assign a deck from another player when mode is pool', () => {
    const rng = seededRng(11);
    let sawForeignDeck = false;

    for (let round = 0; round < 200; round++) {
      const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'pool', rng);

      const allDecks = [...anaDecks, ...bobDecks];
      for (const assignment of result) {
        const deck = allDecks.find((candidate) => candidate.id === assignment.deckId);
        if (deck?.personId !== assignment.personId) sawForeignDeck = true;
      }
    }

    expect(sawForeignDeck).toBe(true);
  });

  test('should ignore archived decks', () => {
    const decks = [
      makeDeck({ id: 'ana-1', personId: 'ana', archived: true }),
      makeDeck({ id: 'ana-2', personId: 'ana' }),
      ...bobDecks,
    ];
    const rng = seededRng(13);

    for (let round = 0; round < 100; round++) {
      const result = drawCommanders([ana, bob], decks, 'pool', rng);

      expect(result.map((assignment) => assignment.deckId)).not.toContain('ana-1');
    }
  });

  test('should distribute own decks uniformly over many draws', () => {
    const rng = seededRng(42);
    const counts: Record<string, number> = { 'ana-1': 0, 'ana-2': 0 };
    const rounds = 4000;

    for (let round = 0; round < rounds; round++) {
      const [assignment] = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', rng);
      counts[assignment.deckId]++;
    }

    for (const count of Object.values(counts)) {
      expect(count / rounds).toBeGreaterThan(0.45);
      expect(count / rounds).toBeLessThan(0.55);
    }
  });

  test('should throw when fewer than two players are present', () => {
    expect(() => drawCommanders([ana], anaDecks, 'own', seededRng(1))).toThrow(
      'Selecione ao menos 2 jogadores',
    );
  });

  test('should throw naming the players without decks when mode is own', () => {
    expect(() => drawCommanders([ana, bob, carol], anaDecks, 'own', seededRng(1))).toThrow(
      'Cadastre ao menos um deck para: Bob, Carol',
    );
  });

  test('should throw explaining how many decks are missing when mode is pool', () => {
    expect(() => drawCommanders([ana, bob, carol], anaDecks, 'pool', seededRng(1))).toThrow(
      'O pool tem 2 decks para 3 jogadores: faltam 1',
    );
  });
});

describe('checkDraw', () => {
  test('should return null when the draw is valid', () => {
    expect(checkDraw([ana, bob], [...anaDecks, ...bobDecks], 'own')).toBeNull();
    expect(checkDraw([ana, bob], [...anaDecks, ...bobDecks], 'pool')).toBeNull();
  });

  test('should allow a pool draw when a player owns no deck', () => {
    expect(checkDraw([ana, bob], anaDecks, 'pool')).toBeNull();
  });
});
