import { useState } from 'react';
import { isStale } from '../../domain/history/liveMatch';
import { today } from '../../domain/history/today';
import type { Id } from '../../domain/types';
import { useHistoryStore } from '../../stores/historyStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { formatShortDay } from '../formatDay';
import { Icon } from './Icon';

/**
 * Lives in the shell so it is a reminder instead of one more screen to visit:
 * whatever tab is open, the match is still waiting for its winner. In the flow
 * above the active screen, never over it.
 */
export function LiveMatchBar() {
  const { liveMatch, finishLive, discardLive } = useHistoryStore();
  const { people } = usePeopleStore();
  const [open, setOpen] = useState(false);

  if (!liveMatch) return null;

  const nameOf = (personId: Id) =>
    people.find((person) => person.id === personId)?.name ?? 'Jogador';

  const title = isStale(liveMatch, today())
    ? `Partida de ${formatShortDay(liveMatch.startedOn)} — quem venceu?`
    : 'Partida em andamento';

  return (
    <section className="live-bar" aria-label="Partida em andamento">
      <button
        className="live-summary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="live-dot" aria-hidden="true" />
        <span className="live-text">
          <span className="live-title">{title}</span>
          <span className="muted">{liveMatch.participants.length} jogadores</span>
        </span>
        <Icon name="chevron" size={20} className={open ? 'live-caret open' : 'live-caret'} />
      </button>

      {open && (
        <div className="live-panel">
          <span className="label">Quem venceu?</span>
          <div className="live-winners">
            {liveMatch.participants.map((participant) => (
              <button
                className="btn btn-secondary btn-slim"
                key={participant.personId}
                type="button"
                onClick={() => finishLive(participant.personId)}
              >
                {nameOf(participant.personId)}
              </button>
            ))}
          </div>

          {liveMatch.benched.map((personId) => (
            <p className="notice" key={personId}>
              {nameOf(personId)} está na mesa sem deck — não entra no registro.
            </p>
          ))}

          <button
            className="btn btn-danger btn-slim gap-top"
            type="button"
            onClick={() => {
              if (confirm('Descartar a partida em andamento?')) discardLive();
            }}
          >
            Descartar partida
          </button>
        </div>
      )}
    </section>
  );
}
