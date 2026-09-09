import { describe, expect, test } from 'vitest';
import { parseBackup, serializeBackup, type Backup } from './storage';
import { useHistoryStore } from '../stores/historyStore';
import { makeDeck } from '../tests/factories/make-deck';
import { makeLiveMatch } from '../tests/factories/make-live-match';
import { makeMatch } from '../tests/factories/make-match';
import { makePerson } from '../tests/factories/make-person';
import { makeSeason } from '../tests/factories/make-season';

function makeBackup(override: Partial<Backup> = {}): Backup {
  return {
    version: 1,
    people: [makePerson()],
    decks: [makeDeck()],
    stickerDeck: { sheetIds: ['sheet-1'] },
    lastDraw: null,
    matches: [makeMatch()],
    seasons: [makeSeason()],
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

  test('should reject a backup with a broken season list', () => {
    const broken = { ...makeBackup(), seasons: 'nope' };

    expect(() => parseBackup(JSON.stringify(broken))).toThrow(
      'Arquivo inválido: formato desconhecido',
    );
  });

  test('should import a backup written before seasons existed as an empty season list', () => {
    const { seasons: _seasons, ...old } = makeBackup();

    expect(parseBackup(JSON.stringify(old))).toEqual({ ...old, seasons: [] });
  });

  test('should accept a backup with an empty history', () => {
    const empty = makeBackup({ people: [], decks: [], matches: [], seasons: [] });

    expect(parseBackup(serializeBackup(empty))).toEqual(empty);
  });
});

/**
 * The draft of the night is ephemeral: restored weeks later on another phone it
 * would only confuse the table. It is persisted, but never exported.
 */
describe('the live match and the backup', () => {
  test('should leave the live match out of the serialized backup', () => {
    useHistoryStore.setState({ matches: [makeMatch()], seasons: [], liveMatch: makeLiveMatch() });
    const { matches, seasons } = useHistoryStore.getState();

    const json = serializeBackup(makeBackup({ matches, seasons }));

    expect(JSON.parse(json)).not.toHaveProperty('liveMatch');
    expect(json).not.toContain('startedOn');
  });

  test('should keep the live match when a backup is imported', () => {
    const live = makeLiveMatch();
    useHistoryStore.setState({ matches: [makeMatch()], seasons: [], liveMatch: live });
    const backup = parseBackup(serializeBackup(makeBackup({ matches: [], seasons: [] })));

    useHistoryStore.getState().replaceAll(backup.matches, backup.seasons);

    expect(useHistoryStore.getState().matches).toEqual([]);
    expect(useHistoryStore.getState().liveMatch).toEqual(live);
  });
});
