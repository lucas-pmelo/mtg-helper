/**
 * Fetches the 48 Unfinity (SUNF) sticker sheets from Scryfall and writes
 * src/data/sheets.json. Run once — the set is immutable data from 2022 and
 * the app never queries Scryfall for it at runtime.
 *
 *   npm run generate:sheets
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Sheet } from '../domain/types';

const SEARCH_URL = 'https://api.scryfall.com/cards/search?q=set%3Asunf&order=set';
const OUTPUT = fileURLToPath(new URL('../data/sheets.json', import.meta.url));
const REQUEST_INTERVAL_MS = 120;

type ScryfallCard = {
  id: string;
  name: string;
  collector_number: string;
  image_uris?: { png?: string };
};

type ScryfallPage = {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(url: string): Promise<ScryfallPage> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MTGHelper/1.0', Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Scryfall respondeu ${response.status} para ${url}`);
  }

  return response.json() as Promise<ScryfallPage>;
}

function toSheet(card: ScryfallCard): Sheet {
  const image = card.image_uris?.png;

  if (!image) {
    throw new Error(`A carta ${card.name} (${card.id}) veio sem image_uris.png`);
  }

  return {
    id: card.id,
    name: card.name,
    collectorNumber: card.collector_number,
    image,
  };
}

async function generate(): Promise<void> {
  const sheets: Sheet[] = [];
  let url: string | undefined = SEARCH_URL;

  while (url) {
    const page: ScryfallPage = await fetchPage(url);
    sheets.push(...page.data.map(toSheet));

    url = page.has_more ? page.next_page : undefined;
    if (url) await wait(REQUEST_INTERVAL_MS);
  }

  sheets.sort((a, b) => Number(a.collectorNumber) - Number(b.collectorNumber));

  await writeFile(OUTPUT, `${JSON.stringify(sheets, null, 2)}\n`, 'utf8');
  console.log(`${sheets.length} folhas gravadas em ${OUTPUT}`);
}

await generate();
