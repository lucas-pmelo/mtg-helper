import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../data/storage';
import { DECK_SIZE, drawStickers } from '../domain/stickers/drawStickers';
import { defaultRng } from '../domain/rng';
import type { StickerDraw } from '../domain/types';

type StickerState = {
  sheetIds: string[];
  lastDraw: StickerDraw | null;
  toggleSheet: (sheetId: string) => void;
  draw: () => void;
  replaceAll: (sheetIds: string[], lastDraw: StickerDraw | null) => void;
};

export const useStickerStore = create<StickerState>()(
  persist(
    (set, get) => ({
      sheetIds: [],
      lastDraw: null,

      // The deck holds exactly DECK_SIZE sheets, so taps past the tenth are ignored.
      toggleSheet: (sheetId) =>
        set((state) => {
          if (state.sheetIds.includes(sheetId)) {
            return { sheetIds: state.sheetIds.filter((id) => id !== sheetId) };
          }

          if (state.sheetIds.length === DECK_SIZE) return state;

          return { sheetIds: [...state.sheetIds, sheetId] };
        }),

      draw: () => set({ lastDraw: drawStickers({ sheetIds: get().sheetIds }, defaultRng) }),

      replaceAll: (sheetIds, lastDraw) => set({ sheetIds, lastDraw }),
    }),
    { name: STORAGE_KEYS.stickers },
  ),
);
