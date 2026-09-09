import type { Rng } from '../rng';
import type { Deck, Id, Match } from '../types';

/**
 * Laplace smoothing with a 0.5 prior. It buys three properties the raw win rate
 * lacks: a deck that won its only match keeps a third of its chance instead of
 * being banned, no weight ever reaches 0 or 1, and a deck that never played sits
 * exactly at the neutral 0.5. Best against worst tops out around 2:1 —
 * noticeable, not brutal.
 */
const PRIOR_WINS = 1;
const PRIOR_PLAYED = 2;

function weightOf(deck: Deck, matches: readonly Match[]): number {
  let wins = 0;
  let played = 0;

  for (const match of matches) {
    const participant = match.participants.find((one) => one.deckId === deck.id);
    if (!participant) continue;

    played++;
    if (participant.personId === match.winnerPersonId) wins++;
  }

  return 1 - (wins + PRIOR_WINS) / (played + PRIOR_PLAYED);
}

/** How likely each deck is to come out: the worse its record, the heavier it weighs. */
export function weightsFor(decks: readonly Deck[], matches: readonly Match[]): Map<Id, number> {
  return new Map(decks.map((deck) => [deck.id, weightOf(deck, matches)]));
}

/**
 * Up to `count` distinct deck ids, each drawn with probability proportional to
 * its handicap weight. Fewer than `count` when there are not enough decks.
 */
export function pickWeighted(
  decks: readonly Deck[],
  matches: readonly Match[],
  count: number,
  rng: Rng,
): Id[] {
  const remaining = [...weightsFor(decks, matches)].map(([id, weight]) => ({ id, weight }));
  const picked: Id[] = [];

  while (picked.length < count && remaining.length > 0) {
    const total = remaining.reduce((sum, entry) => sum + entry.weight, 0);
    let target = rng() * total;
    let index = 0;

    // Walks the cumulative weights; the last entry absorbs float rounding.
    while (index < remaining.length - 1 && target >= remaining[index].weight) {
      target -= remaining[index].weight;
      index++;
    }

    picked.push(remaining.splice(index, 1)[0].id);
  }

  return picked;
}
