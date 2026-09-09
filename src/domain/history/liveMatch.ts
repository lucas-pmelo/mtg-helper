import type { CommanderAssignment } from '../commanders/drawCommanders';
import type { Id, LiveMatch, MatchParticipant } from '../types';

const MIN_PARTICIPANTS = 2;

/**
 * The draw may seat a player with no deck; `checkMatch` demands one for every
 * participant. Rather than loosening the domain, that player stays out of the record.
 */
export function toParticipants(
  assignments: readonly CommanderAssignment[],
): MatchParticipant[] {
  return assignments.flatMap((assignment) =>
    assignment.deckId === null
      ? []
      : [{ personId: assignment.personId, deckId: assignment.deckId }],
  );
}

/** Who was drawn without a deck, so the bar can say why they are missing. */
export function benched(assignments: readonly CommanderAssignment[]): Id[] {
  return assignments
    .filter((assignment) => assignment.deckId === null)
    .map((assignment) => assignment.personId);
}

/** Reason the draw cannot open a match, or null when it can. */
export function checkLiveStart(assignments: readonly CommanderAssignment[]): string | null {
  if (toParticipants(assignments).length < MIN_PARTICIPANTS) {
    return `Ao menos ${MIN_PARTICIPANTS} jogadores precisam de deck para registrar a partida`;
  }

  return null;
}

/** A draft left over from another day: the bar has to say which day it was. */
export function isStale(live: LiveMatch, today: string): boolean {
  return live.startedOn !== today;
}
