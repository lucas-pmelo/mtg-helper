import type { CardRef } from '../domain/types';

const API = 'https://api.scryfall.com';

const HEADERS = {
  'User-Agent': 'MTGHelper/1.0',
  Accept: 'application/json',
};

type ScryfallImages = {
  art_crop?: string;
  normal?: string;
};

export type ScryfallCard = {
  id: string;
  name: string;
  color_identity: string[];
  image_uris?: ScryfallImages;
  card_faces?: { image_uris?: ScryfallImages }[];
};

/** Double faced commanders carry their images on the front face, not on the card. */
export function toCardRef(card: ScryfallCard): CardRef {
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris;

  return {
    scryfallId: card.id,
    name: card.name,
    artCrop: images?.art_crop ?? '',
    normal: images?.normal ?? '',
    colorIdentity: card.color_identity,
  };
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: HEADERS, signal });

  if (!response.ok) {
    throw new Error('Não foi possível falar com o Scryfall');
  }

  return response.json() as Promise<T>;
}

export async function autocompleteCardNames(term: string, signal?: AbortSignal): Promise<string[]> {
  const { data } = await get<{ data: string[] }>(
    `/cards/autocomplete?q=${encodeURIComponent(term)}`,
    signal,
  );

  return data;
}

export async function fetchCardByName(name: string, signal?: AbortSignal): Promise<CardRef> {
  const card = await get<ScryfallCard>(`/cards/named?exact=${encodeURIComponent(name)}`, signal);

  return toCardRef(card);
}
