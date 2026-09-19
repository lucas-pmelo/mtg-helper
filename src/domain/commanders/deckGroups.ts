import type { Rng } from '../rng';
import type { Deck } from '../types';

/**
 * Precons that are a single physical deck behind interchangeable commanders: the
 * Fantastic Four box ships one deck and four face cards, so two of them can never
 * be on the table at the same time. Add a precon by adding a line here.
 */
const GROUPS: Record<string, string[]> = {
  'quarteto-fantastico': ['the thing', 'invisible woman', 'human torch', 'mister fantastic'],
};

/**
 * The name the group is keyed by. Reprints append the civil name after a comma
 * ("The Thing, Ben Grimm"), and the table types accents as it pleases — both
 * have to land on the same key.
 */
function baseName(name: string): string {
  return name
    .split(',')[0]
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

/** The precon this deck belongs to, or null when its commander stands alone. */
export function groupOf(deck: Deck): string | null {
  const name = baseName(deck.commander.name);
  const found = Object.entries(GROUPS).find(([, members]) => members.includes(name));

  return found ? found[0] : null;
}

/** The candidates minus the ones whose physical deck is already in someone's hands. */
export function withoutGroupMates(
  candidates: readonly Deck[],
  taken: readonly Deck[],
): Deck[] {
  const takenGroups = new Set(taken.map(groupOf).filter((group) => group !== null));

  return candidates.filter((deck) => {
    const group = groupOf(deck);
    return group === null || !takenGroups.has(group);
  });
}

/**
 * One deck per group, drawn at random, in the place of the first member found.
 * A dry draw hands everything out at once, so collapsing up front is what keeps
 * two commanders of the same box out of the same table.
 */
export function collapseGroups(decks: readonly Deck[], rng: Rng): Deck[] {
  const chosen = new Map<string, Deck>();

  for (const group of Object.keys(GROUPS)) {
    const present = decks.filter((deck) => groupOf(deck) === group);
    if (present.length > 0) chosen.set(group, present[Math.floor(rng() * present.length)]);
  }

  const used = new Set<string>();

  return decks.flatMap((deck) => {
    const group = groupOf(deck);
    if (group === null) return [deck];
    if (used.has(group)) return [];

    used.add(group);
    return [chosen.get(group) as Deck];
  });
}
