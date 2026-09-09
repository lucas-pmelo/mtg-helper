import type { Deck, Match, Person, StickerDeck, StickerDraw } from '../domain/types';

export const STORAGE_KEYS = {
  people: 'mtg-helper:people',
  stickers: 'mtg-helper:stickers',
  history: 'mtg-helper:history',
} as const;

export const BACKUP_VERSION = 1;

export type Backup = {
  version: number;
  people: Person[];
  decks: Deck[];
  stickerDeck: StickerDeck;
  lastDraw: StickerDraw | null;
  matches: Match[];
};

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

function hasBackupShape(value: unknown): value is Backup {
  const backup = value as Partial<Backup>;

  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray(backup.people) &&
    Array.isArray(backup.decks) &&
    Array.isArray(backup.matches) &&
    typeof backup.stickerDeck === 'object' &&
    backup.stickerDeck !== null &&
    Array.isArray(backup.stickerDeck.sheetIds)
  );
}

/** Throws with a message the settings screen shows; the current state is left untouched. */
export function parseBackup(json: string): Backup {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido');
  }

  if (!hasBackupShape(parsed)) {
    throw new Error('Arquivo inválido: formato desconhecido');
  }

  return parsed;
}
