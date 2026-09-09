import type { Deck, Id, Match } from '../types';

/**
 * The last day the person actually played, or null when they never did.
 * Matches from `today` are the session in progress: they are not "the last one".
 */
export function lastPlayedDay(
  matches: readonly Match[],
  personId: Id,
  today: string,
): string | null {
  const days = matches
    .filter(
      (match) =>
        match.playedOn < today &&
        match.participants.some((participant) => participant.personId === personId),
    )
    .map((match) => match.playedOn);

  return days.length === 0 ? null : days.reduce((latest, day) => (day > latest ? day : latest));
}

/** True when the person already used this deck on their last played day. */
export function isRepeat(
  matches: readonly Match[],
  personId: Id,
  deckId: Id,
  today: string,
): boolean {
  const day = lastPlayedDay(matches, personId, today);

  return matches.some(
    (match) =>
      match.playedOn === day &&
      match.participants.some(
        (participant) => participant.personId === personId && participant.deckId === deckId,
      ),
  );
}

/**
 * The person's active decks, minus the ones they used on their last played day.
 * Falls back to every active deck when the filter leaves nothing: someone with a
 * single deck keeps playing.
 */
export function eligibleDecks(
  decks: readonly Deck[],
  matches: readonly Match[],
  personId: Id,
  today: string,
): Deck[] {
  const active = decks.filter((deck) => !deck.archived && deck.personId === personId);
  const fresh = active.filter((deck) => !isRepeat(matches, personId, deck.id, today));

  return fresh.length > 0 ? fresh : active;
}
