import { useState } from 'react';
import {
  OPTIONS_PER_TURN,
  checkDraftStart,
  pickInDraft,
  startDraft,
  type DraftContext,
  type DraftState,
} from '../../domain/commanders/draft';
import {
  checkDraw,
  drawCommanders,
  type CommanderAssignment,
  type DrawMode,
} from '../../domain/commanders/drawCommanders';
import { benched, checkLiveStart, toParticipants } from '../../domain/history/liveMatch';
import { currentSeason, matchesInSeason } from '../../domain/history/seasons';
import { today } from '../../domain/history/today';
import { defaultRng } from '../../domain/rng';
import type { Id } from '../../domain/types';
import { useHistoryStore } from '../../stores/historyStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { CardImage } from '../components/CardImage';
import { Icon } from '../components/Icon';
import { Switch } from '../components/Switch';

export function CommandersScreen() {
  const { people, decks } = usePeopleStore();
  const { matches, seasons, startLive } = useHistoryStore();
  const [presentIds, setPresentIds] = useState<Id[]>([]);
  const [mode, setMode] = useState<DrawMode>('own');
  const [avoidRepeat, setAvoidRepeat] = useState(false);
  const [handicap, setHandicap] = useState(false);
  const [draftMode, setDraftMode] = useState(false);
  const [result, setResult] = useState<CommanderAssignment[] | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);

  const activePeople = people.filter((person) => !person.archived);
  const presentPlayers = activePeople.filter((person) => presentIds.includes(person.id));

  // Duas janelas de propósito: o handicap pesa pela temporada corrente (o mesmo
  // recomeço que a temporada promete), a anti-repetição olha o histórico inteiro,
  // senão a primeira sessão de uma temporada nova não teria sessão anterior.
  const day = today();
  const season = currentSeason(seasons, day);
  const scopedMatches = season ? matchesInSeason(matches, season) : matches;

  const context: DraftContext = {
    decks,
    mode,
    matches,
    handicapMatches: scopedMatches,
    today: day,
    avoidRepeat,
    handicap,
  };
  const blockingReason = draftMode
    ? checkDraftStart(presentPlayers, context)
    : checkDraw(presentPlayers, decks, mode);

  function reset() {
    setResult(null);
    setDraft(null);
  }

  function togglePresent(id: Id) {
    reset();
    setPresentIds((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    );
  }

  /** Um draft que termina sem escolha alguma cai direto no resultado. */
  function show(state: DraftState) {
    if (state.done) {
      setDraft(null);
      setResult(state.picks);
      return;
    }

    setDraft(state);
    setResult(null);
  }

  function start() {
    if (draftMode) {
      show(startDraft(presentPlayers, context, defaultRng));
      return;
    }

    setResult(
      drawCommanders(presentPlayers, decks, mode, defaultRng, {
        matches,
        handicapMatches: scopedMatches,
        today: day,
        avoidRepeat,
        handicap,
      }),
    );
  }

  function pick(state: DraftState, deckId: Id) {
    show(pickInDraft(state, deckId, context, defaultRng));
  }

  const startLabel = draftMode ? 'Começar draft' : 'Sortear';
  const liveReason = result ? checkLiveStart(result) : null;

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
            reset();
          }}
        >
          Próprios decks
        </button>
        <button
          type="button"
          aria-pressed={mode === 'pool'}
          onClick={() => {
            setMode('pool');
            reset();
          }}
        >
          Pool único
        </button>
      </div>

      <div className="stack stack-tight gap-top">
        <Switch
          label="Evitar repetição"
          hint="pula o deck da última sessão"
          checked={avoidRepeat}
          onChange={(next) => {
            setAvoidRepeat(next);
            reset();
          }}
        />
        <Switch
          label="Equilibrar"
          hint="quem ganha menos sai mais"
          checked={handicap}
          onChange={(next) => {
            setHandicap(next);
            reset();
          }}
        />
        <Switch
          label="Draft"
          hint={`cada um escolhe entre ${OPTIONS_PER_TURN}`}
          checked={draftMode}
          onChange={(next) => {
            setDraftMode(next);
            reset();
          }}
        />
      </div>

      {/* Com o resultado na tela, sortear de novo vive junto dele: depois de
          rolar por cartas grandes, ninguém quer voltar ao topo. */}
      {!result && (
        <>
          <button className="btn gap-top" type="button" disabled={!!blockingReason} onClick={start}>
            {startLabel}
          </button>

          {blockingReason && <p className="error">{blockingReason}</p>}
        </>
      )}

      {draft && (
        <>
          <h2>Draft</h2>
          <section className="card draft-turn">
            <div>
              <span className="label">Na vez</span>
              <span className="player">
                {people.find((person) => person.id === draft.order[draft.turn])?.name}
              </span>
            </div>
            <span className="pill">
              {draft.picks.length + 1} de {draft.order.length}
            </span>
          </section>

          <div className="draft-options gap-top">
            {draft.options
              .flatMap((deckId) => decks.filter((deck) => deck.id === deckId))
              .map((deck) => (
                <button
                  className="draft-option"
                  key={deck.id}
                  type="button"
                  onClick={() => pick(draft, deck.id)}
                >
                  <CardImage src={deck.commander.normal} name={deck.commander.name} radius={10} />
                  <span className="name">{deck.commander.name}</span>
                </button>
              ))}
          </div>
        </>
      )}

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
                      {assignment.repeated && (
                        <div className="repeat-note">mesmo deck da última sessão — sem alternativa</div>
                      )}
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

          <div className="form-actions gap-top">
            <button
              className="btn"
              type="button"
              disabled={Boolean(liveReason)}
              onClick={() => startLive(toParticipants(result), benched(result))}
            >
              Iniciar partida
            </button>
            <button className="btn btn-secondary" type="button" onClick={start}>
              Sortear de novo
            </button>
          </div>

          {liveReason && <p className="error">{liveReason}</p>}
        </>
      )}
    </div>
  );
}
