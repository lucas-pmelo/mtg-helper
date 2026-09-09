import type { StickerDeck } from '../../domain/types';

export function makeStickerDeck(sheetCount = 10): StickerDeck {
  return {
    sheetIds: Array.from({ length: sheetCount }, (_, index) => `sheet-${index + 1}`),
  };
}
