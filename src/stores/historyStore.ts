import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../data/storage';
import { checkMatch } from '../domain/history/checkMatch';
import { checkSeason } from '../domain/history/seasons';
import { today } from '../domain/history/today';
import type { Id, LiveMatch, Match, MatchParticipant, Season } from '../domain/types';

export type MatchDraft = Omit<Match, 'id'>;
export type SeasonDraft = Omit<Season, 'id'>;

type HistoryState = {
  matches: Match[];
  seasons: Season[];
  liveMatch: LiveMatch | null;
  addMatch: (draft: MatchDraft) => void;
  updateMatch: (id: Id, draft: MatchDraft) => void;
  removeMatch: (id: Id) => void;
  addSeason: (draft: SeasonDraft) => void;
  updateSeason: (id: Id, draft: SeasonDraft) => void;
  removeSeason: (id: Id) => void;
  startLive: (participants: MatchParticipant[], benched: Id[]) => void;
  finishLive: (winnerPersonId: Id) => void;
  discardLive: () => void;
  replaceAll: (matches: Match[], seasons: Season[]) => void;
};

function assertValid(draft: MatchDraft): void {
  const reason = checkMatch(draft);
  if (reason) throw new Error(reason);
}

/** The season being edited is left out, or every edit would clash with itself. */
function assertValidSeason(draft: SeasonDraft, seasons: Season[], editingId?: Id): void {
  const reason = checkSeason(
    draft,
    seasons.filter((season) => season.id !== editingId),
  );
  if (reason) throw new Error(reason);
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      matches: [],
      seasons: [],
      liveMatch: null,

      addMatch: (draft) => {
        assertValid(draft);
        set((state) => ({ matches: [...state.matches, { ...draft, id: crypto.randomUUID() }] }));
      },

      updateMatch: (id, draft) => {
        assertValid(draft);
        set((state) => ({
          matches: state.matches.map((match) => (match.id === id ? { ...draft, id } : match)),
        }));
      },

      removeMatch: (id) =>
        set((state) => ({ matches: state.matches.filter((match) => match.id !== id) })),

      addSeason: (draft) => {
        assertValidSeason(draft, get().seasons);
        set((state) => ({ seasons: [...state.seasons, { ...draft, id: crypto.randomUUID() }] }));
      },

      updateSeason: (id, draft) => {
        assertValidSeason(draft, get().seasons, id);
        set((state) => ({
          seasons: state.seasons.map((season) => (season.id === id ? { ...draft, id } : season)),
        }));
      },

      removeSeason: (id) =>
        set((state) => ({ seasons: state.seasons.filter((season) => season.id !== id) })),

      startLive: (participants, benched) =>
        set({ liveMatch: { startedOn: today(), participants, benched } }),

      /**
       * Born through `addMatch` to inherit `checkMatch` instead of duplicating it.
       * When that throws, the draft stays: losing the night's match to a validation
       * error would be the worst possible outcome.
       */
      finishLive: (winnerPersonId) => {
        const live = get().liveMatch;
        if (!live) throw new Error('There is no live match to finish');

        get().addMatch({
          playedOn: live.startedOn,
          participants: live.participants,
          winnerPersonId,
        });
        set({ liveMatch: null });
      },

      discardLive: () => set({ liveMatch: null }),

      /** The draft is not part of a backup, so importing one leaves it alone. */
      replaceAll: (matches, seasons) => set({ matches, seasons }),
    }),
    { name: STORAGE_KEYS.history },
  ),
);
