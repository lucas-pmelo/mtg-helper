import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../data/storage';
import { rememberCard } from '../domain/cards/cardCache';
import type { CardLookup } from '../domain/types';

type CardState = {
  recent: CardLookup[];
  remember: (card: CardLookup) => void;
  clear: () => void;
};

/**
 * Storage only: the fetch lives in the screen, as in `CardAutocomplete`. The
 * cache stays out of the backup — it is disposable and re-fetchable.
 */
export const useCardStore = create<CardState>()(
  persist(
    (set) => ({
      recent: [],

      remember: (card) => set((state) => ({ recent: rememberCard(state.recent, card) })),

      clear: () => set({ recent: [] }),
    }),
    { name: STORAGE_KEYS.cards },
  ),
);
