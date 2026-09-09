import type { Season } from '../../domain/types';

export function makeSeason(override: Partial<Season> = {}): Season {
  return {
    id: 'season-1',
    name: 'Temporada 2026',
    startsOn: '2026-01-01',
    endsOn: null,
    ...override,
  };
}
