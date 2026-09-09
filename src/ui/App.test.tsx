// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from './App';
import { today } from '../domain/history/today';
import { usePeopleStore } from '../stores/peopleStore';
import { useHistoryStore } from '../stores/historyStore';
import { useStickerStore } from '../stores/stickerStore';
import { useCardStore } from '../stores/cardStore';
import { makeDeck } from '../tests/factories/make-deck';
import { makeLiveMatch } from '../tests/factories/make-live-match';
import { makeMatch } from '../tests/factories/make-match';
import { makePerson } from '../tests/factories/make-person';
import { makeSeason } from '../tests/factories/make-season';
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

function clickSegment(label: string) {
  const button = [...container.querySelectorAll('.segmented button')].find((candidate) =>
    candidate.textContent?.includes(label),
  );

  act(() => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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

function findSwitch(label: string) {
  return [...container.querySelectorAll('.switch-row')].find((button) =>
    button.textContent?.includes(label),
  ) as HTMLButtonElement;
}

function clickSwitch(label: string) {
  const toggle = findSwitch(label);

  act(() => {
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function findButton(label: string) {
  return [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === label,
  ) as HTMLButtonElement;
}

function clickButton(label: string) {
  const button = findButton(label);

  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function clickBar() {
  const summary = container.querySelector('.live-summary') as HTMLButtonElement;

  act(() => {
    summary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
  useHistoryStore.setState({ matches: [makeMatch()], seasons: [], liveMatch: null });
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

  test('should offer the three smart draw switches turned off', () => {
    render();

    for (const label of ['Evitar repetição', 'Equilibrar', 'Draft']) {
      expect(findSwitch(label).getAttribute('aria-checked')).toBe('false');
    }
  });

  test('should turn a switch on when it is tapped', () => {
    render();

    clickSwitch('Equilibrar');

    expect(findSwitch('Equilibrar').getAttribute('aria-checked')).toBe('true');
  });

  test('should clear the result when a switch is flipped', () => {
    render();
    clickPerson('Ana');
    clickPerson('Bob');
    clickButton('Sortear');
    expect(container.querySelectorAll('.result-card')).toHaveLength(2);

    clickSwitch('Evitar repetição');

    expect(container.querySelectorAll('.result-card')).toHaveLength(0);
  });

  test('should swap the draw button for the draft one', () => {
    render();

    clickSwitch('Draft');

    expect(container.textContent).toContain('Começar draft');
  });

  test('should let each player pick in turn and end on the usual result', () => {
    render();
    clickPerson('Ana');
    clickPerson('Bob');
    clickSwitch('Draft');
    clickButton('Começar draft');

    expect(container.querySelector('.draft-turn .player')?.textContent).toMatch(/Ana|Bob/);
    expect(container.querySelector('.draft-turn .pill')?.textContent).toBe('1 de 2');

    const firstOption = container.querySelector('.draft-option') as HTMLButtonElement;
    act(() => {
      firstOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('.draft-turn .pill')?.textContent).toBe('2 de 2');

    const secondOption = container.querySelector('.draft-option') as HTMLButtonElement;
    act(() => {
      secondOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('.draft-turn')).toBeNull();
    expect(container.querySelectorAll('.result-card')).toHaveLength(2);
  });

  test('should say when anti-repeat had to give the same deck back', () => {
    usePeopleStore.setState({
      people: [makePerson({ id: 'ana', name: 'Ana' }), makePerson({ id: 'bob', name: 'Bob' })],
      decks: [makeDeck({ id: 'ana-1', personId: 'ana' }), makeDeck({ id: 'bob-1', personId: 'bob' })],
    });
    useHistoryStore.setState({
      matches: [makeMatch({ id: 'old', playedOn: '2020-01-01' })],
      seasons: [],
    });
    render();

    clickPerson('Ana');
    clickPerson('Bob');
    clickSwitch('Evitar repetição');
    clickButton('Sortear');

    expect(container.textContent).toContain('mesmo deck da última sessão');
  });

  test('should hide the live match bar while no match is in progress', () => {
    render();

    expect(container.querySelector('.live-bar')).toBeNull();
  });

  test('should show the live match bar with the player count on every tab', () => {
    useHistoryStore.setState({ liveMatch: makeLiveMatch({ startedOn: today() }) });
    render();

    expect(container.querySelector('.live-bar')?.textContent).toContain('Partida em andamento');
    expect(container.querySelector('.live-bar')?.textContent).toContain('2 jogadores');

    clickTab('Ajustes');

    expect(container.querySelector('.live-bar')).not.toBeNull();
  });

  test('should ask which player won when the draft is left over from another day', () => {
    useHistoryStore.setState({ liveMatch: makeLiveMatch({ startedOn: '2026-09-07' }) });
    render();

    expect(container.querySelector('.live-bar')?.textContent).toContain(
      'Partida de 07/09 — quem venceu?',
    );
  });

  test('should say who is at the table without a deck', () => {
    useHistoryStore.setState({
      liveMatch: makeLiveMatch({ startedOn: today(), benched: ['carol'] }),
    });
    usePeopleStore.setState({
      people: [
        makePerson({ id: 'ana', name: 'Ana' }),
        makePerson({ id: 'bob', name: 'Bob' }),
        makePerson({ id: 'carol', name: 'Carol' }),
      ],
      decks: [makeDeck({ id: 'ana-1', personId: 'ana' }), makeDeck({ id: 'bob-1', personId: 'bob' })],
    });
    render();

    clickBar();

    expect(container.querySelector('.live-bar')?.textContent).toContain(
      'Carol está na mesa sem deck — não entra no registro.',
    );
  });

  test('should record the match when a winner is tapped on the bar', () => {
    useHistoryStore.setState({
      matches: [],
      seasons: [],
      liveMatch: makeLiveMatch({ startedOn: '2026-09-07' }),
    });
    render();

    clickBar();
    clickButton('Bob');

    expect(useHistoryStore.getState().matches).toMatchObject([
      { playedOn: '2026-09-07', winnerPersonId: 'bob' },
    ]);
    expect(useHistoryStore.getState().liveMatch).toBeNull();
    expect(container.querySelector('.live-bar')).toBeNull();
  });

  test('should discard the match once the table confirms', () => {
    vi.stubGlobal('confirm', () => true);
    useHistoryStore.setState({ liveMatch: makeLiveMatch({ startedOn: today() }) });
    render();

    clickBar();
    clickButton('Descartar partida');

    expect(useHistoryStore.getState().liveMatch).toBeNull();
  });

  test('should keep the match when the table refuses to discard it', () => {
    vi.stubGlobal('confirm', () => false);
    const live = makeLiveMatch({ startedOn: today() });
    useHistoryStore.setState({ liveMatch: live });
    render();

    clickBar();
    clickButton('Descartar partida');

    expect(useHistoryStore.getState().liveMatch).toEqual(live);
  });

  test('should open a match from the draw result and show it on the bar', () => {
    render();
    clickPerson('Ana');
    clickPerson('Bob');
    clickButton('Sortear');

    clickButton('Iniciar partida');

    expect(useHistoryStore.getState().liveMatch?.participants).toHaveLength(2);
    expect(container.querySelector('.live-bar')?.textContent).toContain('Partida em andamento');
  });

  test('should move the re-draw button into the result, leaving no duplicate', () => {
    render();
    clickPerson('Ana');
    clickPerson('Bob');
    clickButton('Sortear');

    // Fora da tab bar, que também tem um botão chamado "Sortear".
    const labels = [...container.querySelectorAll('.screen button')].map(
      (button) => button.textContent,
    );

    expect(labels).not.toContain('Sortear');
    expect(labels.filter((label) => label === 'Sortear de novo')).toHaveLength(1);
  });

  test('should block starting a match when fewer than two players hold a deck', () => {
    usePeopleStore.setState({
      people: [makePerson({ id: 'ana', name: 'Ana' }), makePerson({ id: 'bob', name: 'Bob' })],
      decks: [makeDeck({ id: 'ana-1', personId: 'ana' })],
    });
    render();
    clickPerson('Ana');
    clickPerson('Bob');
    clickButton('Sortear');

    const start = findButton('Iniciar partida');

    expect(start.disabled).toBe(true);
    expect(container.textContent).toContain(
      'Ao menos 2 jogadores precisam de deck para registrar a partida',
    );
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

  test('should open the history on the current season and hide matches outside it', () => {
    useHistoryStore.setState({
      matches: [makeMatch({ id: 'old', playedOn: '2024-05-05' }), makeMatch({ id: 'now' })],
      seasons: [makeSeason({ id: 'season-1', name: 'Temporada 2026', startsOn: '2026-01-01' })],
    });
    render();
    clickTab('Histórico');

    const selector = container.querySelector('select[aria-label="Temporada"]') as HTMLSelectElement;

    expect(selector.value).toBe('season-1');
    expect(container.textContent).toContain('1 partida registrada');
    expect(container.textContent).not.toContain('05/05/2024');
  });

  test('should show every match again when the season selector goes back to all time', () => {
    useHistoryStore.setState({
      matches: [makeMatch({ id: 'old', playedOn: '2024-05-05' }), makeMatch({ id: 'now' })],
      seasons: [makeSeason({ id: 'season-1', startsOn: '2026-01-01' })],
    });
    render();
    clickTab('Histórico');

    const selector = container.querySelector('select[aria-label="Temporada"]') as HTMLSelectElement;
    act(() => {
      selector.value = 'all';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('05/05/2024');
    expect(container.textContent).toContain('2 partidas registradas');
  });

  test('should expand the head-to-head of a player tapped in the ranking', () => {
    render();
    clickTab('Histórico');
    clickSegment('Jogadores');

    expect(container.querySelector('.h2h')).toBeNull();

    const anaRow = container.querySelector('.rank-item .rank-row') as HTMLButtonElement;
    act(() => {
      anaRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const confrontation = container.querySelector('.h2h-row');

    expect(confrontation?.textContent).toContain('Bob');
    expect(confrontation?.textContent).toContain('você');
    expect(container.textContent).not.toContain('Nenhuma mesa em comum');
  });
});
