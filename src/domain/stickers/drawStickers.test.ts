import { describe, expect, test } from 'vitest';
import { DECK_SIZE, DRAW_SIZE, drawStickers } from './drawStickers';
import { makeStickerDeck } from '../../tests/factories/make-sticker-deck';
import { seededRng } from '../../tests/rng';

describe('drawStickers', () => {
  test('should draw exactly three sheets', () => {
    const draw = drawStickers(makeStickerDeck(), seededRng(1));

    expect(draw.sheetIds).toHaveLength(DRAW_SIZE);
  });

  test('should draw only sheets that belong to the deck', () => {
    const deck = makeStickerDeck();
    const rng = seededRng(2);

    for (let round = 0; round < 300; round++) {
      const draw = drawStickers(deck, rng);

      for (const sheetId of draw.sheetIds) {
        expect(deck.sheetIds).toContain(sheetId);
      }
    }
  });

  test('should never repeat a sheet within a draw', () => {
    const rng = seededRng(3);

    for (let round = 0; round < 300; round++) {
      const draw = drawStickers(makeStickerDeck(), rng);

      expect(new Set(draw.sheetIds).size).toBe(DRAW_SIZE);
    }
  });

  test('should be able to draw every sheet of the deck across many draws', () => {
    const deck = makeStickerDeck();
    const rng = seededRng(4);
    const seen = new Set<string>();

    for (let round = 0; round < 300; round++) {
      for (const sheetId of drawStickers(deck, rng).sheetIds) seen.add(sheetId);
    }

    expect(seen.size).toBe(DECK_SIZE);
  });

  test('should stamp the draw with the moment it happened', () => {
    const before = Date.now();

    const draw = drawStickers(makeStickerDeck(), seededRng(5));

    const drawnAt = Date.parse(draw.drawnAt);
    expect(Number.isNaN(drawnAt)).toBe(false);
    expect(drawnAt).toBeGreaterThanOrEqual(before);
  });

  test('should throw when the deck has fewer than ten sheets', () => {
    expect(() => drawStickers(makeStickerDeck(9), seededRng(1))).toThrow(
      'O sticker deck precisa de exatamente 10 folhas (9/10)',
    );
  });

  test('should throw when the deck has more than ten sheets', () => {
    expect(() => drawStickers(makeStickerDeck(11), seededRng(1))).toThrow(
      'O sticker deck precisa de exatamente 10 folhas (11/10)',
    );
  });
});
