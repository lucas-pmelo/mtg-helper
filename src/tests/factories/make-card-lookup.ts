import type { CardLookup } from '../../domain/types';

export function makeCardLookup(override: Partial<CardLookup> = {}): CardLookup {
  return {
    key: 'mh3/125',
    set: 'mh3',
    collectorNumber: '125',
    lang: 'pt',
    printedName: 'Capturador Infernal',
    englishName: 'Fell the Profane',
    typeLine: 'Criatura — Demônio',
    text: 'Aproveitar (Quando esta criatura entra, você pode sacrificá-la.)',
    image: 'https://cards.scryfall.io/normal/mh3-125.jpg',
    fetchedAt: '2026-09-09T12:00:00.000Z',
    ...override,
  };
}
