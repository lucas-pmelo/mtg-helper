import { groupOf } from '../commanders/deckGroups';
import type { Deck, Match } from '../types';

const MIN_PARTICIPANTS = 2;

/** True when two participants are holding what is physically the same deck. */
function sharesADeck(deckIds: readonly string[], decks: readonly Deck[]): boolean {
  const groups = deckIds
    .map((deckId) => decks.find((deck) => deck.id === deckId))
    .filter((deck) => deck !== undefined)
    .map(groupOf)
    .filter((group) => group !== null);

  return new Set(groups).size !== groups.length;
}

/**
 * Reason the match cannot be saved, or null when it can.
 * Anyone may play anyone's deck; what cannot happen is the same deck on the
 * table twice, so `decks` is what tells apart two commanders of one precon.
 */
export function checkMatch(
  match: Pick<Match, 'participants' | 'winnerPersonId'>,
  decks: readonly Deck[] = [],
): string | null {
  const { participants, winnerPersonId } = match;

  if (participants.length < MIN_PARTICIPANTS) {
    return `Registre ao menos ${MIN_PARTICIPANTS} participantes`;
  }

  const uniquePeople = new Set(participants.map((participant) => participant.personId));
  if (uniquePeople.size !== participants.length) {
    return 'Cada jogador só pode aparecer uma vez na partida';
  }

  if (participants.some((participant) => !participant.deckId)) {
    return 'Escolha um deck para cada participante';
  }

  const deckIds = participants.map((participant) => participant.deckId);
  if (new Set(deckIds).size !== deckIds.length) {
    return 'Cada deck só pode aparecer uma vez na partida';
  }

  if (sharesADeck(deckIds, decks)) {
    return 'Os comandantes do mesmo precon são um deck só: escolha outro';
  }

  if (!uniquePeople.has(winnerPersonId)) {
    return 'O vencedor precisa ser um dos participantes';
  }

  return null;
}
