import type { Match, Season } from '../types';

type SeasonDraft = Omit<Season, 'id'>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Stands in for an open season's end: sorts after any real 'YYYY-MM-DD'. */
const OPEN_END = '9999-12-31';

const endOf = (season: SeasonDraft) => season.endsOn ?? OPEN_END;

function overlap(one: SeasonDraft, other: SeasonDraft): boolean {
  return one.startsOn <= endOf(other) && other.startsOn <= endOf(one);
}

/** Reason the season cannot be saved, or null when it can. */
export function checkSeason(draft: SeasonDraft, existing: readonly Season[]): string | null {
  if (!draft.name.trim()) return 'Dê um nome à temporada';
  if (!draft.startsOn) return 'Informe a data de início';
  if (!ISO_DATE.test(draft.startsOn)) return 'Data de início inválida';
  if (draft.endsOn && draft.endsOn < draft.startsOn) return 'O fim não pode ser antes do início';

  const clash = existing.find((season) => overlap(draft, season));
  if (clash) return `A temporada não pode se sobrepor a "${clash.name}"`;

  return null;
}

/** Matches played inside the season, both boundaries included. */
export function matchesInSeason(matches: readonly Match[], season: Season): Match[] {
  return matches.filter(
    (match) => match.playedOn >= season.startsOn && match.playedOn <= endOf(season),
  );
}

export function currentSeason(seasons: readonly Season[], today: string): Season | undefined {
  return seasons.find((season) => today >= season.startsOn && today <= endOf(season));
}

/** Most recent first. */
export function sortSeasons(seasons: readonly Season[]): Season[] {
  return [...seasons].sort((a, b) => b.startsOn.localeCompare(a.startsOn));
}
