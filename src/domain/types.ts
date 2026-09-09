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
