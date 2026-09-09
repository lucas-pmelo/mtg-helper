import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../data/storage';
import { checkMatch } from '../domain/history/checkMatch';
import type { Id, Match } from '../domain/types';

export type MatchDraft = Omit<Match, 'id'>;

type HistoryState = {
  matches: Match[];
  addMatch: (draft: MatchDraft) => void;
  updateMatch: (id: Id, draft: MatchDraft) => void;
  removeMatch: (id: Id) => void;
  replaceAll: (matches: Match[]) => void;
};

function assertValid(draft: MatchDraft): void {
  const reason = checkMatch(draft);
  if (reason) throw new Error(reason);
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      matches: [],

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

      replaceAll: (matches) => set({ matches }),
    }),
    { name: STORAGE_KEYS.history },
  ),
);
