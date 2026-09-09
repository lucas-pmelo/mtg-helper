import { beforeEach, describe, expect, test } from 'vitest';
import { DECK_SIZE, DRAW_SIZE } from '../domain/stickers/drawStickers';
import { useStickerStore } from './stickerStore';

const sheetId = (index: number) => `sheet-${index}`;
const fullDeck = Array.from({ length: DECK_SIZE }, (_, index) => sheetId(index));

describe('useStickerStore', () => {
  beforeEach(() => {
    useStickerStore.setState({ sheetIds: [], lastDraw: null });
  });

  test('should add a sheet that is not in the deck yet', () => {
    useStickerStore.getState().toggleSheet('sheet-a');

    expect(useStickerStore.getState().sheetIds).toEqual(['sheet-a']);
  });

  test('should remove a sheet that is already in the deck', () => {
    useStickerStore.getState().toggleSheet('sheet-a');
    useStickerStore.getState().toggleSheet('sheet-a');

    expect(useStickerStore.getState().sheetIds).toEqual([]);
  });

  test('should ignore a new sheet once the deck is full', () => {
    for (const id of fullDeck) useStickerStore.getState().toggleSheet(id);

    useStickerStore.getState().toggleSheet('one-too-many');

    expect(useStickerStore.getState().sheetIds).toEqual(fullDeck);
  });

  test('should still remove a sheet when the deck is full', () => {
    for (const id of fullDeck) useStickerStore.getState().toggleSheet(id);

    useStickerStore.getState().toggleSheet(sheetId(0));

    expect(useStickerStore.getState().sheetIds).toHaveLength(DECK_SIZE - 1);
  });

  test('should persist the draw so reopening the app shows the same sheets', () => {
    useStickerStore.setState({ sheetIds: fullDeck });

    useStickerStore.getState().draw();
    const firstDraw = useStickerStore.getState().lastDraw;

    expect(firstDraw?.sheetIds).toHaveLength(DRAW_SIZE);
    expect(useStickerStore.getState().lastDraw).toBe(firstDraw);
  });

  test('should replace the deck and the draw when a backup is imported', () => {
    useStickerStore.setState({ sheetIds: fullDeck });
    useStickerStore.getState().draw();

    useStickerStore.getState().replaceAll(['sheet-x'], null);

    expect(useStickerStore.getState().sheetIds).toEqual(['sheet-x']);
    expect(useStickerStore.getState().lastDraw).toBeNull();
  });

  test('should refuse to draw with an incomplete deck', () => {
    useStickerStore.setState({ sheetIds: ['sheet-a'] });

    expect(() => useStickerStore.getState().draw()).toThrow(
      'O sticker deck precisa de exatamente 10 folhas',
    );
    expect(useStickerStore.getState().lastDraw).toBeNull();
  });
});
