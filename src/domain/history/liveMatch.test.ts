import { describe, expect, test } from 'vitest';
import { benched, checkLiveStart, isStale, toParticipants } from './liveMatch';
import { makeLiveMatch } from '../../tests/factories/make-live-match';

const withDecks = [
  { personId: 'ana', deckId: 'ana-1' },
  { personId: 'bob', deckId: 'bob-1' },
];

describe('toParticipants', () => {
  test('should keep every assignment that carries a deck', () => {
    expect(toParticipants(withDecks)).toEqual(withDecks);
  });

  test('should drop the player who is at the table without a deck', () => {
    const assignments = [...withDecks, { personId: 'carol', deckId: null }];

    expect(toParticipants(assignments)).toEqual(withDecks);
  });

  test('should drop the repeated flag the draw added', () => {
    const assignments = [{ personId: 'ana', deckId: 'ana-1', repeated: true }];

    expect(toParticipants(assignments)).toEqual([{ personId: 'ana', deckId: 'ana-1' }]);
  });
});

describe('benched', () => {
  test('should name the people left out for having no deck', () => {
    const assignments = [...withDecks, { personId: 'carol', deckId: null }];

    expect(benched(assignments)).toEqual(['carol']);
  });

  test('should be empty when everyone got a deck', () => {
    expect(benched(withDecks)).toEqual([]);
  });
});

describe('checkLiveStart', () => {
  test('should accept a table with two players holding decks', () => {
    expect(checkLiveStart(withDecks)).toBeNull();
  });

  test('should refuse when only one player holds a deck', () => {
    const assignments = [withDecks[0], { personId: 'bob', deckId: null }];

    expect(checkLiveStart(assignments)).toBe('Ao menos 2 jogadores precisam de deck para registrar a partida');
  });
});

describe('isStale', () => {
  test('should be false on the day the draft was started', () => {
    expect(isStale(makeLiveMatch({ startedOn: '2026-09-09' }), '2026-09-09')).toBe(false);
  });

  test('should be true once the day has turned', () => {
    expect(isStale(makeLiveMatch({ startedOn: '2026-09-09' }), '2026-09-10')).toBe(true);
  });
});
