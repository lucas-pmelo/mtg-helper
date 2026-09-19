import { normalizeCode } from './cardCache';

/** A set reduced to what identifies it by the footer: how many cards it printed. */
export type SetSize = {
  code: string;
  cardCount: number;
  /** 'YYYY-MM-DD'; ties in size are broken by recency. */
  releasedAt: string;
};

/**
 * Dozens of tiny promo sets share a size, and every code goes into a single
 * Scryfall query. Thirty is well past what a real footer ever matches.
 */
export const MAX_CANDIDATE_SETS = 30;

const DIGITS = /^\d+$/;

/**
 * The sets that printed exactly `total` cards, newest first. A card footer like
 * `95/143` has no set code, but the total narrows the field to a handful.
 */
export function codesWithSize(sets: readonly SetSize[], total: number): string[] {
  return sets
    .filter((set) => set.cardCount === total)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
    .slice(0, MAX_CANDIDATE_SETS)
    .map((set) => set.code);
}

/** Reason the footer lookup cannot run, or null when it can. */
export function checkTotalLookup(collectorNumber: string, total: string): string | null {
  const number = normalizeCode(collectorNumber);
  const size = normalizeCode(total);

  if (!number) return 'Digite o número da carta';
  if (!size) return 'Digite o total de cartas do set';
  if (!DIGITS.test(size)) return 'O total do set é só números';

  // The number takes letters on promos; only its digits can be compared.
  const numeric = Number.parseInt(number, 10);
  if (Number.isFinite(numeric) && numeric > Number.parseInt(size, 10)) {
    return 'O número da carta não pode passar do total';
  }

  return null;
}

const FRESH_FOR_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * The set list only grows, and the cards this lookup serves are decades old —
 * a month between downloads of the 600 KB list is plenty.
 */
export function setsAreStale(fetchedAt: string | null, now: string): boolean {
  if (!fetchedAt) return true;

  const age = Date.parse(now) - Date.parse(fetchedAt);

  return !Number.isFinite(age) || age > FRESH_FOR_DAYS * DAY_IN_MS;
}
