import { describe, expect, test } from 'vitest';
import { eligibleDecks, isRepeat, lastPlayedDay } from './eligibleDecks';
import { makeDeck } from '../../tests/factories/make-deck';
import { makeMatch } from '../../tests/factories/make-match';

const anaDecks = [
  makeDeck({ id: 'ana-1', personId: 'ana' }),
  makeDeck({ id: 'ana-2', personId: 'ana' }),
];
const decks = [...anaDecks, makeDeck({ id: 'bob-1', personId: 'bob' })];

const onMonday = makeMatch({
  id: 'monday',
  playedOn: '2026-09-07',
  participants: [
    { personId: 'ana', deckId: 'ana-1' },
    { personId: 'bob', deckId: 'bob-1' },
  ],
});
const onFriday = makeMatch({
  id: 'friday',
  playedOn: '2026-09-04',
  participants: [
    { personId: 'ana', deckId: 'ana-2' },
    { personId: 'bob', deckId: 'bob-1' },
  ],
});
const today = '2026-09-09';

describe('lastPlayedDay', () => {
  test('should return the most recent day the person played when there is history', () => {
    expect(lastPlayedDay([onFriday, onMonday], 'ana', today)).toBe('2026-09-07');
  });

  test('should not care about the order the matches come in', () => {
    expect(lastPlayedDay([onMonday, onFriday], 'ana', today)).toBe('2026-09-07');
  });

  test('should return null when the person never played', () => {
    expect(lastPlayedDay([onMonday], 'carol', today)).toBeNull();
  });

  test('should ignore matches of the current session', () => {
    const tonight = makeMatch({
      id: 'tonight',
      playedOn: today,
      participants: [{ personId: 'ana', deckId: 'ana-2' }],
    });

    expect(lastPlayedDay([onMonday, tonight], 'ana', today)).toBe('2026-09-07');
  });

  test('should return null when the only history is the current session', () => {
    const tonight = makeMatch({ id: 'tonight', playedOn: today });

    expect(lastPlayedDay([tonight], 'ana', today)).toBeNull();
  });
});

describe('isRepeat', () => {
  test('should be true when the person used the deck on their last played day', () => {
    expect(isRepeat([onFriday, onMonday], 'ana', 'ana-1', today)).toBe(true);
  });

  test('should be false for a deck used on an earlier day only', () => {
    expect(isRepeat([onFriday, onMonday], 'ana', 'ana-2', today)).toBe(false);
  });

  test('should be false when the person never played', () => {
    expect(isRepeat([onMonday], 'carol', 'ana-1', today)).toBe(false);
  });
});

describe('eligibleDecks', () => {
  test('should drop the deck used on the last played day', () => {
    const result = eligibleDecks(decks, [onFriday, onMonday], 'ana', today);

    expect(result.map((deck) => deck.id)).toEqual(['ana-2']);
  });

  test('should only consider decks owned by the person', () => {
    const result = eligibleDecks(decks, [], 'ana', today);

    expect(result.map((deck) => deck.id)).toEqual(['ana-1', 'ana-2']);
  });

  test('should ignore archived decks', () => {
    const result = eligibleDecks(
      [makeDeck({ id: 'ana-1', personId: 'ana', archived: true }), anaDecks[1]],
      [],
      'ana',
      today,
    );

    expect(result.map((deck) => deck.id)).toEqual(['ana-2']);
  });

  test('should give every deck back when the filter would leave nothing', () => {
    const bothUsed = makeMatch({
      id: 'both',
      playedOn: '2026-09-07',
      participants: [
        { personId: 'ana', deckId: 'ana-1' },
        { personId: 'ana', deckId: 'ana-2' },
      ],
    });

    const result = eligibleDecks(decks, [bothUsed], 'ana', today);

    expect(result.map((deck) => deck.id)).toEqual(['ana-1', 'ana-2']);
  });

  test('should return an empty list when the person owns no active deck', () => {
    expect(eligibleDecks(decks, [], 'carol', today)).toEqual([]);
  });
});
