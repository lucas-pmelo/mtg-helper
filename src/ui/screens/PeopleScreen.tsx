import { useState } from 'react';
import { usePeopleStore } from '../../stores/peopleStore';
import type { Id } from '../../domain/types';
import { CardAutocomplete } from '../components/CardAutocomplete';
import { CommanderRow } from '../components/CommanderRow';

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
      <h1>Pessoas e decks</h1>

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

      {activePeople.length === 0 && <p className="empty">Cadastre a primeira pessoa acima.</p>}

      <div className="stack" style={{ marginTop: 16 }}>
        {activePeople.map((person) => {
          const personDecks = decks.filter(
            (deck) => !deck.archived && deck.personId === person.id,
          );

          return (
            <section className="card" key={person.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{person.name}</strong>
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

              <div className="stack" style={{ marginTop: 12 }}>
                {personDecks.length === 0 && <p className="muted">Nenhum deck cadastrado.</p>}

                {personDecks.map((deck) => (
                  <div className="row" key={deck.id} style={{ justifyContent: 'space-between' }}>
                    <CommanderRow commander={deck.commander} />
                    <button
                      className="btn btn-danger btn-slim"
                      type="button"
                      onClick={() => {
                        if (confirm(`Arquivar ${deck.commander.name}?`)) archiveDeck(deck.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {openDeckFormFor === person.id ? (
                <div style={{ marginTop: 12 }}>
                  <CardAutocomplete
                    onPick={(commander) => {
                      addDeck(person.id, commander);
                      setOpenDeckFormFor(null);
                    }}
                  />
                  <button
                    className="btn btn-secondary btn-slim"
                    type="button"
                    style={{ marginTop: 8 }}
                    onClick={() => setOpenDeckFormFor(null)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary btn-slim"
                  type="button"
                  style={{ marginTop: 12 }}
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
