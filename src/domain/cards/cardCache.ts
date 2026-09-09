import type { CardLookup } from '../types';

/** The list is thumb-scrolled; twenty is already more than anyone scrolls. */
export const MAX_RECENT = 20;

const SET_CODE = /^[a-z0-9]+$/;

/**
 * Trim and lowercase, nothing else. A leading zero stays: `005` and `5` are the
 * same card to Scryfall, but guessing that here would cost a wrong lookup —
 * keeping it costs, at worst, a duplicate cache entry.
 */
export function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

export function cardKey(set: string, collectorNumber: string): string {
  return `${normalizeCode(set)}/${normalizeCode(collectorNumber)}`;
}

/** Reason in Portuguese for the screen to show, or null when the lookup can run. */
export function checkLookup(set: string, collectorNumber: string): string | null {
  const setCode = normalizeCode(set);

  if (!setCode) return 'Digite o código do set';
  if (!SET_CODE.test(setCode)) return 'O código do set usa só letras e números';

  // The number takes letters: `125a` exists, and so do promo numbers.
  if (!normalizeCode(collectorNumber)) return 'Digite o número da carta';

  return null;
}

/** Looking a card up again promotes it to the top instead of duplicating it. */
export function rememberCard(recent: CardLookup[], card: CardLookup): CardLookup[] {
  return [card, ...recent.filter((cached) => cached.key !== card.key)].slice(0, MAX_RECENT);
}

export function findCard(recent: CardLookup[], key: string): CardLookup | undefined {
  return recent.find((card) => card.key === key);
}
