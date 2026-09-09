import type { Match } from '../../domain/types';

export function makeMatch(override: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    playedOn: '2026-09-09',
    participants: [
      { personId: 'ana', deckId: 'ana-1' },
      { personId: 'bob', deckId: 'bob-1' },
    ],
    winnerPersonId: 'ana',
    ...override,
  };
}
