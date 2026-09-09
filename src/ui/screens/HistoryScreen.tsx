import { useState } from 'react';
import {
  computeDeckRanking,
  computePlayerRanking,
  groupMatchesByDay,
} from '../../domain/history/rankings';
import type { Id, Match } from '../../domain/types';
import { useHistoryStore } from '../../stores/historyStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { CommanderRow } from '../components/CommanderRow';
import { MatchForm } from './MatchForm';

type Tab = 'days' | 'players' | 'decks';

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function HistoryScreen() {
  const { matches, addMatch, updateMatch, removeMatch } = useHistoryStore();
  const { people, decks } = usePeopleStore();
  const [tab, setTab] = useState<Tab>('days');
  const [editing, setEditing] = useState<Match | null>(null);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<'all' | string>('all');

  const days = groupMatchesByDay(matches);
  const nameOf = (personId: Id) =>
    people.find((person) => person.id === personId)?.name ?? 'Desconhecido';
  const deckOf = (deckId: Id) => decks.find((deck) => deck.id === deckId);

  const scopedMatches = scope === 'all' ? matches : matches.filter((match) => match.playedOn === scope);
  const playerRanking = computePlayerRanking(scopedMatches, people);
  const deckRanking = computeDeckRanking(scopedMatches, decks);

  if (creating || editing) {
    return (
      <div className="screen">
        <h1>{editing ? 'Editar partida' : 'Nova partida'}</h1>
        <MatchForm
          initial={editing ?? undefined}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(draft) => {
            if (editing) updateMatch(editing.id, draft);
            else addMatch(draft);

            setCreating(false);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>Histórico</h1>

      <button className="btn" type="button" onClick={() => setCreating(true)}>
        + Nova partida
      </button>

      <div className="segmented" style={{ marginTop: 16 }}>
        <button type="button" aria-pressed={tab === 'days'} onClick={() => setTab('days')}>
          Por dia
        </button>
        <button type="button" aria-pressed={tab === 'players'} onClick={() => setTab('players')}>
          Jogadores
        </button>
        <button type="button" aria-pressed={tab === 'decks'} onClick={() => setTab('decks')}>
          Decks
        </button>
      </div>

      {matches.length === 0 && <p className="empty">Nenhuma partida registrada ainda.</p>}

      {tab === 'days' &&
        days.map((day) => (
          <section key={day.playedOn}>
            <div className="day-header">
              <span className="date">{formatDay(day.playedOn)}</span>
              <span className="muted">
                {day.winners.map((winner) => `${nameOf(winner.personId)} ${winner.wins}`).join(' · ')}
              </span>
            </div>

            <div className="stack">
              {day.matches.map((match) => (
                <article className="card" key={match.id}>
                  <div className="stack">
                    {match.participants.map((participant) => {
                      const deck = deckOf(participant.deckId);
                      const won = participant.personId === match.winnerPersonId;

                      return (
                        <div
                          className="row"
                          key={participant.personId}
                          style={{ justifyContent: 'space-between' }}
                        >
                          {deck ? (
                            <CommanderRow
                              commander={deck.commander}
                              subtitle={nameOf(participant.personId)}
                            />
                          ) : (
                            <span>{nameOf(participant.personId)}</span>
                          )}
                          {won && <span className="winner-badge">venceu</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="row" style={{ marginTop: 12 }}>
                    <button
                      className="btn btn-secondary btn-slim"
                      type="button"
                      onClick={() => setEditing(match)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-danger btn-slim"
                      type="button"
                      onClick={() => {
                        if (confirm('Apagar esta partida?')) removeMatch(match.id);
                      }}
                    >
                      Apagar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

      {tab !== 'days' && (
        <>
          <h2>Período</h2>
          <select
            value={scope}
            aria-label="Período"
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="all">Tudo</option>
            {days.map((day) => (
              <option value={day.playedOn} key={day.playedOn}>
                {formatDay(day.playedOn)}
              </option>
            ))}
          </select>

          <div className="card" style={{ marginTop: 12 }}>
            {tab === 'players' &&
              playerRanking.map((stat, index) => (
                <div className="rank-row" key={stat.personId}>
                  <span className="rank-pos">{index + 1}</span>
                  <span className="rank-main">{stat.name}</span>
                  <span className="rank-stats">
                    <strong>{stat.wins}</strong> / {stat.played} · {percent(stat.winRate)}
                  </span>
                </div>
              ))}

            {tab === 'decks' &&
              deckRanking.map((stat, index) => (
                <div className="rank-row" key={stat.deckId}>
                  <span className="rank-pos">{index + 1}</span>
                  <span className="rank-main">
                    <CommanderRow
                      commander={stat.commander}
                      subtitle={nameOf(stat.personId)}
                      size={40}
                    />
                  </span>
                  <span className="rank-stats">
                    <strong>{stat.wins}</strong> / {stat.played} · {percent(stat.winRate)}
                  </span>
                </div>
              ))}

            {playerRanking.length === 0 && deckRanking.length === 0 && (
              <p className="muted">Nada para exibir.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
