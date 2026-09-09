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
