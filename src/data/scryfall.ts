import { cardKey, normalizeCode } from '../domain/cards/cardCache';
import type { SetSize } from '../domain/cards/setSizes';
import type { CardLookup, CardRef } from '../domain/types';

const API = 'https://api.scryfall.com';

/** The screen shows this verbatim; keep it in one place so tests and UI agree. */
export const SCRYFALL_DOWN = 'Não foi possível falar com o Scryfall';

/** The language the reader asks for. The screen compares against it to warn. */
export const PREFERRED_LANG = 'pt';

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

/** `/cards/{set}/{n}/{lang}`: the `printed_*` fields only come on translated printings. */
type ScryfallPrinting = ScryfallCard & {
  lang: string;
  printed_name?: string;
  printed_type_line?: string;
  printed_text?: string;
  type_line?: string;
  oracle_text?: string;
};

/** Double faced cards carry their images on the front face, not on the card. */
function frontImages(card: ScryfallCard): ScryfallImages | undefined {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris;
}

export function toCardRef(card: ScryfallCard): CardRef {
  const images = frontImages(card);

  return {
    scryfallId: card.id,
    name: card.name,
    artCrop: images?.art_crop ?? '',
    normal: images?.normal ?? '',
    colorIdentity: card.color_identity,
  };
}

/**
 * A 404 comes back as `null`: that is the difference between "no printing in
 * this language" (expected, has a fallback) and "Scryfall is down".
 */
async function getOrNull<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const response = await fetch(`${API}${path}`, { headers: HEADERS, signal });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(SCRYFALL_DOWN);

  return response.json() as Promise<T>;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const found = await getOrNull<T>(path, signal);
  if (found === null) throw new Error(SCRYFALL_DOWN);

  return found;
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

function toCardLookup(
  printing: ScryfallPrinting,
  set: string,
  collectorNumber: string,
): CardLookup {
  return {
    key: cardKey(set, collectorNumber),
    set,
    collectorNumber,
    lang: printing.lang,
    printedName: printing.printed_name ?? printing.name,
    englishName: printing.name,
    typeLine: printing.printed_type_line ?? printing.type_line ?? '',
    text: printing.printed_text ?? printing.oracle_text ?? '',
    image: frontImages(printing)?.normal ?? '',
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * The card footer carries set and number in latin characters even on Japanese
 * printings: those two fields are enough to find the Portuguese version. With
 * no Portuguese printing, fall back to the original language — reading English
 * already unblocks the table.
 */
export async function fetchPrintedCard(
  rawSet: string,
  rawCollectorNumber: string,
  signal?: AbortSignal,
): Promise<CardLookup> {
  const set = normalizeCode(rawSet);
  const collectorNumber = normalizeCode(rawCollectorNumber);
  const path = `/cards/${encodeURIComponent(set)}/${encodeURIComponent(collectorNumber)}`;

  const printing =
    (await getOrNull<ScryfallPrinting>(`${path}/${PREFERRED_LANG}`, signal)) ??
    (await getOrNull<ScryfallPrinting>(path, signal));

  if (!printing) {
    throw new Error(
      `Não achei a carta ${set.toUpperCase()} ${collectorNumber}. Confira o código no rodapé.`,
    );
  }

  return toCardLookup(printing, set, collectorNumber);
}

/** A search result: unlike `/cards/named`, it always says where the printing is. */
type ScryfallPrint = ScryfallCard & {
  set: string;
  collector_number: string;
};

type ScryfallSet = {
  code: string;
  card_count: number;
  released_at: string;
};

/** A printing found by the footer alone, before the table says which one it is. */
export type CardCandidate = {
  set: string;
  collectorNumber: string;
  name: string;
  image: string;
};

/** The whole set list, kept down to what a footer total can be matched against. */
export async function fetchSetSizes(signal?: AbortSignal): Promise<SetSize[]> {
  const { data } = await get<{ data: ScryfallSet[] }>('/sets', signal);

  return data.map((set) => ({
    code: set.code,
    cardCount: set.card_count,
    releasedAt: set.released_at,
  }));
}

/**
 * Cards sitting at `collectorNumber` in any of those sets — one query, because
 * a footer like `95/143` matches a handful of sets and each holds one card at 95.
 */
export async function searchPrintings(
  collectorNumber: string,
  setCodes: readonly string[],
  signal?: AbortSignal,
): Promise<CardCandidate[]> {
  if (setCodes.length === 0) return [];

  const query = `cn:${normalizeCode(collectorNumber)} (${setCodes.map((code) => `e:${code}`).join(' or ')})`;
  const found = await getOrNull<{ data: ScryfallPrint[] }>(
    `/cards/search?q=${encodeURIComponent(query)}&unique=prints&order=released`,
    signal,
  );

  if (!found) return [];

  return found.data.map((card) => ({
    set: card.set,
    collectorNumber: card.collector_number,
    name: card.name,
    image: frontImages(card)?.normal ?? '',
  }));
}
