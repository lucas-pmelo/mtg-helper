import { describe, expect, test } from 'vitest';
import {
  OPTIONS_PER_TURN,
  checkDraftStart,
  pickInDraft,
  startDraft,
  type DraftContext,
  type DraftState,
} from './draft';
import type { DrawMode } from './drawCommanders';
import { makeCardRef, makeDeck } from '../../tests/factories/make-deck';
import { makeMatch } from '../../tests/factories/make-match';
import { makePerson } from '../../tests/factories/make-person';
import type { Match, Person } from '../types';
import { seededRng } from '../../tests/rng';

const ana = makePerson({ id: 'ana', name: 'Ana' });
const bob = makePerson({ id: 'bob', name: 'Bob' });
const carol = makePerson({ id: 'carol', name: 'Carol' });

const decks = [
  makeDeck({ id: 'ana-1', personId: 'ana' }),
  makeDeck({ id: 'ana-2', personId: 'ana' }),
  makeDeck({ id: 'ana-3', personId: 'ana' }),
  makeDeck({ id: 'bob-1', personId: 'bob' }),
  makeDeck({ id: 'bob-2', personId: 'bob' }),
  makeDeck({ id: 'bob-3', personId: 'bob' }),
];

const today = '2026-09-09';

function makeContext(override: Partial<DraftContext> = {}): DraftContext {
  // Both windows default to the same history: a test that cares about the split
  // passes `handicapMatches` explicitly.
  const matches = override.matches ?? [];

  return {
    decks,
    mode: 'own' as DrawMode,
    matches,
    handicapMatches: matches,
    today,
    avoidRepeat: false,
    handicap: false,
    ...override,
  };
}

/** Plays the whole draft always taking the first option, asserting the invariants on the way. */
function playThrough(state: DraftState, context: DraftContext, rng = seededRng(1)): DraftState {
  let current = state;

  while (!current.done) {
    expect(current.options.length).toBeGreaterThan(0);
    expect(current.options.length).toBeLessThanOrEqual(OPTIONS_PER_TURN);
    current = pickInDraft(current, current.options[0], context, rng);
  }

  return current;
}

describe('checkDraftStart', () => {
  test('should return null when the draft can start', () => {
    expect(checkDraftStart([ana, bob], makeContext())).toBeNull();
  });

  test('should refuse fewer than two players', () => {
    expect(checkDraftStart([ana], makeContext())).toBe('Selecione ao menos 2 jogadores');
  });

  test('should refuse a pool with fewer decks than players', () => {
    const context = makeContext({
      mode: 'pool',
      decks: [makeDeck({ id: 'ana-1', personId: 'ana' })],
    });

    expect(checkDraftStart([ana, bob], context)).toBe(
      'O pool tem 1 decks para 2 jogadores: faltam 1',
    );
  });
});

