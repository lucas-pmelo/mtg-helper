import { useEffect, useRef, useState } from 'react';
import { autocompleteCardNames, fetchCardByName } from '../../data/scryfall';
import type { CardRef } from '../../domain/types';

const DEBOUNCE_MS = 300;
const MIN_TERM_LENGTH = 2;

type CardAutocompleteProps = {
  onPick: (card: CardRef) => void;
};

/** Scryfall autocomplete, debounced at 300ms as the spec requires. */
export function CardAutocomplete({ onPick }: CardAutocompleteProps) {
  const [term, setTerm] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const picking = useRef(false);

  useEffect(() => {
    if (picking.current) {
      picking.current = false;
      return;
    }

    if (term.trim().length < MIN_TERM_LENGTH) {
      setNames([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setError(null);
        setNames(await autocompleteCardNames(term.trim(), controller.signal));
      } catch (cause) {
        if (!controller.signal.aborted) setError('Não foi possível buscar no Scryfall');
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  async function pick(name: string) {
    picking.current = true;
    setTerm(name);
    setNames([]);
    setLoading(true);

    try {
      onPick(await fetchCardByName(name));
      picking.current = true;
      setTerm('');
    } catch {
      setError('Não foi possível carregar a carta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="autocomplete">
      <input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Nome do comandante"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Nome do comandante"
      />

      {names.length > 0 && (
        <ul className="suggestions">
          {names.map((name) => (
            <li key={name}>
              <button type="button" onClick={() => pick(name)}>
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="muted">Carregando carta…</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
