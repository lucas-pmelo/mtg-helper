import type { LiveMatch } from '../../domain/types';

export function makeLiveMatch(override: Partial<LiveMatch> = {}): LiveMatch {
  return {
    startedOn: '2026-09-09',
    participants: [
      { personId: 'ana', deckId: 'ana-1' },
      { personId: 'bob', deckId: 'bob-1' },
    ],
    benched: [],
    ...override,
  };
}
