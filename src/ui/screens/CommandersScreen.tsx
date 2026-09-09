import { useState } from 'react';
import {
  checkDraw,
  drawCommanders,
  type CommanderAssignment,
  type DrawMode,
} from '../../domain/commanders/drawCommanders';
import { defaultRng } from '../../domain/rng';
import type { Id } from '../../domain/types';
import { usePeopleStore } from '../../stores/peopleStore';
import { CardImage } from '../components/CardImage';

export function CommandersScreen() {
  const { people, decks } = usePeopleStore();
  const [presentIds, setPresentIds] = useState<Id[]>([]);
  const [mode, setMode] = useState<DrawMode>('own');
  const [result, setResult] = useState<CommanderAssignment[] | null>(null);

  const activePeople = people.filter((person) => !person.archived);
  const presentPlayers = activePeople.filter((person) => presentIds.includes(person.id));
  const blockingReason = checkDraw(presentPlayers, decks, mode);

  function togglePresent(id: Id) {
    setResult(null);
    setPresentIds((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    );
  }

  function draw() {
    setResult(drawCommanders(presentPlayers, decks, mode, defaultRng));
  }

  return (
    <div className="screen">
      <h1>Random Commanders</h1>

      {activePeople.length === 0 && <p className="empty">Cadastre pessoas na aba Pessoas.</p>}

      <div className="stack">
        {activePeople.map((person) => (
          <button
            className="checkbox-row"
            key={person.id}
            type="button"
            aria-pressed={presentIds.includes(person.id)}
            onClick={() => togglePresent(person.id)}
          >
            <span className="tick">{presentIds.includes(person.id) ? '✓' : ''}</span>
            {person.name}
          </button>
        ))}
      </div>

      <h2>Modo</h2>
      <div className="segmented">
        <button
          type="button"
          aria-pressed={mode === 'own'}
          onClick={() => {
            setMode('own');
            setResult(null);
          }}
        >
          Próprios decks
        </button>
        <button
          type="button"
          aria-pressed={mode === 'pool'}
          onClick={() => {
            setMode('pool');
            setResult(null);
          }}
        >
          Pool único
        </button>
      </div>

      <button className="btn" type="button" style={{ marginTop: 16 }} disabled={!!blockingReason} onClick={draw}>
        {result ? 'Sortear de novo' : 'Sortear'}
      </button>

      {blockingReason && <p className="error">{blockingReason}</p>}

      {result && (
        <div className="stack" style={{ marginTop: 24 }}>
          {result.map((assignment) => {
            const person = people.find((candidate) => candidate.id === assignment.personId);
            const deck = decks.find((candidate) => candidate.id === assignment.deckId);
            if (!deck) return null;

            return (
              <section className="card" key={assignment.personId}>
                <strong>{person?.name}</strong>
                <div className="muted" style={{ marginBottom: 10 }}>
                  {deck.commander.name}
                </div>
                <CardImage src={deck.commander.normal} name={deck.commander.name} radius={12} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
