import { useState } from 'react';
import { checkMatch } from '../../domain/history/checkMatch';
import { today } from '../../domain/history/today';
import type { Deck, Id, Match, MatchParticipant, Person } from '../../domain/types';
import { usePeopleStore } from '../../stores/peopleStore';
import type { MatchDraft } from '../../stores/historyStore';
import { Icon } from '../components/Icon';

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

  /**
   * Every deck on the table, owner by owner: playing someone else's deck is
   * common enough that filtering by owner only got in the way. The player's own
   * decks come first, since that is still the usual pick.
   */
  function decksByOwner(personId: Id): { owner: Person; owned: Deck[] }[] {
    return activePeople
      .map((owner) => ({
        owner,
        owned: decks.filter((deck) => !deck.archived && deck.personId === owner.id),
      }))
      .filter((group) => group.owned.length > 0)
      .sort((a, b) => {
        if (a.owner.id === personId) return -1;
        if (b.owner.id === personId) return 1;

        return a.owner.name.localeCompare(b.owner.name);
      });
  }

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
    const reason = checkMatch(draft, decks);

    if (reason) {
      setError(reason);
      return;
    }

    onSave(draft);
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="field">
        <label className="field-label" htmlFor="playedOn">
          Data
        </label>
        <input
          id="playedOn"
          type="date"
          value={playedOn}
          onChange={(event) => setPlayedOn(event.target.value)}
        />
      </div>

      <h2>Participantes</h2>

      {participants.map((participant, index) => {
        const ownerGroups = decksByOwner(participant.personId);

        return (
          <div className="participant stack stack-tight" key={index}>
            <div className="row row-between">
              <span className="participant-index">Jogador {index + 1}</span>
              {participants.length > 2 && (
                <button
                  className="btn btn-ghost btn-icon"
                  type="button"
                  aria-label={`Remover jogador ${index + 1}`}
                  onClick={() =>
                    setParticipants((current) =>
                      current.filter((_, position) => position !== index),
                    )
                  }
                >
                  <Icon name="close" size={17} />
                </button>
              )}
            </div>

            <select
              value={participant.personId}
              aria-label={`Jogador ${index + 1}`}
              onChange={(event) => updateParticipant(index, { personId: event.target.value })}
            >
              <option value="">Jogador…</option>
              {activePeople.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.name}
                </option>
              ))}
            </select>

            <select
              value={participant.deckId}
              aria-label={`Deck do jogador ${index + 1}`}
              disabled={!participant.personId}
              onChange={(event) => updateParticipant(index, { deckId: event.target.value })}
            >
              <option value="">Deck…</option>
              {ownerGroups.map(({ owner, owned }) => (
                <optgroup label={owner.name} key={owner.id}>
                  {owned.map((deck) => (
                    <option value={deck.id} key={deck.id}>
                      {deck.commander.name}
                    </option>
                  ))}
                </optgroup>
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

      <h2>Vencedor</h2>
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

      <div className="form-actions">
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
