import { describe, expect, test } from 'vitest';
import { checkDraw, drawCommanders } from './drawCommanders';
import { makeCardRef, makeDeck } from '../../tests/factories/make-deck';
import { makeMatch } from '../../tests/factories/make-match';
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
      counts[assignment.deckId!]++;
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

  test('should assign a null deck to a player who owns none when mode is own', () => {
    const result = drawCommanders([ana, bob], anaDecks, 'own', seededRng(1));

    expect(result).toEqual([
      { personId: 'ana', deckId: expect.stringMatching(/^ana-/) },
      { personId: 'bob', deckId: null },
    ]);
  });

  test('should let the draw happen with every player deckless when mode is own', () => {
    const result = drawCommanders([bob, carol], anaDecks, 'own', seededRng(1));

    expect(result).toEqual([
      { personId: 'bob', deckId: null },
      { personId: 'carol', deckId: null },
    ]);
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

  test('should allow an own draw when a player owns no deck', () => {
    expect(checkDraw([ana, bob, carol], anaDecks, 'own')).toBeNull();
  });
});

describe('drawCommanders with options', () => {
  const lastSession = makeMatch({
    id: 'last-session',
    playedOn: '2026-09-07',
    participants: [
      { personId: 'ana', deckId: 'ana-1' },
      { personId: 'bob', deckId: 'bob-1' },
    ],
  });
  const today = '2026-09-09';

  test('should behave exactly like a bare draw when given an empty options object', () => {
    const bare = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'pool', seededRng(23));
    const withOptions = drawCommanders(
      [ana, bob],
      [...anaDecks, ...bobDecks],
      'pool',
      seededRng(23),
      {},
    );

    expect(withOptions).toEqual(bare);
  });

  test('should avoid the deck used in the last session when mode is own', () => {
    const rng = seededRng(31);

    for (let round = 0; round < 200; round++) {
      const [assignment] = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', rng, {
        matches: [lastSession],
        today,
        avoidRepeat: true,
      });

      expect(assignment).toEqual({ personId: 'ana', deckId: 'ana-2' });
    }
  });

  test('should ignore matches of the current session when avoiding repeats', () => {
    const tonight = makeMatch({
      id: 'tonight',
      playedOn: today,
      participants: [{ personId: 'ana', deckId: 'ana-2' }],
    });
    const [assignment] = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', seededRng(4), {
      matches: [lastSession, tonight],
      today,
      avoidRepeat: true,
    });

    expect(assignment.deckId).toBe('ana-2');
  });

  test('should give the repeated deck back and mark it when there is no alternative', () => {
    const soleDeck = [makeDeck({ id: 'ana-1', personId: 'ana' }), ...bobDecks];
    const [assignment] = drawCommanders([ana, bob], soleDeck, 'own', seededRng(2), {
      matches: [lastSession],
      today,
      avoidRepeat: true,
    });

    expect(assignment).toEqual({ personId: 'ana', deckId: 'ana-1', repeated: true });
  });

  test('should not mark an assignment as repeated when the filter had an alternative', () => {
    const [assignment] = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', seededRng(2), {
      matches: [lastSession],
      today,
      avoidRepeat: true,
    });

    expect(assignment.repeated).toBeUndefined();
  });

  test('should favour the losing deck when the handicap is on and mode is own', () => {
    // ana-1 won every match, ana-2 lost every one: weights 0.1 and 0.9.
    const matches = Array.from({ length: 8 }, (_, index) => [
      makeMatch({
        id: `won-${index}`,
        participants: [
          { personId: 'ana', deckId: 'ana-1' },
          { personId: 'bob', deckId: 'bob-1' },
        ],
        winnerPersonId: 'ana',
      }),
      makeMatch({
        id: `lost-${index}`,
        participants: [
          { personId: 'ana', deckId: 'ana-2' },
          { personId: 'bob', deckId: 'bob-1' },
        ],
        winnerPersonId: 'bob',
      }),
    ]).flat();
    const rng = seededRng(77);
    const counts: Record<string, number> = { 'ana-1': 0, 'ana-2': 0 };
    const rounds = 8000;

    for (let round = 0; round < rounds; round++) {
      const [assignment] = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', rng, {
        matches,
        handicap: true,
      });
      counts[assignment.deckId!]++;
    }

    expect(counts['ana-1'] / rounds).toBeCloseTo(0.1, 1);
    expect(counts['ana-2'] / rounds).toBeCloseTo(0.9, 1);
  });

  test('should still hand out one deck per player when the handicap is on and mode is pool', () => {
    const rng = seededRng(19);

    for (let round = 0; round < 100; round++) {
      const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'pool', rng, {
        matches: [lastSession],
        handicap: true,
      });

      const deckIds = result.map((assignment) => assignment.deckId);
      expect(deckIds).toHaveLength(2);
      expect(new Set(deckIds).size).toBe(2);
    }
  });

  test('should not change an exact pool when the handicap is on', () => {
    const exactPool = [anaDecks[0], bobDecks[0]];
    const handicapped = drawCommanders([ana, bob], exactPool, 'pool', seededRng(8), {
      matches: [lastSession],
      handicap: true,
    });
    const bare = drawCommanders([ana, bob], exactPool, 'pool', seededRng(8));

    expect(handicapped).toEqual(bare);
  });

  test('should favour the losing decks when picking which enter a larger pool', () => {
    // ana-1 and bob-1 won everything (0.1 each); ana-2 and bob-2 never played (0.5 each).
    // Each deck beats an outsider, so both can be flawless at the same time.
    const matches = Array.from({ length: 8 }, (_, index) => [
      makeMatch({
        id: `ana-won-${index}`,
        participants: [
          { personId: 'ana', deckId: 'ana-1' },
          { personId: 'carol', deckId: 'carol-1' },
        ],
        winnerPersonId: 'ana',
      }),
      makeMatch({
        id: `bob-won-${index}`,
        participants: [
          { personId: 'bob', deckId: 'bob-1' },
          { personId: 'carol', deckId: 'carol-1' },
        ],
        winnerPersonId: 'bob',
      }),
    ]).flat();
    const rng = seededRng(1234);
    const counts: Record<string, number> = { 'ana-1': 0, 'ana-2': 0, 'bob-1': 0, 'bob-2': 0 };
    const rounds = 6000;

    for (let round = 0; round < rounds; round++) {
      const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'pool', rng, {
        matches,
        handicap: true,
      });
      for (const assignment of result) counts[assignment.deckId!]++;
    }

    expect(counts['ana-2']).toBeGreaterThan(counts['ana-1'] * 1.5);
    expect(counts['bob-2']).toBeGreaterThan(counts['bob-1'] * 1.5);
  });

  test('should still assign a null deck to a player who owns none when options are on', () => {
    const result = drawCommanders([ana, bob], anaDecks, 'own', seededRng(1), {
      matches: [lastSession],
      today,
      avoidRepeat: true,
      handicap: true,
    });

    expect(result[1]).toEqual({ personId: 'bob', deckId: null });
  });

  test('should avoid the deck each player used last session when mode is pool', () => {
    const rng = seededRng(21);

    for (let round = 0; round < 200; round++) {
      const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'pool', rng, {
        matches: [lastSession],
        today,
        avoidRepeat: true,
      });

      // ana-1 and bob-1 were played last session, so neither owner takes theirs
      // back while a fresh deck is still on the table.
      expect(result.find((one) => one.personId === 'ana')?.deckId).not.toBe('ana-1');
      expect(result.find((one) => one.personId === 'bob')?.deckId).not.toBe('bob-1');
    }
  });

  test('should give a repeated deck back in pool when nothing fresh is left', () => {
    // Two matches in the same session, and the two of them swapped decks: both
    // decks are a repeat for both players, so the pool has nothing fresh left.
    const lastSessionMatches = [
      makeMatch({
        id: 'swap-1',
        playedOn: '2026-09-07',
        participants: [
          { personId: 'ana', deckId: 'ana-1' },
          { personId: 'bob', deckId: 'bob-1' },
        ],
      }),
      makeMatch({
        id: 'swap-2',
        playedOn: '2026-09-07',
        participants: [
          { personId: 'ana', deckId: 'bob-1' },
          { personId: 'bob', deckId: 'ana-1' },
        ],
      }),
    ];

    const result = drawCommanders([ana, bob], [anaDecks[0], bobDecks[0]], 'pool', seededRng(3), {
      matches: lastSessionMatches,
      today,
      avoidRepeat: true,
    });

    expect(result).toHaveLength(2);
    expect(result.every((one) => one.repeated)).toBe(true);
  });

  test('should weigh the handicap by its own window while anti-repeat reads the full history', () => {
    // ana-1 dominates the season window; the older session is the one anti-repeat
    // must still see, so ana-1 has to be avoided despite weighing nothing there.
    const season = makeMatch({
      id: 'season',
      playedOn: '2026-09-08',
      participants: [
        { personId: 'ana', deckId: 'ana-2' },
        { personId: 'bob', deckId: 'bob-1' },
      ],
      winnerPersonId: 'ana',
    });

    const result = drawCommanders([ana, bob], [...anaDecks, ...bobDecks], 'own', seededRng(5), {
      matches: [lastSession],
      handicapMatches: [season],
      today,
      avoidRepeat: true,
      handicap: true,
    });

    expect(result.find((one) => one.personId === 'ana')?.deckId).toBe('ana-2');
  });
});

describe('drawCommanders with a shared precon', () => {
  const quartet = ['The Thing', 'Invisible Woman', 'Human Torch', 'Mister Fantastic'].map(
    (name, index) =>
      makeDeck({ id: `q${index}`, personId: 'ana', commander: makeCardRef({ name }) }),
  );
  const bobDeck = makeDeck({ id: 'bob-1', personId: 'bob' });
  const carolDeck = makeDeck({ id: 'carol-1', personId: 'carol' });

  test('should never hand two commanders of the same precon out in a pool draw', () => {
    const rng = seededRng(11);
    const decks = [...quartet, bobDeck, carolDeck];

    for (let round = 0; round < 200; round++) {
      const result = drawCommanders([ana, bob, carol], decks, 'pool', rng);
      const fromQuartet = result.filter((assignment) =>
        quartet.some((deck) => deck.id === assignment.deckId),
      );

      expect(fromQuartet.length).toBeLessThanOrEqual(1);
    }
  });

  test('should count the precon as one deck when checking the pool', () => {
    const decks = [...quartet, bobDeck];

    expect(checkDraw([ana, bob, carol], decks, 'pool')).toBe(
      'O pool tem 2 decks para 3 jogadores: faltam 1',
    );
  });
});
