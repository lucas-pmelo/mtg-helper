import { describe, expect, test } from 'vitest';
import { computeHeadToHead } from './headToHead';
import { makeMatch } from '../../tests/factories/make-match';
import { makePerson } from '../../tests/factories/make-person';

const ana = makePerson({ id: 'ana', name: 'Ana' });
const bob = makePerson({ id: 'bob', name: 'Bob' });
const cid = makePerson({ id: 'cid', name: 'Cid' });
const people = [ana, bob, cid];

const table = (id: string, winnerPersonId: string) =>
  makeMatch({
    id,
    winnerPersonId,
    participants: [
      { personId: 'ana', deckId: 'ana-1' },
      { personId: 'bob', deckId: 'bob-1' },
      { personId: 'cid', deckId: 'cid-1' },
    ],
  });

describe('computeHeadToHead', () => {
  test('should split the shared tables into own, opponent and third-party wins, ties by name', () => {
    const matches = [table('m1', 'ana'), table('m2', 'bob'), table('m3', 'cid')];

    expect(computeHeadToHead(matches, people, 'ana')).toEqual([
      { opponentId: 'bob', name: 'Bob', shared: 3, wins: 1, opponentWins: 1, otherWins: 1 },
      { opponentId: 'cid', name: 'Cid', shared: 3, wins: 1, opponentWins: 1, otherWins: 1 },
    ]);
  });

  test('should keep wins plus opponentWins plus otherWins equal to shared', () => {
    const matches = [
      table('m1', 'ana'),
      table('m2', 'bob'),
      table('m3', 'cid'),
      makeMatch({ id: 'm4', winnerPersonId: 'bob' }),
    ];

    for (const confrontation of computeHeadToHead(matches, people, 'ana')) {
      const { wins, opponentWins, otherWins, shared } = confrontation;

      expect(wins + opponentWins + otherWins).toBe(shared);
    }
  });

  test('should leave out an opponent who never shared a table', () => {
    const matches = [makeMatch({ id: 'm1', winnerPersonId: 'ana' })];

    expect(computeHeadToHead(matches, people, 'ana').map((row) => row.opponentId)).toEqual(['bob']);
  });

  test('should return an empty list for a player without any match', () => {
    expect(computeHeadToHead([], people, 'ana')).toEqual([]);
  });

  test('should never list the consulted player among their own opponents', () => {
    const matches = [table('m1', 'ana')];

    expect(computeHeadToHead(matches, people, 'ana').map((row) => row.opponentId)).not.toContain(
      'ana',
    );
  });

  test('should order by shared tables, most played first', () => {
    const matches = [
      table('m1', 'ana'),
      makeMatch({
        id: 'm2',
        winnerPersonId: 'cid',
        participants: [
          { personId: 'ana', deckId: 'ana-1' },
          { personId: 'cid', deckId: 'cid-1' },
        ],
      }),
      makeMatch({
        id: 'm3',
        winnerPersonId: 'ana',
        participants: [
          { personId: 'ana', deckId: 'ana-1' },
          { personId: 'cid', deckId: 'cid-1' },
        ],
      }),
    ];

    expect(computeHeadToHead(matches, people, 'ana').map((row) => row.opponentId)).toEqual([
      'cid',
      'bob',
    ]);
  });
});
