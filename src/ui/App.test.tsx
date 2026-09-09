// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { App } from './App';
import { usePeopleStore } from '../stores/peopleStore';
import { useHistoryStore } from '../stores/historyStore';
import { useStickerStore } from '../stores/stickerStore';
import { makeDeck } from '../tests/factories/make-deck';
import { makeMatch } from '../tests/factories/make-match';
import { makePerson } from '../tests/factories/make-person';

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
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
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

  test('should render every screen without crashing', () => {
    render();

    for (const label of ['Stickers', 'Histórico', 'Pessoas', 'Ajustes']) {
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

  test('should list the recorded match on the history screen', () => {
    render();
    clickTab('Histórico');

    expect(container.textContent).toContain('09/09/2026');
    expect(container.textContent).toContain('venceu');
  });
});
