import type { Id, Match, Person } from '../types';

export type Confrontation = {
  opponentId: Id;
  name: string;
  /** Tables both players sat at. */
  shared: number;
  /** Wins of the consulted player. */
  wins: number;
  opponentWins: number;
  /** Tables a third player won. */
  otherWins: number;
};

const played = (match: Match, personId: Id) =>
  match.participants.some((participant) => participant.personId === personId);

/** Every opponent the given player already shared a table with, most played first. */
export function computeHeadToHead(
  matches: readonly Match[],
  people: readonly Person[],
  personId: Id,
): Confrontation[] {
  const own = matches.filter((match) => played(match, personId));

  return people
    .filter((person) => person.id !== personId)
    .map((person) => {
      const shared = own.filter((match) => played(match, person.id));
      const wins = shared.filter((match) => match.winnerPersonId === personId).length;
      const opponentWins = shared.filter((match) => match.winnerPersonId === person.id).length;

      return {
        opponentId: person.id,
        name: person.name,
        shared: shared.length,
        wins,
        opponentWins,
        otherWins: shared.length - wins - opponentWins,
      };
    })
    .filter((confrontation) => confrontation.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.name.localeCompare(b.name));
}
