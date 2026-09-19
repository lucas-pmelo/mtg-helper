import { useRef, useState } from 'react';
import {
  fetchPrintedCard,
  fetchSetSizes,
  searchPrintings,
  PREFERRED_LANG,
  SCRYFALL_DOWN,
  type CardCandidate,
} from '../../data/scryfall';
import { checkLookup, findCard, normalizeCode } from '../../domain/cards/cardCache';
import { checkTotalLookup, codesWithSize, setsAreStale } from '../../domain/cards/setSizes';
import type { CardLookup } from '../../domain/types';
import { useCardStore } from '../../stores/cardStore';
import { CardImage } from '../components/CardImage';
import { Icon } from '../components/Icon';

/** `fetch` only rejects with a TypeError when the request never left. */
function messageFor(cause: unknown): string {
  if (cause instanceof TypeError) {
    return 'Sem conexão. As cartas já consultadas continuam aí embaixo.';
  }

  return cause instanceof Error ? cause.message : SCRYFALL_DOWN;
}

/** Set and number, or — for the cards printed before set codes — number and total. */
type LookupMode = 'code' | 'total';

/**
 * Every post-2014 card carries set and number in latin characters on its footer,
 * Japanese ones included. Typing both is the shortest path to the translation.
 * Older cards print only `95/143`: the total is the size of the set, and that
 * narrows the whole of Magic down to a handful of candidates.
 */
