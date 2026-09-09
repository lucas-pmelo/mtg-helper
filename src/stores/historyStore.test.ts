import { beforeEach, describe, expect, test } from 'vitest';
import { useHistoryStore } from './historyStore';
import { makeMatch } from '../tests/factories/make-match';

const store = () => useHistoryStore.getState();
const draft = () => {
  const { id: _id, ...rest } = makeMatch();
  return rest;
};

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ matches: [] });
  });

  test('should add a valid match with a generated id', () => {
    store().addMatch(draft());

    expect(store().matches).toHaveLength(1);
    expect(store().matches[0].id).toBeTruthy();
  });

  test('should refuse a match whose winner did not play it', () => {
    expect(() => store().addMatch({ ...draft(), winnerPersonId: 'carol' })).toThrow(
      'O vencedor precisa ser um dos participantes',
    );
    expect(store().matches).toEqual([]);
  });

  test('should refuse a match with a single participant', () => {
    expect(() =>
      store().addMatch({ ...draft(), participants: [{ personId: 'ana', deckId: 'ana-1' }] }),
    ).toThrow('Registre ao menos 2 participantes');
  });

  test('should update a match keeping its id', () => {
    store().addMatch(draft());
    const { id } = store().matches[0];

    store().updateMatch(id, { ...draft(), winnerPersonId: 'bob' });

    expect(store().matches[0]).toMatchObject({ id, winnerPersonId: 'bob' });
  });

  test('should update only the chosen match', () => {
    store().addMatch(draft());
    store().addMatch(draft());
    const [first, second] = store().matches;

    store().updateMatch(first.id, { ...draft(), winnerPersonId: 'bob' });

    expect(store().matches.map((match) => match.winnerPersonId)).toEqual(['bob', 'ana']);
    expect(store().matches[1].id).toBe(second.id);
  });

  test('should refuse an invalid update and keep the stored match', () => {
    store().addMatch(draft());
    const { id } = store().matches[0];

    expect(() => store().updateMatch(id, { ...draft(), winnerPersonId: 'carol' })).toThrow();
    expect(store().matches[0].winnerPersonId).toBe('ana');
  });

  test('should remove a match', () => {
    store().addMatch(draft());

    store().removeMatch(store().matches[0].id);

    expect(store().matches).toEqual([]);
  });

  test('should replace all matches when a backup is imported', () => {
    store().addMatch(draft());

    store().replaceAll([]);

    expect(store().matches).toEqual([]);
  });
});
