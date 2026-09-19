import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  autocompleteCardNames,
  fetchCardByName,
  fetchPrintedCard,
  fetchSetSizes,
  searchPrintings,
  toCardRef,
} from './scryfall';

/**
 * A fixed `body` answers any URL. Passing a function answers per URL: returning
 * `undefined` is the 404 the language fallback has to tell apart.
 */
function stubFetch(body: unknown | ((url: string) => unknown), ok = true) {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    if (typeof body !== 'function') {
      return { ok, status: ok ? 200 : 500, json: async () => body } as unknown as Response;
    }

    const found = (body as (url: string) => unknown)(url);

    return {
      ok: found !== undefined,
      status: found === undefined ? 404 : 200,
      json: async () => found,
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const PT_CARD = {
  id: 'fell-id',
  name: 'Fell the Profane',
  lang: 'pt',
  color_identity: ['B'],
  printed_name: 'Capturador Infernal',
  printed_type_line: 'Criatura — Horror',
  printed_text: 'Aproveitar (Quando esta criatura entra...)',
  type_line: 'Creature — Horror',
  oracle_text: 'Harvest',
  image_uris: { normal: 'https://cards.scryfall.io/normal/pt.jpg' },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toCardRef', () => {
  test('should map a single faced card', () => {
    const card = {
      id: 'atraxa-id',
      name: 'Atraxa, Praetors Voice',
      color_identity: ['W', 'U', 'B', 'G'],
      image_uris: {
        art_crop: 'https://cards.scryfall.io/art_crop/atraxa.jpg',
        normal: 'https://cards.scryfall.io/normal/atraxa.jpg',
      },
    };

    expect(toCardRef(card)).toEqual({
      scryfallId: 'atraxa-id',
      name: 'Atraxa, Praetors Voice',
      artCrop: 'https://cards.scryfall.io/art_crop/atraxa.jpg',
      normal: 'https://cards.scryfall.io/normal/atraxa.jpg',
      colorIdentity: ['W', 'U', 'B', 'G'],
    });
  });

  test('should use the front face images of a double faced card', () => {
    const card = {
      id: 'jekk-id',
      name: 'Jekk, Bounty Hunter // Jekk, Ghost Hunter',
      color_identity: ['R', 'W'],
      card_faces: [
        {
          image_uris: {
            art_crop: 'https://cards.scryfall.io/art_crop/front.jpg',
            normal: 'https://cards.scryfall.io/normal/front.jpg',
          },
        },
        {
          image_uris: {
            art_crop: 'https://cards.scryfall.io/art_crop/back.jpg',
            normal: 'https://cards.scryfall.io/normal/back.jpg',
          },
        },
      ],
    };

    expect(toCardRef(card)).toMatchObject({
      artCrop: 'https://cards.scryfall.io/art_crop/front.jpg',
      normal: 'https://cards.scryfall.io/normal/front.jpg',
    });
  });

  test('should fall back to empty images so the card still renders by name', () => {
    const card = { id: 'no-art', name: 'Sem Arte', color_identity: [] };

    expect(toCardRef(card)).toEqual({
      scryfallId: 'no-art',
      name: 'Sem Arte',
      artCrop: '',
      normal: '',
      colorIdentity: [],
    });
  });
});

describe('autocompleteCardNames', () => {
  test('should ask Scryfall for the typed term and return the suggestions', async () => {
    const fetchMock = stubFetch({ data: ['Atraxa, Praetors Voice'] });

    const names = await autocompleteCardNames('atra');

    expect(names).toEqual(['Atraxa, Praetors Voice']);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.scryfall.com/cards/autocomplete?q=atra',
      expect.objectContaining({
        headers: { 'User-Agent': 'MTGHelper/1.0', Accept: 'application/json' },
      }),
    );
  });

  test('should escape a term with spaces and commas', async () => {
    const fetchMock = stubFetch({ data: [] });

    await autocompleteCardNames('atraxa, praetors');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.scryfall.com/cards/autocomplete?q=atraxa%2C%20praetors',
    );
  });

  test('should report a friendly error when Scryfall is unavailable', async () => {
    stubFetch({}, false);

    await expect(autocompleteCardNames('atra')).rejects.toThrow(
      'Não foi possível falar com o Scryfall',
    );
  });
});