export function CardScreen() {
  const { recent, remember, setSizes, setsFetchedAt, rememberSets } = useCardStore();
  const [mode, setMode] = useState<LookupMode>('code');
  const [set, setSet] = useState('');
  const [collectorNumber, setCollectorNumber] = useState('');
  const [total, setTotal] = useState('');
  const [card, setCard] = useState<CardLookup | null>(null);
  const [candidates, setCandidates] = useState<CardCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const reason =
    mode === 'code'
      ? checkLookup(set, collectorNumber)
      : checkTotalLookup(collectorNumber, total);

  /** Starts a request and hands back its controller, cancelling whatever came before. */
  function begin(): AbortController {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setError(null);
    setLoading(true);

    return controller;
  }

  async function show(lookup: Promise<CardLookup>): Promise<void> {
    const found = await lookup;
    setCard(found);
    setCandidates([]);
    remember(found);
  }

  /** The set list is big and all but immutable: download it once a month. */
  async function currentSetSizes(controller: AbortController) {
    if (!setsAreStale(setsFetchedAt, new Date().toISOString()) && setSizes.length > 0) {
      return setSizes;
    }

    const fetched = await fetchSetSizes(controller.signal);
    rememberSets(fetched);

    return fetched;
  }

  async function searchByFooter(controller: AbortController): Promise<void> {
    const sizes = await currentSetSizes(controller);
    const codes = codesWithSize(sizes, Number.parseInt(normalizeCode(total), 10));

    if (codes.length === 0) {
      throw new Error(`Nenhum set com ${normalizeCode(total)} cartas. Confira o total no rodapé.`);
    }

    const found = await searchPrintings(collectorNumber, codes, controller.signal);

    if (found.length === 0) {
      throw new Error(
        `Não achei a carta ${normalizeCode(collectorNumber)} num set de ${normalizeCode(total)} cartas.`,
      );
    }

    if (found.length === 1) {
      await show(fetchPrintedCard(found[0].set, found[0].collectorNumber, controller.signal));
      return;
    }

    setCard(null);
    setCandidates(found);
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (reason) return;

    const controller = begin();

    try {
      if (mode === 'code') {
        await show(fetchPrintedCard(set, collectorNumber, controller.signal));
      } else {
        await searchByFooter(controller);
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      // Drop the previous card: on the table, a stale image next to an error
      // message reads as the answer.
      setCard(null);
      setCandidates([]);
      setError(messageFor(cause));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  /** The table pointed at one of the candidates: now it is worth a translation. */
  async function openCandidate(candidate: CardCandidate) {
    const controller = begin();

    try {
      await show(fetchPrintedCard(candidate.set, candidate.collectorNumber, controller.signal));
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(messageFor(cause));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  /** A recent card is already cached: show it without touching the network. */
  function showCached(key: string) {
    pending.current?.abort();
    setError(null);
    setLoading(false);
    setCandidates([]);
    setCard(findCard(recent, key) ?? null);
  }

  function switchTo(next: LookupMode) {
    setMode(next);
    setError(null);
    setCandidates([]);
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1>Carta</h1>
          <p className="subtitle">O código do rodapé em português.</p>
        </div>
      </header>

      <div className="segmented">
        <button type="button" aria-pressed={mode === 'code'} onClick={() => switchTo('code')}>
          Set + número
        </button>
        <button type="button" aria-pressed={mode === 'total'} onClick={() => switchTo('total')}>
          Número / total
        </button>
      </div>

      <form className="stack gap-top" onSubmit={search}>
        <div className="code-fields">
          {mode === 'code' ? (
            <label className="field">
              <span className="field-label">Set</span>
              <input
                value={set}
                onChange={(event) => setSet(event.target.value)}
                placeholder="MH3"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Código do set"
              />
            </label>
          ) : null}

          <label className="field">
            <span className="field-label">Número</span>
            <input
              value={collectorNumber}
              onChange={(event) => setCollectorNumber(event.target.value)}
              placeholder="95"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Número da carta"
            />
          </label>

          {mode === 'total' ? (
            <label className="field">
              <span className="field-label">Total</span>
              <input
                value={total}
                onChange={(event) => setTotal(event.target.value)}
                placeholder="143"
                inputMode="numeric"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Total de cartas do set"
              />
            </label>
          ) : null}
        </div>

        {mode === 'total' && (
          <p className="muted">
            Cartas antigas não trazem o código do set: use os dois números do rodapé, como 95/143.
          </p>
        )}

        <button className="btn" type="submit" disabled={Boolean(reason) || loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {reason && <p className="error">{reason}</p>}
      {error && <p className="error">{error}</p>}

      {candidates.length > 0 && (
        <>
          <h2>Qual delas?</h2>
          <div className="draft-options gap-top">
            {candidates.map((candidate) => (
              <button
                className="draft-option candidate"
                key={`${candidate.set}/${candidate.collectorNumber}`}
                type="button"
                onClick={() => openCandidate(candidate)}
              >
                <CardImage src={candidate.image} name={candidate.name} radius={10} />
                <span className="name">{candidate.name}</span>
                <span className="code">{candidate.set.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {card && (
        <article className="card stack gap-top">
          {card.lang !== PREFERRED_LANG && (
            <span className="pill">
              <Icon name="target" size={13} />
              sem versão em português
            </span>
          )}

          <CardImage src={card.image} name={card.printedName} radius={18} />

          <div className="stack-tight">
            <p className="lookup-name">{card.printedName}</p>
            {card.englishName !== card.printedName && (
              <p className="muted">{card.englishName}</p>
            )}
            {card.typeLine && <p className="lookup-type">{card.typeLine}</p>}
          </div>

          {card.text && <p className="lookup-text">{card.text}</p>}
        </article>
      )}

      <h2>Consultadas recentemente</h2>

      {recent.length === 0 ? (
        <p className="empty">
          <Icon name="card" size={28} className="empty-icon" />
          Nenhuma carta ainda. Digite o set e o número que estão no rodapé da carta.
        </p>
      ) : (
        <div className="stack-tight">
          {recent.map((cached) => (
            <button
              className="recent-card"
              key={cached.key}
              type="button"
              onClick={() => showCached(cached.key)}
            >
              <CardImage src={cached.image} name={cached.printedName} size={38} radius={10} />
              <span className="name">{cached.printedName}</span>
              <span className="code">
                {cached.set.toUpperCase()} {cached.collectorNumber}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
