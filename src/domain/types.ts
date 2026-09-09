export type Id = string;

export type CardRef = {
  scryfallId: string;
  name: string;
  artCrop: string;
  normal: string;
  colorIdentity: string[];
};

export type Person = {
  id: Id;
  name: string;
  archived: boolean;
};

export type Deck = {
  id: Id;
  personId: Id;
  commander: CardRef;
  archived: boolean;
};

export type StickerDeck = {
  sheetIds: string[];
};

export type StickerDraw = {
  sheetIds: string[];
  drawnAt: string;
};

export type MatchParticipant = {
  personId: Id;
  deckId: Id;
};

export type Match = {
  id: Id;
  playedOn: string;
  participants: MatchParticipant[];
  winnerPersonId: Id;
};

/**
 * A match the table is playing right now: it has no winner yet, so it cannot be
 * a `Match`. Persisted so the draft survives the app closing, but never backed up.
 */
export type LiveMatch = {
  /** 'YYYY-MM-DD' — the day the draw happened, which is the day the match is recorded on. */
  startedOn: string;
  participants: MatchParticipant[];
  /** People at the table without a deck: they play, but there is no deck to record. */
  benched: Id[];
};

export type Sheet = {
  id: string;
  name: string;
  collectorNumber: string;
  image: string;
};

/** Uma consulta do leitor de carta estrangeira, já no idioma que o Scryfall devolveu. */
export type CardLookup = {
  /** "mh3/125" — set e número normalizados, é a identidade no cache. */
  key: string;
  set: string;
  collectorNumber: string;
  /** Idioma que de fato voltou: "pt" quando existe versão traduzida, o original quando não. */
  lang: string;
  printedName: string;
  /** Sempre em inglês: é por ele que se acha ruling e discussão online. */
  englishName: string;
  typeLine: string;
  text: string;
  image: string;
  fetchedAt: string;
};

/** A named date range; a match belongs to the season whose range contains its playedOn. */
export type Season = {
  id: Id;
  name: string;
  /** 'YYYY-MM-DD', inclusive. */
  startsOn: string;
  /** 'YYYY-MM-DD' inclusive, or null while the season is still open. */
  endsOn: string | null;
};
