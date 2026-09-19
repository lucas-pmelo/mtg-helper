import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../data/storage';
import { rememberCard } from '../domain/cards/cardCache';
import type { SetSize } from '../domain/cards/setSizes';
import type { CardLookup } from '../domain/types';

type CardState = {
  recent: CardLookup[];
  /** Every set reduced to its size: it is what turns a `95/143` footer into a card. */
  setSizes: SetSize[];
  /** ISO instant of the last set list download, or null when there was none. */
  setsFetchedAt: string | null;
  remember: (card: CardLookup) => void;
  rememberSets: (sizes: SetSize[]) => void;
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
      setSizes: [],
      setsFetchedAt: null,

      remember: (card) => set((state) => ({ recent: rememberCard(state.recent, card) })),

      rememberSets: (sizes) => set({ setSizes: sizes, setsFetchedAt: new Date().toISOString() }),

      clear: () => set({ recent: [], setSizes: [], setsFetchedAt: null }),
    }),
    { name: STORAGE_KEYS.cards },
  ),
);
