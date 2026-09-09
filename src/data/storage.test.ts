import { describe, expect, test } from 'vitest';
import { parseBackup, serializeBackup, type Backup } from './storage';
import { makeDeck } from '../tests/factories/make-deck';
import { makeMatch } from '../tests/factories/make-match';
import { makePerson } from '../tests/factories/make-person';

function makeBackup(override: Partial<Backup> = {}): Backup {
  return {
    version: 1,
    people: [makePerson()],
    decks: [makeDeck()],
    stickerDeck: { sheetIds: ['sheet-1'] },
    lastDraw: null,
    matches: [makeMatch()],
    ...override,
  };
}

describe('parseBackup', () => {
  test('should parse a backup produced by serializeBackup', () => {
    const backup = makeBackup();

    expect(parseBackup(serializeBackup(backup))).toEqual(backup);
  });

  test('should reject malformed json', () => {
    expect(() => parseBackup('{ not json')).toThrow('Arquivo inválido: não é um JSON válido');
  });

  test('should reject json that is not an object', () => {
    expect(() => parseBackup('[]')).toThrow('Arquivo inválido: formato desconhecido');
  });

  test('should reject a backup without the people list', () => {
    const { people: _people, ...withoutPeople } = makeBackup();

    expect(() => parseBackup(JSON.stringify(withoutPeople))).toThrow(
      'Arquivo inválido: formato desconhecido',
    );
  });

  test('should reject a backup with a broken sticker deck', () => {
    const broken = { ...makeBackup(), stickerDeck: { sheetIds: 'nope' } };

    expect(() => parseBackup(JSON.stringify(broken))).toThrow(
      'Arquivo inválido: formato desconhecido',
    );
  });

  test('should accept a backup with an empty history', () => {
    const empty = makeBackup({ people: [], decks: [], matches: [] });

    expect(parseBackup(serializeBackup(empty))).toEqual(empty);
  });
});
