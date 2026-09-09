import { useRef, useState } from 'react';
import { fetchPrintedCard, PREFERRED_LANG, SCRYFALL_DOWN } from '../../data/scryfall';
import { checkLookup, findCard } from '../../domain/cards/cardCache';
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

/**
 * Every post-2014 card carries set and number in latin characters on its footer,
 * Japanese ones included. Typing both is the shortest path to the translation.
 */
export function CardScreen() {
  const { recent, remember } = useCardStore();
  const [set, setSet] = useState('');
  const [collectorNumber, setCollectorNumber] = useState('');
  const [card, setCard] = useState<CardLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const reason = checkLookup(set, collectorNumber);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (reason) return;

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setError(null);
    setLoading(true);

    try {
      const found = await fetchPrintedCard(set, collectorNumber, controller.signal);
      setCard(found);
      remember(found);
    } catch (cause) {
      if (controller.signal.aborted) return;
      // Drop the previous card: on the table, a stale image next to an error
      // message reads as the answer.
      setCard(null);
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
    setCard(findCard(recent, key) ?? null);
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1>Carta</h1>
          <p className="subtitle">O código do rodapé em português.</p>
        </div>
      </header>

      <form className="stack" onSubmit={search}>
        <div className="code-fields">
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

          <label className="field">
            <span className="field-label">Número</span>
            <input
              value={collectorNumber}
              onChange={(event) => setCollectorNumber(event.target.value)}
              placeholder="125"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Número da carta"
            />
          </label>
        </div>

        <button className="btn" type="submit" disabled={Boolean(reason) || loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {reason && <p className="error">{reason}</p>}
      {error && <p className="error">{error}</p>}

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
