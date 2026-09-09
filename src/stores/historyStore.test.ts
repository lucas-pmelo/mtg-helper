import { beforeEach, describe, expect, test } from 'vitest';
import { useHistoryStore } from './historyStore';
import { today } from '../domain/history/today';
import { makeLiveMatch } from '../tests/factories/make-live-match';
import { makeMatch } from '../tests/factories/make-match';
import { makeSeason } from '../tests/factories/make-season';

const store = () => useHistoryStore.getState();
const draft = () => {
  const { id: _id, ...rest } = makeMatch();
  return rest;
};
const seasonDraft = () => {
  const { id: _id, ...rest } = makeSeason();
  return rest;
};

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ matches: [], seasons: [], liveMatch: null });
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

  test('should replace matches and seasons when a backup is imported', () => {
    store().addMatch(draft());
    const season = makeSeason();

    store().replaceAll([], [season]);

    expect(store().matches).toEqual([]);
    expect(store().seasons).toEqual([season]);
  });

  test('should start a live match dated today', () => {
    store().startLive(makeLiveMatch().participants, []);

    expect(store().liveMatch).toEqual({
      startedOn: today(),
      participants: makeLiveMatch().participants,
      benched: [],
    });
  });

  test('should keep who is at the table without a deck', () => {
    store().startLive(makeLiveMatch().participants, ['carol']);

    expect(store().liveMatch?.benched).toEqual(['carol']);
  });

  test('should overwrite a previous draft when a new match starts', () => {
    useHistoryStore.setState({ liveMatch: makeLiveMatch({ startedOn: '2020-01-01' }) });

    store().startLive([{ personId: 'carol', deckId: 'carol-1' }], []);

    expect(store().liveMatch?.startedOn).toBe(today());
    expect(store().liveMatch?.participants).toHaveLength(1);
  });

  test('should record the match on the day the draft started and clear the draft', () => {
    useHistoryStore.setState({ liveMatch: makeLiveMatch({ startedOn: '2026-09-07' }) });

    store().finishLive('bob');

    expect(store().matches).toMatchObject([
      { playedOn: '2026-09-07', winnerPersonId: 'bob', participants: makeLiveMatch().participants },
    ]);
    expect(store().liveMatch).toBeNull();
  });

  test('should keep the draft when finishing it fails validation', () => {
    const live = makeLiveMatch();
    useHistoryStore.setState({ liveMatch: live });

    expect(() => store().finishLive('carol')).toThrow(
      'O vencedor precisa ser um dos participantes',
    );
    expect(store().liveMatch).toEqual(live);
    expect(store().matches).toEqual([]);
  });

  test('should refuse to finish a match that was never started', () => {
    expect(() => store().finishLive('ana')).toThrow('There is no live match to finish');
  });

  test('should discard the draft without recording anything', () => {
    useHistoryStore.setState({ liveMatch: makeLiveMatch() });

    store().discardLive();

    expect(store().liveMatch).toBeNull();
    expect(store().matches).toEqual([]);
  });

  test('should add a valid season with a generated id', () => {
    store().addSeason(seasonDraft());

    expect(store().seasons).toHaveLength(1);
    expect(store().seasons[0].id).toBeTruthy();
  });

  test('should refuse a season without a name', () => {
    expect(() => store().addSeason({ ...seasonDraft(), name: '' })).toThrow(
      'Dê um nome à temporada',
    );
    expect(store().seasons).toEqual([]);
  });

  test('should refuse a season overlapping a stored one', () => {
    store().addSeason({ ...seasonDraft(), startsOn: '2025-01-01', endsOn: '2025-12-31' });

    expect(() =>
      store().addSeason({ ...seasonDraft(), startsOn: '2025-06-01', endsOn: null }),
    ).toThrow('A temporada não pode se sobrepor a "Temporada 2026"');
    expect(store().seasons).toHaveLength(1);
  });

  test('should update a season keeping its id', () => {
    store().addSeason(seasonDraft());
    const { id } = store().seasons[0];

    store().updateSeason(id, { ...seasonDraft(), name: 'Temporada nova' });

    expect(store().seasons[0]).toMatchObject({ id, name: 'Temporada nova' });
  });

  test('should update only the chosen season', () => {
    store().addSeason({ ...seasonDraft(), startsOn: '2025-01-01', endsOn: '2025-12-31' });
    store().addSeason({ ...seasonDraft(), name: 'Temporada 2026', startsOn: '2026-01-01' });
    const [first, second] = store().seasons;

    store().updateSeason(first.id, {
      ...seasonDraft(),
      name: 'Renomeada',
      startsOn: '2025-01-01',
      endsOn: '2025-12-31',
    });

    expect(store().seasons.map((season) => season.name)).toEqual(['Renomeada', 'Temporada 2026']);
    expect(store().seasons[1].id).toBe(second.id);
  });

  test('should let a season be edited without clashing with itself', () => {
    store().addSeason({ ...seasonDraft(), startsOn: '2026-01-01', endsOn: '2026-12-31' });
    const { id } = store().seasons[0];

    store().updateSeason(id, { ...seasonDraft(), startsOn: '2026-02-01', endsOn: '2026-12-31' });

    expect(store().seasons[0].startsOn).toBe('2026-02-01');
  });

  test('should refuse an invalid update and keep the stored season', () => {
    store().addSeason(seasonDraft());
    const { id } = store().seasons[0];

    expect(() => store().updateSeason(id, { ...seasonDraft(), name: '' })).toThrow();
    expect(store().seasons[0].name).toBe('Temporada 2026');
  });

  test('should remove a season without touching the matches', () => {
    store().addMatch(draft());
    store().addSeason(seasonDraft());

    store().removeSeason(store().seasons[0].id);

    expect(store().seasons).toEqual([]);
    expect(store().matches).toHaveLength(1);
  });
});