describe('startDraft', () => {
  test('should throw when the draft cannot start', () => {
    expect(() => startDraft([ana], makeContext(), seededRng(1))).toThrow(
      'Selecione ao menos 2 jogadores',
    );
  });

  test('should open on the first player with options and nothing picked yet', () => {
    const state = startDraft([ana, bob], makeContext(), seededRng(1));

    expect(state.order).toHaveLength(2);
    expect(state.turn).toBe(0);
    expect(state.picks).toEqual([]);
    expect(state.taken).toEqual([]);
    expect(state.done).toBe(false);
    expect(state.options).toHaveLength(OPTIONS_PER_TURN);
  });

  test('should offer only the decks of the player on turn when mode is own', () => {
    const rng = seededRng(9);

    for (let round = 0; round < 100; round++) {
      const state = startDraft([ana, bob], makeContext(), rng);

      for (const deckId of state.options) {
        expect(deckId.startsWith(state.order[0])).toBe(true);
      }
    }
  });

  test('should offer decks from the whole pool when mode is pool', () => {
    const rng = seededRng(9);
    const seen = new Set<string>();

    for (let round = 0; round < 100; round++) {
      const state = startDraft([ana, bob], makeContext({ mode: 'pool' }), rng);
      for (const deckId of state.options) seen.add(deckId);
    }

    expect(seen.size).toBe(decks.length);
  });

  test('should offer fewer options than the cap when there are not enough decks', () => {
    const twoDecks = [decks[0], decks[3]];
    const state = startDraft([ana, bob], makeContext({ decks: twoDecks }), seededRng(1));

    expect(state.options).toHaveLength(1);
  });

  test('should shuffle who picks first', () => {
    const rng = seededRng(3);
    const leaders = new Set<string>();

    for (let round = 0; round < 200; round++) {
      leaders.add(startDraft([ana, bob], makeContext(), rng).order[0]);
    }

    expect(leaders).toEqual(new Set(['ana', 'bob']));
  });

  test('should skip a player who owns no deck, seating them without a commander', () => {
    const context = makeContext({ decks: decks.filter((deck) => deck.personId === 'ana') });
    const rng = seededRng(1);
    let sawBobSkipped = false;

    for (let round = 0; round < 100; round++) {
      const state = startDraft([ana, bob], context, rng);

      expect(state.order[state.turn]).toBe('ana');
      expect(state.done).toBe(false);
      if (state.order[0] === 'bob') {
        expect(state.picks).toEqual([{ personId: 'bob', deckId: null }]);
        sawBobSkipped = true;
      }
    }

    expect(sawBobSkipped).toBe(true);
  });

  test('should finish immediately when nobody owns a deck', () => {
    const state = startDraft([bob, carol], makeContext({ decks: [decks[0]] }), seededRng(1));

    expect(state.done).toBe(true);
    expect(state.options).toEqual([]);
    expect(state.picks).toEqual([
      { personId: expect.any(String), deckId: null },
      { personId: expect.any(String), deckId: null },
    ]);
  });
});

describe('pickInDraft', () => {
  test('should record the pick and move to the next player', () => {
    const context = makeContext();
    const state = startDraft([ana, bob], context, seededRng(1));
    const chosen = state.options[1];

    const next = pickInDraft(state, chosen, context, seededRng(2));

    expect(next.picks).toEqual([{ personId: state.order[0], deckId: chosen }]);
    expect(next.turn).toBe(1);
    expect(next.done).toBe(false);
    expect(next.options.length).toBeGreaterThan(0);
  });

  test('should throw when the deck is not among the current options', () => {
    const context = makeContext();
    const state = startDraft([ana, bob], context, seededRng(1));

    expect(() => pickInDraft(state, 'bob-9', context, seededRng(2))).toThrow(
      'Deck bob-9 is not among the current options',
    );
  });

  test('should throw when the draft is already done', () => {
    const context = makeContext();
    const done = playThrough(startDraft([ana, bob], context, seededRng(1)), context);

    expect(() => pickInDraft(done, 'ana-1', context, seededRng(2))).toThrow(
      'The draft is already done',
    );
  });

  test('should leave taken empty when mode is own', () => {
    const context = makeContext();
    const state = startDraft([ana, bob], context, seededRng(1));

    expect(pickInDraft(state, state.options[0], context, seededRng(2)).taken).toEqual([]);
  });

  test('should take the chosen deck out of circulation when mode is pool', () => {
    const context = makeContext({ mode: 'pool' });
    const state = startDraft([ana, bob, carol], context, seededRng(4));
    const chosen = state.options[0];

    const next = pickInDraft(state, chosen, context, seededRng(5));

    expect(next.taken).toEqual([chosen]);
    expect(next.options).not.toContain(chosen);
  });

  test('should never offer the same deck twice across a pool draft', () => {
    const context = makeContext({ mode: 'pool' });
    const rng = seededRng(21);

    for (let round = 0; round < 100; round++) {
      const final = playThrough(startDraft([ana, bob, carol], context, rng), context, rng);
      const deckIds = final.picks.map((pick) => pick.deckId);

      expect(new Set(deckIds).size).toBe(deckIds.length);
    }
  });

  test('should end with exactly one pick per player', () => {
    const rng = seededRng(31);

    for (const mode of ['own', 'pool'] as DrawMode[]) {
      const context = makeContext({ mode });
      const final = playThrough(startDraft([ana, bob, carol], context, rng), context, rng);

      expect(final.done).toBe(true);
      expect(final.picks.map((pick) => pick.personId).sort()).toEqual(['ana', 'bob', 'carol']);
    }
  });

  test('should keep the picks in the order the players chose', () => {
    const context = makeContext();
    const state = startDraft([ana, bob], context, seededRng(7));
    const final = playThrough(state, context);

    expect(final.picks.map((pick) => pick.personId)).toEqual(state.order);
  });
});

