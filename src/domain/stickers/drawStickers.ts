import { shuffle, type Rng } from '../rng';
import type { StickerDeck, StickerDraw } from '../types';

export const DECK_SIZE = 10;
export const DRAW_SIZE = 3;

export function drawStickers(deck: StickerDeck, rng: Rng): StickerDraw {
  if (deck.sheetIds.length !== DECK_SIZE) {
    throw new Error(
      `O sticker deck precisa de exatamente ${DECK_SIZE} folhas (${deck.sheetIds.length}/${DECK_SIZE})`,
    );
  }

  return {
    sheetIds: shuffle(deck.sheetIds, rng).slice(0, DRAW_SIZE),
    drawnAt: new Date().toISOString(),
  };
}
