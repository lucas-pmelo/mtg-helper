// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App';
import { usePeopleStore } from '../stores/peopleStore';
import { useHistoryStore } from '../stores/historyStore';
import { useStickerStore } from '../stores/stickerStore';
import { useCardStore } from '../stores/cardStore';
import { makeDeck } from '../tests/factories/make-deck';
import { makeMatch } from '../tests/factories/make-match';
import { makePerson } from '../tests/factories/make-person';
import { makeCardLookup } from '../tests/factories/make-card-lookup';

let container: HTMLElement;
let root: Root;

function render() {
  act(() => {
    root.render(<App />);
  });
}

function clickTab(label: string) {
  const tab = [...container.querySelectorAll('.tabs button')].find((button) =>
    button.textContent?.includes(label),
  );

  act(() => {
    tab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function clickPerson(name: string) {
  const row = [...container.querySelectorAll('.checkbox-row')].find((button) =>
    button.textContent?.includes(name),
  );

  act(() => {
    row?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);

  usePeopleStore.setState({
    people: [makePerson({ id: 'ana', name: 'Ana' }), makePerson({ id: 'bob', name: 'Bob' })],
    decks: [makeDeck({ id: 'ana-1', personId: 'ana' }), makeDeck({ id: 'bob-1', personId: 'bob' })],
  });
  useHistoryStore.setState({ matches: [makeMatch()] });
  useStickerStore.setState({ sheetIds: [], lastDraw: null });
  useCardStore.setState({ recent: [] });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('App', () => {
  test('should open on the commanders screen listing the people at the table', () => {
    render();

    expect(container.textContent).toContain('Random Commanders');
    expect(container.textContent).toContain('Ana');
    expect(container.textContent).toContain('Bob');
  });

  test('should block the draw until two players are selected', () => {
    render();

    const drawButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Sortear',
    ) as HTMLButtonElement;

    expect(drawButton.disabled).toBe(true);
    expect(container.textContent).toContain('Selecione ao menos 2 jogadores');
  });

  test('should draw for a player who owns no deck, showing them without a commander', () => {
    usePeopleStore.setState({
      people: [makePerson({ id: 'ana', name: 'Ana' }), makePerson({ id: 'bob', name: 'Bob' })],
      decks: [makeDeck({ id: 'ana-1', personId: 'ana' })],
    });
    render();

    clickPerson('Ana');
    clickPerson('Bob');

    const drawButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Sortear',
    ) as HTMLButtonElement;
    expect(drawButton.disabled).toBe(false);

    act(() => {
      drawButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const cards = [...container.querySelectorAll('.result-card')];
    expect(cards).toHaveLength(2);
    expect(container.textContent).toContain('sem deck cadastrado');
    expect(container.querySelectorAll('.result-art')).toHaveLength(1);
  });

  test('should label every tab with an svg icon instead of an emoji', () => {
    render();

    const tabs = [...container.querySelectorAll('.tabs button')];

    expect(tabs).toHaveLength(6);
    for (const tab of tabs) {
      expect(tab.querySelector('svg')).not.toBeNull();
      expect(tab.textContent).toMatch(/^[\p{L}\p{M}\s]+$/u);
    }
  });

  test('should render every screen without crashing', () => {
    render();

    for (const label of ['Stickers', 'Histórico', 'Pessoas', 'Carta', 'Ajustes']) {
      clickTab(label);
      expect(container.querySelector('.screen')).not.toBeNull();
    }
  });

  test('should show the sticker counter and keep the draw disabled with an empty deck', () => {
    render();
    clickTab('Stickers');

    expect(container.querySelector('.counter')?.textContent).toBe('0/10');

    const drawButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Draw 3',
    ) as HTMLButtonElement;
    expect(drawButton.disabled).toBe(true);
  });

  test('should ask for the footer code on the card reader with the search blocked', () => {
    render();
    clickTab('Carta');

    const searchButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Buscar',
    ) as HTMLButtonElement;

    expect(searchButton.disabled).toBe(true);
    expect(container.textContent).toContain('Digite o código do set');
    expect(container.textContent).toContain('Nenhuma carta ainda');
  });

  test('should open a recent card from the cache without touching the network', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    useCardStore.setState({ recent: [makeCardLookup()] });
    render();
    clickTab('Carta');

    const recentCard = container.querySelector('.recent-card') as HTMLButtonElement;
    act(() => {
      recentCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetchMock).not.toHaveBeenCalled();

    expect(container.querySelector('.lookup-name')?.textContent).toBe('Capturador Infernal');
    expect(container.textContent).toContain('Fell the Profane');
    expect(container.textContent).toContain('Criatura — Demônio');
  });

  test('should list the recorded match on the history screen', () => {
    render();
    clickTab('Histórico');

    expect(container.textContent).toContain('09/09/2026');
    expect(container.textContent).toContain('venceu');
  });
});
