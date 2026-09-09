import type { Match } from '../types';

const MIN_PARTICIPANTS = 2;

/** Reason the match cannot be saved, or null when it can. */
export function checkMatch(match: Pick<Match, 'participants' | 'winnerPersonId'>): string | null {
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

  if (!uniquePeople.has(winnerPersonId)) {
    return 'O vencedor precisa ser um dos participantes';
  }

  return null;
}
