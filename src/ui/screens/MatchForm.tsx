import { useState } from 'react';
import { checkMatch } from '../../domain/history/checkMatch';
import { today } from '../../domain/history/today';
import type { Id, Match, MatchParticipant } from '../../domain/types';
import { usePeopleStore } from '../../stores/peopleStore';
import type { MatchDraft } from '../../stores/historyStore';

type MatchFormProps = {
  initial?: Match;
  onSave: (draft: MatchDraft) => void;
  onCancel: () => void;
};

export function MatchForm({ initial, onSave, onCancel }: MatchFormProps) {
  const { people, decks } = usePeopleStore();
  const [playedOn, setPlayedOn] = useState(initial?.playedOn ?? today());
  const [participants, setParticipants] = useState<MatchParticipant[]>(
    initial?.participants ?? [
      { personId: '', deckId: '' },
      { personId: '', deckId: '' },
    ],
  );
  const [winnerPersonId, setWinnerPersonId] = useState<Id>(initial?.winnerPersonId ?? '');
  const [error, setError] = useState<string | null>(null);

  const activePeople = people.filter((person) => !person.archived);
  const namedParticipants = participants.filter((participant) => participant.personId);

  function updateParticipant(index: number, change: Partial<MatchParticipant>) {
    setParticipants((current) =>
      current.map((participant, position) =>
        position === index ? { ...participant, ...change } : participant,
      ),
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const draft: MatchDraft = { playedOn, participants: namedParticipants, winnerPersonId };
    const reason = checkMatch(draft);

    if (reason) {
      setError(reason);
      return;
    }

    onSave(draft);
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <label className="muted" htmlFor="playedOn">
        Data
      </label>
      <input
        id="playedOn"
        type="date"
        value={playedOn}
        onChange={(event) => setPlayedOn(event.target.value)}
      />

      <h2 style={{ margin: '8px 0 0' }}>Participantes</h2>

      {participants.map((participant, index) => {
        const availableDecks = decks.filter(
          (deck) => deck.personId === participant.personId && !deck.archived,
        );

        return (
          <div className="stack" key={index}>
            <div className="row">
              <select
                value={participant.personId}
                aria-label={`Jogador ${index + 1}`}
                onChange={(event) =>
                  updateParticipant(index, { personId: event.target.value, deckId: '' })
                }
              >
                <option value="">Jogador…</option>
                {activePeople.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>

              {participants.length > 2 && (
                <button
                  className="btn btn-danger btn-slim"
                  type="button"
                  onClick={() =>
                    setParticipants((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={participant.deckId}
              aria-label={`Deck do jogador ${index + 1}`}
              disabled={!participant.personId}
              onChange={(event) => updateParticipant(index, { deckId: event.target.value })}
            >
              <option value="">Deck…</option>
              {availableDecks.map((deck) => (
                <option value={deck.id} key={deck.id}>
                  {deck.commander.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <button
        className="btn btn-secondary btn-slim"
        type="button"
        onClick={() => setParticipants((current) => [...current, { personId: '', deckId: '' }])}
      >
        + Participante
      </button>

      <h2 style={{ margin: '8px 0 0' }}>Vencedor</h2>
      <select
        value={winnerPersonId}
        aria-label="Vencedor"
        onChange={(event) => setWinnerPersonId(event.target.value)}
      >
        <option value="">Escolha o vencedor…</option>
        {namedParticipants.map((participant) => (
          <option value={participant.personId} key={participant.personId}>
            {people.find((person) => person.id === participant.personId)?.name}
          </option>
        ))}
      </select>

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button className="btn btn-secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn" type="submit">
          Salvar
        </button>
      </div>
    </form>
  );
}
