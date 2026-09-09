import { useState } from 'react';
import { usePeopleStore } from '../../stores/peopleStore';
import type { Id } from '../../domain/types';
import { CardAutocomplete } from '../components/CardAutocomplete';
import { CommanderRow } from '../components/CommanderRow';
import { Icon } from '../components/Icon';

export function PeopleScreen() {
  const { people, decks, addPerson, archivePerson, addDeck, archiveDeck } = usePeopleStore();
  const [newName, setNewName] = useState('');
  const [openDeckFormFor, setOpenDeckFormFor] = useState<Id | null>(null);

  const activePeople = people.filter((person) => !person.archived);

  function submitPerson(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;

    addPerson(newName);
    setNewName('');
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <h1>Pessoas e decks</h1>
          <p className="subtitle">Um deck é um comandante.</p>
        </div>
      </header>

      <form className="row" onSubmit={submitPerson}>
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nome da pessoa"
          aria-label="Nome da pessoa"
        />
        <button className="btn btn-slim" type="submit" disabled={!newName.trim()}>
          Add
        </button>
      </form>

      {activePeople.length === 0 && (
        <p className="empty gap-top">
          <Icon name="users" size={28} className="empty-icon" />
          Cadastre a primeira pessoa acima.
        </p>
      )}

      <div className="stack gap-top">
        {activePeople.map((person) => {
          const personDecks = decks.filter(
            (deck) => !deck.archived && deck.personId === person.id,
          );

          return (
            <section className="card" key={person.id}>
              <div className="row row-between">
                <div className="row">
                  <span className="avatar" aria-hidden="true">
                    {person.name.slice(0, 1)}
                  </span>
                  <div>
                    <div className="card-title">{person.name}</div>
                    <div className="muted">
                      {personDecks.length === 1 ? '1 deck' : `${personDecks.length} decks`}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-slim"
                  type="button"
                  onClick={() => {
                    if (confirm(`Arquivar ${person.name}? O histórico é mantido.`)) {
                      archivePerson(person.id);
                    }
                  }}
                >
                  Arquivar
                </button>
              </div>

              {personDecks.length > 0 && (
                <>
                  <hr className="divider" />
                  <div className="stack stack-tight">
                    {personDecks.map((deck) => (
                      <div className="row row-between" key={deck.id}>
                        <CommanderRow commander={deck.commander} />
                        <button
                          className="btn btn-ghost btn-icon"
                          type="button"
                          aria-label={`Arquivar ${deck.commander.name}`}
                          onClick={() => {
                            if (confirm(`Arquivar ${deck.commander.name}?`)) archiveDeck(deck.id);
                          }}
                        >
                          <Icon name="archive" size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {openDeckFormFor === person.id ? (
                <div className="stack stack-tight gap-top">
                  <CardAutocomplete
                    onPick={(commander) => {
                      addDeck(person.id, commander);
                      setOpenDeckFormFor(null);
                    }}
                  />
                  <button
                    className="btn btn-secondary btn-slim"
                    type="button"
                    onClick={() => setOpenDeckFormFor(null)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary btn-slim gap-top"
                  type="button"
                  onClick={() => setOpenDeckFormFor(person.id)}
                >
                  + Deck
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
