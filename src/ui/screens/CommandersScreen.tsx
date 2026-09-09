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
import { Icon } from '../components/Icon';

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
      <header className="screen-head">
        <div>
          <h1>Random Commanders</h1>
          <p className="subtitle">Quem está na mesa hoje?</p>
        </div>
        <span className="pill">{presentIds.length} na mesa</span>
      </header>

      {activePeople.length === 0 ? (
        <p className="empty">
          <Icon name="users" size={28} className="empty-icon" />
          Cadastre pessoas na aba Pessoas.
        </p>
      ) : (
        <div className="stack stack-tight">
          {activePeople.map((person) => (
            <button
              className="checkbox-row"
              key={person.id}
              type="button"
              aria-pressed={presentIds.includes(person.id)}
              onClick={() => togglePresent(person.id)}
            >
              <span className="tick">
                {presentIds.includes(person.id) && <Icon name="check" size={15} />}
              </span>
              {person.name}
            </button>
          ))}
        </div>
      )}

      <h2>Modo do sorteio</h2>
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

      <button
        className="btn gap-top"
        type="button"
        disabled={!!blockingReason}
        onClick={draw}
      >
        {result ? 'Sortear de novo' : 'Sortear'}
      </button>

      {blockingReason && <p className="error">{blockingReason}</p>}

      {result && (
        <>
          <h2>Resultado</h2>
          <div className="stack">
            {result.map((assignment) => {
              const person = people.find((candidate) => candidate.id === assignment.personId);
              const deck = decks.find((candidate) => candidate.id === assignment.deckId);

              return (
                <section className="card result-card" key={assignment.personId}>
                  <div className="result-head">
                    <span className="avatar" aria-hidden="true">
                      {person?.name.slice(0, 1)}
                    </span>
                    <div className="who">
                      <div className="player">{person?.name}</div>
                      <div className={deck ? 'commander' : 'commander commander-none'}>
                        {deck ? deck.commander.name : 'sem deck cadastrado'}
                      </div>
                    </div>
                  </div>
                  {deck && (
                    <div className="result-art">
                      <CardImage
                        src={deck.commander.normal}
                        name={deck.commander.name}
                        radius={12}
                      />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
