import type { CardRef, Deck } from '../../domain/types';

export function makeCardRef(override: Partial<CardRef> = {}): CardRef {
  return {
    scryfallId: 'card-1',
    name: 'Atraxa, Praetors Voice',
    artCrop: 'https://cards.scryfall.io/art_crop/card-1.jpg',
    normal: 'https://cards.scryfall.io/normal/card-1.jpg',
    colorIdentity: ['W', 'U', 'B', 'G'],
    ...override,
  };
}

export function makeDeck(override: Partial<Deck> = {}): Deck {
  return {
    id: 'deck-1',
    personId: 'person-1',
    commander: makeCardRef(),
    archived: false,
    ...override,
  };
}
