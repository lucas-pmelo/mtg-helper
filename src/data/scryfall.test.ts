import { afterEach, describe, expect, test, vi } from 'vitest';
import { autocompleteCardNames, fetchCardByName, toCardRef } from './scryfall';

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => ({ ok, json: async () => body }) as unknown as Response,
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

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
});
