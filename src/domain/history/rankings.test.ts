import { describe, expect, test } from 'vitest';
import { computeDeckRanking, computePlayerRanking, groupMatchesByDay } from './rankings';
import { makeDeck } from '../../tests/factories/make-deck';
import { makeMatch } from '../../tests/factories/make-match';
import { makePerson } from '../../tests/factories/make-person';

const ana = makePerson({ id: 'ana', name: 'Ana' });
const bob = makePerson({ id: 'bob', name: 'Bob' });

const anaDeck = makeDeck({ id: 'ana-1', personId: 'ana' });
const bobDeck = makeDeck({ id: 'bob-1', personId: 'bob' });

/** Ana wins two of three; Bob wins one. */
const matches = [
  makeMatch({ id: 'm1', playedOn: '2026-09-01', winnerPersonId: 'ana' }),
  makeMatch({ id: 'm2', playedOn: '2026-09-02', winnerPersonId: 'bob' }),
  makeMatch({ id: 'm3', playedOn: '2026-09-02', winnerPersonId: 'ana' }),
];

describe('computePlayerRanking', () => {
  test('should count wins and matches played for each person', () => {
    const ranking = computePlayerRanking(matches, [ana, bob]);

    expect(ranking).toEqual([
      { personId: 'ana', name: 'Ana', wins: 2, played: 3, winRate: 2 / 3 },
      { personId: 'bob', name: 'Bob', wins: 1, played: 3, winRate: 1 / 3 },
    ]);
  });

  test('should order by wins descending', () => {
    const ranking = computePlayerRanking(matches, [bob, ana]);

    expect(ranking.map((stat) => stat.personId)).toEqual(['ana', 'bob']);
  });

  test('should break a tie on wins by win rate', () => {
    const zoe = makePerson({ id: 'zoe', name: 'Zoe' });
    const tied = [
      makeMatch({ id: 'm1', winnerPersonId: 'ana' }),
      makeMatch({
        id: 'm2',
        participants: [
          { personId: 'bob', deckId: 'bob-1' },
          { personId: 'zoe', deckId: 'zoe-1' },
        ],
        winnerPersonId: 'bob',
      }),
    ];

    const ranking = computePlayerRanking(tied, [zoe, bob, ana]);

    expect(ranking.map((stat) => ({ id: stat.personId, wins: stat.wins, rate: stat.winRate }))).toEqual([
      { id: 'ana', wins: 1, rate: 1 },
      { id: 'bob', wins: 1, rate: 0.5 },
      { id: 'zoe', wins: 0, rate: 0 },
    ]);
  });

  test('should break a full tie by name', () => {
    const abel = makePerson({ id: 'abel', name: 'Abel' });
    const carol = makePerson({ id: 'carol', name: 'Carol' });

    const ranking = computePlayerRanking([], [carol, abel]);

    expect(ranking.map((stat) => stat.name)).toEqual(['Abel', 'Carol']);
  });

  test('should give a person with no matches a zero win rate', () => {
    const carol = makePerson({ id: 'carol', name: 'Carol' });

    const ranking = computePlayerRanking(matches, [ana, bob, carol]);

    expect(ranking.at(-1)).toEqual({
      personId: 'carol',
      name: 'Carol',
      wins: 0,
      played: 0,
      winRate: 0,
    });
  });

  test('should keep an archived person that has matches', () => {
    const archivedBob = makePerson({ id: 'bob', name: 'Bob', archived: true });

    const ranking = computePlayerRanking(matches, [ana, archivedBob]);

    expect(ranking.map((stat) => stat.personId)).toContain('bob');
  });

  test('should drop an archived person with no matches', () => {
    const archivedCarol = makePerson({ id: 'carol', name: 'Carol', archived: true });

    const ranking = computePlayerRanking(matches, [ana, bob, archivedCarol]);

    expect(ranking.map((stat) => stat.personId)).not.toContain('carol');
  });
});

describe('computeDeckRanking', () => {
  test('should count wins and matches played for each deck', () => {
    const ranking = computeDeckRanking(matches, [anaDeck, bobDeck]);

    expect(ranking).toEqual([
      {
        deckId: 'ana-1',
        personId: 'ana',
        commander: anaDeck.commander,
        wins: 2,
        played: 3,
        winRate: 2 / 3,
      },
      {
        deckId: 'bob-1',
        personId: 'bob',
        commander: bobDeck.commander,
        wins: 1,
        played: 3,
        winRate: 1 / 3,
      },
    ]);
  });

  test('should credit the win to the deck the winner played', () => {
    const swapped = [
      makeMatch({
        id: 'm1',
        participants: [
          { personId: 'ana', deckId: 'ana-2' },
          { personId: 'bob', deckId: 'bob-1' },
        ],
        winnerPersonId: 'ana',
      }),
    ];
    const anaSecondDeck = makeDeck({ id: 'ana-2', personId: 'ana' });

    const ranking = computeDeckRanking(swapped, [anaDeck, anaSecondDeck, bobDeck]);

    expect(ranking[0]).toMatchObject({ deckId: 'ana-2', wins: 1, played: 1 });
    expect(ranking.find((stat) => stat.deckId === 'ana-1')).toMatchObject({ wins: 0, played: 0 });
  });

  test('should keep an archived deck that has matches', () => {
    const archivedBobDeck = makeDeck({ id: 'bob-1', personId: 'bob', archived: true });

    const ranking = computeDeckRanking(matches, [anaDeck, archivedBobDeck]);

    expect(ranking.map((stat) => stat.deckId)).toContain('bob-1');
  });

  test('should drop an archived deck with no matches', () => {
    const archivedSpare = makeDeck({ id: 'ana-9', personId: 'ana', archived: true });

    const ranking = computeDeckRanking(matches, [anaDeck, bobDeck, archivedSpare]);

    expect(ranking.map((stat) => stat.deckId)).not.toContain('ana-9');
  });
});

describe('groupMatchesByDay', () => {
  test('should group matches by day with the most recent day first', () => {
    const days = groupMatchesByDay(matches);

    expect(days.map((day) => day.playedOn)).toEqual(['2026-09-02', '2026-09-01']);
    expect(days[0].matches.map((match) => match.id)).toEqual(['m2', 'm3']);
    expect(days[1].matches.map((match) => match.id)).toEqual(['m1']);
  });

  test('should summarise the winners of each day ordered by wins', () => {
    const days = groupMatchesByDay([
      ...matches,
      makeMatch({ id: 'm4', playedOn: '2026-09-02', winnerPersonId: 'ana' }),
    ]);

    expect(days[0].winners).toEqual([
      { personId: 'ana', wins: 2 },
      { personId: 'bob', wins: 1 },
    ]);
  });

  test('should return an empty list when there are no matches', () => {
    expect(groupMatchesByDay([])).toEqual([]);
  });
});