describe('fetchCardByName', () => {
  test('should fetch the exact card and map it to a CardRef', async () => {
    const fetchMock = stubFetch({
      id: 'atraxa-id',
      name: 'Atraxa, Praetors Voice',
      color_identity: ['W', 'U', 'B', 'G'],
      image_uris: { art_crop: 'art.jpg', normal: 'normal.jpg' },
    });

    const card = await fetchCardByName('Atraxa, Praetors Voice');

    expect(card).toMatchObject({ scryfallId: 'atraxa-id', normal: 'normal.jpg' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.scryfall.com/cards/named?exact=Atraxa%2C%20Praetors%20Voice',
    );
  });

  test('should reject when the exact name matches no card', async () => {
    stubFetch(() => undefined);

    await expect(fetchCardByName('Carta Que Nao Existe')).rejects.toThrow(
      'Não foi possível falar com o Scryfall',
    );
  });
});

describe('fetchPrintedCard', () => {
  test('should read the portuguese printing when it exists', async () => {
    const fetchMock = stubFetch((url: string) =>
      url === 'https://api.scryfall.com/cards/mh3/125/pt' ? PT_CARD : undefined,
    );

    const card = await fetchPrintedCard('MH3', '125');

    expect(card).toMatchObject({
      key: 'mh3/125',
      set: 'mh3',
      collectorNumber: '125',
      lang: 'pt',
      printedName: 'Capturador Infernal',
      englishName: 'Fell the Profane',
      typeLine: 'Criatura — Horror',
      text: 'Aproveitar (Quando esta criatura entra...)',
      image: 'https://cards.scryfall.io/normal/pt.jpg',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('should date the lookup so the recent list can be ordered', async () => {
    stubFetch(() => PT_CARD);

    const card = await fetchPrintedCard('mh3', '125');

    expect(Number.isNaN(Date.parse(card.fetchedAt))).toBe(false);
  });

  test('should fall back to the original language when there is no portuguese printing', async () => {
    const fetchMock = stubFetch((url: string) =>
      url === 'https://api.scryfall.com/cards/neo/33'
        ? {
            id: 'repel-id',
            name: 'Repel the Vile',
            lang: 'ja',
            color_identity: ['W'],
            printed_name: '穢れの一掃',
            type_line: 'Instant',
            oracle_text: 'Destroy target creature.',
            image_uris: { normal: 'https://cards.scryfall.io/normal/ja.jpg' },
          }
        : undefined,
    );

    const card = await fetchPrintedCard('neo', '33');

    expect(card).toMatchObject({
      lang: 'ja',
      printedName: '穢れの一掃',
      englishName: 'Repel the Vile',
      typeLine: 'Instant',
      text: 'Destroy target creature.',
    });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://api.scryfall.com/cards/neo/33/pt',
      'https://api.scryfall.com/cards/neo/33',
    ]);
  });

  test('should name the code the player typed when the card exists in no language', async () => {
    stubFetch(() => undefined);

    await expect(fetchPrintedCard('mh3', '999')).rejects.toThrow(
      'Não achei a carta MH3 999. Confira o código no rodapé.',
    );
  });

  test('should report a Scryfall outage instead of pretending the card is missing', async () => {
    stubFetch({}, false);

    await expect(fetchPrintedCard('mh3', '125')).rejects.toThrow(
      'Não foi possível falar com o Scryfall',
    );
  });

  test('should use the front face image of a double faced card', async () => {
    stubFetch(() => ({
      id: 'dfc-id',
      name: 'Front // Back',
      lang: 'pt',
      color_identity: ['R'],
      card_faces: [
        { image_uris: { normal: 'https://cards.scryfall.io/normal/front.jpg' } },
        { image_uris: { normal: 'https://cards.scryfall.io/normal/back.jpg' } },
      ],
    }));

    const card = await fetchPrintedCard('mh3', '125');

    expect(card.image).toBe('https://cards.scryfall.io/normal/front.jpg');
  });

  test('should fall back to the english fields when the printing has no printed ones', async () => {
    stubFetch(() => ({
      id: 'plain-id',
      name: 'Sol Ring',
      lang: 'en',
      color_identity: [],
      type_line: 'Artifact',
      oracle_text: 'T: Add CC.',
      image_uris: { normal: 'https://cards.scryfall.io/normal/sol.jpg' },
    }));

    const card = await fetchPrintedCard('lea', '270');

    expect(card).toMatchObject({
      printedName: 'Sol Ring',
      typeLine: 'Artifact',
      text: 'T: Add CC.',
    });
  });

  test('should still return the text of a printing that has no image', async () => {
    stubFetch(() => ({
      id: 'artless-id',
      name: 'Sem Arte',
      lang: 'pt',
      color_identity: [],
      printed_text: 'Voar',
    }));

    const card = await fetchPrintedCard('mh3', '125');

    expect(card).toMatchObject({ image: '', text: 'Voar' });
  });

  test('should escape a collector number that carries a slash', async () => {
    const fetchMock = stubFetch(() => PT_CARD);

    await fetchPrintedCard('sld', '125a/b');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.scryfall.com/cards/sld/125a%2Fb/pt');
  });
});

describe('fetchSetSizes', () => {
  test('should keep only what identifies a set by its footer total', async () => {
    stubFetch({
      data: [
        { code: 'uds', name: "Urza's Destiny", card_count: 143, released_at: '1999-06-07' },
        { code: 'mh3', name: 'Modern Horizons 3', card_count: 261, released_at: '2024-06-14' },
      ],
    });

    await expect(fetchSetSizes()).resolves.toEqual([
      { code: 'uds', cardCount: 143, releasedAt: '1999-06-07' },
      { code: 'mh3', cardCount: 261, releasedAt: '2024-06-14' },
    ]);
  });
});

describe('searchPrintings', () => {
  const REPERCUSSION = {
    id: 'repercussion-id',
    name: 'Repercussion',
    set: 'uds',
    collector_number: '95',
    color_identity: ['R'],
    image_uris: { normal: 'https://cards.scryfall.io/normal/uds-95.jpg' },
  };

  test('should ask for the card number across every candidate set at once', async () => {
    const fetchMock = stubFetch({ data: [REPERCUSSION] });

    const found = await searchPrintings('95', ['uds', 'exo']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent(fetchMock.mock.calls[0][0])).toContain('cn:95');
    expect(decodeURIComponent(fetchMock.mock.calls[0][0])).toContain('e:uds or e:exo');
    expect(found).toEqual([
      {
        set: 'uds',
        collectorNumber: '95',
        name: 'Repercussion',
        image: 'https://cards.scryfall.io/normal/uds-95.jpg',
      },
    ]);
  });

  test('should leave the image empty when the printing carries none', async () => {
    stubFetch({
      data: [{ id: 'old-id', name: 'Repercussion', set: 'uds', collector_number: '95' }],
    });

    const [found] = await searchPrintings('95', ['uds']);

    expect(found.image).toBe('');
  });

  test('should give nothing when Scryfall knows no such printing', async () => {
    stubFetch(() => undefined);

    await expect(searchPrintings('95', ['uds'])).resolves.toEqual([]);
  });

  test('should not touch the network when no set has that size', async () => {
    const fetchMock = stubFetch({ data: [REPERCUSSION] });

    await expect(searchPrintings('95', [])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