describe('draft with anti-repeat', () => {
  const lastSession = makeMatch({
    id: 'last-session',
    playedOn: '2026-09-07',
    participants: [
      { personId: 'ana', deckId: 'ana-1' },
      { personId: 'bob', deckId: 'bob-1' },
    ],
  });

  test('should keep the last session deck out of the options when mode is own', () => {
    const context = makeContext({ matches: [lastSession], avoidRepeat: true });
    const rng = seededRng(13);

    for (let round = 0; round < 100; round++) {
      const state = startDraft([ana, bob], context, rng);
      const forbidden = `${state.order[0]}-1`;

      expect(state.options).not.toContain(forbidden);
      expect(state.options).toHaveLength(2);
    }
  });

  test('should keep the last session deck of the player on turn out of a pool draft', () => {
    const context = makeContext({ mode: 'pool', matches: [lastSession], avoidRepeat: true });
    const rng = seededRng(15);

    for (let round = 0; round < 100; round++) {
      const state = startDraft([ana, bob], context, rng);

      expect(state.options).not.toContain(`${state.order[0]}-1`);
    }
  });

  test('should give the whole pool back when the player used every deck left in it', () => {
    const usedEverything = makeMatch({
      id: 'used-everything',
      playedOn: '2026-09-07',
      participants: [
        { personId: 'ana', deckId: 'ana-1' },
        { personId: 'ana', deckId: 'bob-1' },
      ],
    });
    const context = makeContext({
      mode: 'pool',
      decks: [decks[0], decks[3]],
      matches: [usedEverything],
      avoidRepeat: true,
    });
    const rng = seededRng(6);
    let sawAnaOnTurn = false;

    for (let round = 0; round < 100; round++) {
      const state = startDraft([ana, bob], context, rng);
      if (state.order[0] !== 'ana') continue;

      sawAnaOnTurn = true;
      expect([...state.options].sort()).toEqual(['ana-1', 'bob-1']);
    }

    expect(sawAnaOnTurn).toBe(true);
  });

  test('should give the repeated deck back and mark the pick when it is the only option', () => {
    const soleDecks = [makeDeck({ id: 'ana-1', personId: 'ana' }), decks[3]];
    const context = makeContext({
      decks: soleDecks,
      matches: [lastSession],
      avoidRepeat: true,
    });
    let state = startDraft([ana, bob], context, seededRng(1));

    while (state.order[state.turn] !== 'ana') {
      state = pickInDraft(state, state.options[0], context, seededRng(2));
    }

    expect(state.options).toEqual(['ana-1']);
    expect(pickInDraft(state, 'ana-1', context, seededRng(2)).picks).toContainEqual({
      personId: 'ana',
      deckId: 'ana-1',
      repeated: true,
    });
  });

  test('should not mark a pick as repeated when the player had alternatives', () => {
    const context = makeContext({ matches: [lastSession], avoidRepeat: true });
    const final = playThrough(startDraft([ana, bob], context, seededRng(1)), context);

    for (const pick of final.picks) {
      expect(pick.repeated).toBeUndefined();
    }
  });
});

