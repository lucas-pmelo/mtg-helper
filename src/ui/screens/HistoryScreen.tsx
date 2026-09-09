import { useState } from 'react';
import { computeHeadToHead } from '../../domain/history/headToHead';
import {
  computeDeckRanking,
  computePlayerRanking,
  groupMatchesByDay,
} from '../../domain/history/rankings';
import { currentSeason, matchesInSeason, sortSeasons } from '../../domain/history/seasons';
import { today } from '../../domain/history/today';
import type { Id, Match } from '../../domain/types';
import { useHistoryStore } from '../../stores/historyStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { CommanderRow } from '../components/CommanderRow';
import { MatchForm } from './MatchForm';
import { Icon } from '../components/Icon';
import { formatDay } from '../formatDay';

type Tab = 'days' | 'players' | 'decks';

const ALL_SEASONS = 'all';

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

export function HistoryScreen() {
  const { matches, seasons, addMatch, updateMatch, removeMatch } = useHistoryStore();
  const { people, decks } = usePeopleStore();
  const [tab, setTab] = useState<Tab>('days');
  const [editing, setEditing] = useState<Match | null>(null);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<'all' | string>('all');
  const [seasonId, setSeasonId] = useState<Id | typeof ALL_SEASONS>(
    () => currentSeason(seasons, today())?.id ?? ALL_SEASONS,
  );
  const [openPlayerId, setOpenPlayerId] = useState<Id | null>(null);

  const season = seasons.find((candidate) => candidate.id === seasonId);
  const seasonMatches = season ? matchesInSeason(matches, season) : matches;

  const days = groupMatchesByDay(seasonMatches);
  const nameOf = (personId: Id) =>
    people.find((person) => person.id === personId)?.name ?? 'Desconhecido';
  const deckOf = (deckId: Id) => decks.find((deck) => deck.id === deckId);

  const scopedMatches =
    scope === 'all' ? seasonMatches : seasonMatches.filter((match) => match.playedOn === scope);
  const playerRanking = computePlayerRanking(scopedMatches, people);
  const deckRanking = computeDeckRanking(scopedMatches, decks);

  if (creating || editing) {
    return (
      <div className="screen">
        <header className="screen-head">
          <div>
            <h1>{editing ? 'Editar partida' : 'Nova partida'}</h1>
            <p className="subtitle">Registro manual, independente do sorteio.</p>
          </div>
        </header>
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
      <header className="screen-head">
        <div>
          <h1>Histórico</h1>
          <p className="subtitle">
            {seasonMatches.length === 1
              ? '1 partida registrada'
              : `${seasonMatches.length} partidas registradas`}
          </p>
        </div>
      </header>

      <button className="btn" type="button" onClick={() => setCreating(true)}>
        + Nova partida
      </button>

      <label className="field gap-top">
        <span className="field-label">Temporada</span>
        <select
          value={seasonId}
          aria-label="Temporada"
          onChange={(event) => {
            setSeasonId(event.target.value);
            setScope('all');
            setOpenPlayerId(null);
          }}
        >
          {sortSeasons(seasons).map((option) => (
            <option value={option.id} key={option.id}>
              {option.name}
            </option>
          ))}
          <option value={ALL_SEASONS}>Desde sempre</option>
        </select>
      </label>

      <div className="segmented gap-top">
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

      {seasonMatches.length === 0 && (
        <p className="empty gap-top">
          <Icon name="history" size={28} className="empty-icon" />
          Nenhuma partida nesta temporada.
        </p>
      )}

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
                  <div className="stack stack-tight">
                    {match.participants.map((participant) => {
                      const deck = deckOf(participant.deckId);
                      const won = participant.personId === match.winnerPersonId;

                      return (
                        <div className="match-line" key={participant.personId} data-won={won}>
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

                  <hr className="divider" />

                  <div className="row">
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

          <div className="card gap-top">
            {tab === 'players' &&
              playerRanking.map((stat, index) => (
                <div className="rank-item" key={stat.personId}>
                  <button
                    className="rank-row rank-row-button"
                    type="button"
                    aria-expanded={openPlayerId === stat.personId}
                    onClick={() =>
                      setOpenPlayerId(openPlayerId === stat.personId ? null : stat.personId)
                    }
                  >
                    <span className="rank-pos" data-rank={index + 1}>
                      {index + 1}
                    </span>
                    <span className="rank-main">{stat.name}</span>
                    <span className="rank-stats">
                      <strong>{stat.wins}</strong>
                      {stat.played} jogos · {percent(stat.winRate)}
                    </span>
                  </button>

                  {openPlayerId === stat.personId && (
                    <Confrontations
                      confrontations={computeHeadToHead(scopedMatches, people, stat.personId)}
                    />
                  )}
                </div>
              ))}

            {tab === 'decks' &&
              deckRanking.map((stat, index) => (
                <div className="rank-row" key={stat.deckId}>
                  <span className="rank-pos" data-rank={index + 1}>
                    {index + 1}
                  </span>
                  <span className="rank-main">
                    <CommanderRow
                      commander={stat.commander}
                      subtitle={nameOf(stat.personId)}
                      size={40}
                    />
                  </span>
                  <span className="rank-stats">
                    <strong>{stat.wins}</strong>
                    {stat.played} jogos · {percent(stat.winRate)}
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

function Confrontations({
  confrontations,
}: {
  confrontations: ReturnType<typeof computeHeadToHead>;
}) {
  if (confrontations.length === 0) {
    return <p className="muted h2h-empty">Nenhuma mesa em comum ainda.</p>;
  }

  return (
    <div className="h2h">
      {confrontations.map((confrontation) => (
        <div className="h2h-row" key={confrontation.opponentId}>
          <span className="h2h-name">{confrontation.name}</span>
          <span className="h2h-score">
            <span className="h2h-cell">
              <strong>{confrontation.wins}</strong>
              você
            </span>
            <span className="h2h-cell">
              <strong>{confrontation.opponentWins}</strong>
              ele
            </span>
            <span className="h2h-cell">
              <strong>{confrontation.otherWins}</strong>
              outro
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
