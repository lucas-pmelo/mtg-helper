import { describe, expect, test } from 'vitest';
import { checkSeason, currentSeason, matchesInSeason, sortSeasons } from './seasons';
import { makeMatch } from '../../tests/factories/make-match';
import { makeSeason } from '../../tests/factories/make-season';

const draftOf = (season = makeSeason()) => {
  const { id: _id, ...draft } = season;
  return draft;
};

describe('checkSeason', () => {
  test('should accept a season that does not touch any other', () => {
    const existing = [makeSeason({ startsOn: '2025-01-01', endsOn: '2025-12-31' })];

    expect(checkSeason(draftOf(makeSeason({ startsOn: '2026-01-01' })), existing)).toBeNull();
  });

  test('should refuse a season without a name', () => {
    expect(checkSeason(draftOf(makeSeason({ name: '  ' })), [])).toBe('Dê um nome à temporada');
  });

  test('should refuse a season without a start date', () => {
    expect(checkSeason(draftOf(makeSeason({ startsOn: '' })), [])).toBe(
      'Informe a data de início',
    );
  });

  test('should refuse a start date that is not YYYY-MM-DD', () => {
    expect(checkSeason(draftOf(makeSeason({ startsOn: '01/01/2026' })), [])).toBe(
      'Data de início inválida',
    );
  });

  test('should refuse an end date before the start date', () => {
    const draft = draftOf(makeSeason({ startsOn: '2026-03-01', endsOn: '2026-02-28' }));

    expect(checkSeason(draft, [])).toBe('O fim não pode ser antes do início');
  });

  test('should accept a season that ends on the day it starts', () => {
    const draft = draftOf(makeSeason({ startsOn: '2026-03-01', endsOn: '2026-03-01' }));

    expect(checkSeason(draft, [])).toBeNull();
  });

  test('should refuse a season overlapping an existing one', () => {
    const existing = [
      makeSeason({ name: 'Temporada 2025', startsOn: '2025-01-01', endsOn: '2025-12-31' }),
    ];
    const draft = draftOf(makeSeason({ startsOn: '2025-12-31', endsOn: '2026-06-30' }));

    expect(checkSeason(draft, existing)).toBe(
      'A temporada não pode se sobrepor a "Temporada 2025"',
    );
  });

  test('should refuse a season starting inside an open season', () => {
    const existing = [makeSeason({ name: 'Aberta', startsOn: '2026-01-01', endsOn: null })];
    const draft = draftOf(makeSeason({ startsOn: '2030-01-01', endsOn: '2030-12-31' }));

    expect(checkSeason(draft, existing)).toBe('A temporada não pode se sobrepor a "Aberta"');
  });

  test('should accept a gap between two seasons', () => {
    const existing = [makeSeason({ startsOn: '2025-01-01', endsOn: '2025-06-30' })];
    const draft = draftOf(makeSeason({ startsOn: '2025-08-01', endsOn: '2025-12-31' }));

    expect(checkSeason(draft, existing)).toBeNull();
  });

  test('should accept an edit when the season itself is left out of the list', () => {
    const season = makeSeason({ id: 'season-1', startsOn: '2026-01-01', endsOn: '2026-12-31' });
    const other = makeSeason({ id: 'season-2', startsOn: '2025-01-01', endsOn: '2025-12-31' });
    const others = [season, other].filter((candidate) => candidate.id !== season.id);

    expect(checkSeason(draftOf({ ...season, name: 'Outro nome' }), others)).toBeNull();
  });
});

describe('matchesInSeason', () => {
  test('should keep the matches played on the boundaries of the season', () => {
    const season = makeSeason({ startsOn: '2026-01-01', endsOn: '2026-03-31' });
    const matches = [
      makeMatch({ id: 'before', playedOn: '2025-12-31' }),
      makeMatch({ id: 'start', playedOn: '2026-01-01' }),
      makeMatch({ id: 'middle', playedOn: '2026-02-10' }),
      makeMatch({ id: 'end', playedOn: '2026-03-31' }),
      makeMatch({ id: 'after', playedOn: '2026-04-01' }),
    ];

    expect(matchesInSeason(matches, season).map((match) => match.id)).toEqual([
      'start',
      'middle',
      'end',
    ]);
  });

  test('should keep every match from the start on when the season is open', () => {
    const season = makeSeason({ startsOn: '2026-01-01', endsOn: null });
    const matches = [
      makeMatch({ id: 'before', playedOn: '2025-12-31' }),
      makeMatch({ id: 'far-ahead', playedOn: '2099-01-01' }),
    ];

    expect(matchesInSeason(matches, season).map((match) => match.id)).toEqual(['far-ahead']);
  });
});

describe('currentSeason', () => {
  test('should find the season containing the given day', () => {
    const closed = makeSeason({ id: 'closed', startsOn: '2025-01-01', endsOn: '2025-12-31' });
    const open = makeSeason({ id: 'open', startsOn: '2026-01-01', endsOn: null });

    expect(currentSeason([closed, open], '2026-09-09')?.id).toBe('open');
  });

  test('should find nothing when the day falls in a gap', () => {
    const seasons = [makeSeason({ startsOn: '2025-01-01', endsOn: '2025-06-30' })];

    expect(currentSeason(seasons, '2025-07-01')).toBeUndefined();
  });
});

describe('sortSeasons', () => {
  test('should list the most recent season first', () => {
    const older = makeSeason({ id: 'older', startsOn: '2024-01-01', endsOn: '2024-12-31' });
    const newer = makeSeason({ id: 'newer', startsOn: '2026-01-01', endsOn: null });

    expect(sortSeasons([older, newer]).map((season) => season.id)).toEqual(['newer', 'older']);
  });

  test('should not change the given list', () => {
    const seasons = [
      makeSeason({ id: 'older', startsOn: '2024-01-01' }),
      makeSeason({ id: 'newer', startsOn: '2026-01-01' }),
    ];

    sortSeasons(seasons);

    expect(seasons.map((season) => season.id)).toEqual(['older', 'newer']);
  });
});