describe('draft with handicap', () => {
  /** ana-1 wins everything, ana-3 loses everything, ana-2 never played. */
  const matches: Match[] = Array.from({ length: 8 }, (_, index) => [
    makeMatch({
      id: `won-${index}`,
      participants: [
        { personId: 'ana', deckId: 'ana-1' },
        { personId: 'carol', deckId: 'carol-1' },
      ],
      winnerPersonId: 'ana',
    }),
    makeMatch({
      id: `lost-${index}`,
      participants: [
        { personId: 'ana', deckId: 'ana-3' },
        { personId: 'carol', deckId: 'carol-1' },
      ],
      winnerPersonId: 'carol',
    }),
  ]).flat();

  test('should offer the losing deck more often than the winning one', () => {
    const context = makeContext({ matches, handicap: true, decks });
    const rng = seededRng(101);
    const appearances: Record<string, number> = { 'ana-1': 0, 'ana-2': 0, 'ana-3': 0 };
    const rounds = 4000;
    let anaTurns = 0;

    for (let round = 0; round < rounds; round++) {
      // Two options out of ana's three decks, so the weights decide who is left out.
      const state = startDraft([ana, bob], { ...context, decks }, rng);
      if (state.order[0] !== 'ana') continue;

      anaTurns++;
      for (const deckId of state.options.slice(0, 2)) appearances[deckId]++;
    }

    expect(anaTurns).toBeGreaterThan(1000);
    expect(appearances['ana-3']).toBeGreaterThan(appearances['ana-1'] * 1.2);
  });

  test('should still fill every seat when the handicap is on', () => {
    const context = makeContext({ mode: 'pool', matches, handicap: true });
    const final = playThrough(startDraft([ana, bob, carol], context, seededRng(55)), context);

    expect(final.picks).toHaveLength(3);
    expect(final.picks.every((pick) => pick.deckId !== null)).toBe(true);
  });
});

describe('draft output', () => {
  test('should produce the same shape the dry draw produces', () => {
    const context = makeContext();
    const final = playThrough(startDraft([ana, bob], context, seededRng(1)), context);

    for (const pick of final.picks) {
      expect(Object.keys(pick).sort()).toEqual(['deckId', 'personId']);
      expect(typeof pick.personId).toBe('string');
    }
  });

  test('should list every present player even when some are deckless', () => {
    const players: Person[] = [ana, bob, carol];
    const context = makeContext({ decks: decks.filter((deck) => deck.personId === 'ana') });
    const final = playThrough(startDraft(players, context, seededRng(1)), context);

    expect(final.picks.map((pick) => pick.personId).sort()).toEqual(['ana', 'bob', 'carol']);
    expect(final.picks.filter((pick) => pick.deckId === null)).toHaveLength(2);
  });
});

describe('startDraft with a shared precon', () => {
  const quartet = ['The Thing', 'Invisible Woman', 'Human Torch', 'Mister Fantastic'].map(
    (name, index) =>
      makeDeck({ id: `q${index}`, personId: 'ana', commander: makeCardRef({ name }) }),
  );
  const others = [
    makeDeck({ id: 'bob-1', personId: 'bob' }),
    makeDeck({ id: 'carol-1', personId: 'carol' }),
  ];
  const isQuartet = (deckId: string) => quartet.some((deck) => deck.id === deckId);

  test('should drop the whole precon from the options once one of it is picked', () => {
    const context = makeContext({ decks: [...quartet, ...others], mode: 'pool' });
    const started = startDraft([ana, bob, carol], context, seededRng(5));
    const quartetOption = started.options.find(isQuartet);

    expect(quartetOption).toBeDefined();

    const next = pickInDraft(started, quartetOption as string, context, seededRng(5));

    expect(next.options.filter(isQuartet)).toEqual([]);
  });

  test('should never let a pool draft end with two commanders of the same precon', () => {
    const context = makeContext({ decks: [...quartet, ...others], mode: 'pool' });

    for (let seed = 1; seed <= 50; seed++) {
      const finished = playThrough(startDraft([ana, bob, carol], context, seededRng(seed)), context);
      const picked = finished.picks.filter((pick) => pick.deckId && isQuartet(pick.deckId));

      expect(picked.length).toBeLessThanOrEqual(1);
    }
  });
});
