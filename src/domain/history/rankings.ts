import type { CardRef, Deck, Id, Match, Person } from '../types';

export type PlayerStat = {
  personId: Id;
  name: string;
  wins: number;
  played: number;
  winRate: number;
};

export type DeckStat = {
  deckId: Id;
  personId: Id;
  commander: CardRef;
  wins: number;
  played: number;
  winRate: number;
};

export type DayWinner = {
  personId: Id;
  wins: number;
};

export type DaySummary = {
  playedOn: string;
  matches: Match[];
  winners: DayWinner[];
};

type Performance = {
  wins: number;
  winRate: number;
};

function winRateOf(wins: number, played: number): number {
  return played === 0 ? 0 : wins / played;
}

function compareByPerformance(a: Performance, b: Performance): number {
  return b.wins - a.wins || b.winRate - a.winRate;
}

export function computePlayerRanking(matches: readonly Match[], people: readonly Person[]): PlayerStat[] {
  return people
    .map((person) => {
      const playedMatches = matches.filter((match) =>
        match.participants.some((participant) => participant.personId === person.id),
      );
      const wins = playedMatches.filter((match) => match.winnerPersonId === person.id).length;

      return {
        personId: person.id,
        name: person.name,
        wins,
        played: playedMatches.length,
        winRate: winRateOf(wins, playedMatches.length),
      };
    })
    .filter((stat, index) => !people[index].archived || stat.played > 0)
    .sort((a, b) => compareByPerformance(a, b) || a.name.localeCompare(b.name));
}

export function computeDeckRanking(matches: readonly Match[], decks: readonly Deck[]): DeckStat[] {
  return decks
    .map((deck) => {
      const playedMatches = matches.filter((match) =>
        match.participants.some((participant) => participant.deckId === deck.id),
      );
      const wins = playedMatches.filter((match) =>
        match.participants.some(
          (participant) =>
            participant.deckId === deck.id && participant.personId === match.winnerPersonId,
        ),
      ).length;

      return {
        deckId: deck.id,
        personId: deck.personId,
        commander: deck.commander,
        wins,
        played: playedMatches.length,
        winRate: winRateOf(wins, playedMatches.length),
      };
    })
    .filter((stat, index) => !decks[index].archived || stat.played > 0)
    .sort((a, b) => compareByPerformance(a, b) || a.commander.name.localeCompare(b.commander.name));
}

function winnersOf(matches: readonly Match[]): DayWinner[] {
  const wins = new Map<Id, number>();

  for (const match of matches) {
    wins.set(match.winnerPersonId, (wins.get(match.winnerPersonId) ?? 0) + 1);
  }

  return [...wins.entries()]
    .map(([personId, count]) => ({ personId, wins: count }))
    .sort((a, b) => b.wins - a.wins || a.personId.localeCompare(b.personId));
}

export function groupMatchesByDay(matches: readonly Match[]): DaySummary[] {
  const byDay = new Map<string, Match[]>();

  for (const match of matches) {
    const dayMatches = byDay.get(match.playedOn) ?? [];
    dayMatches.push(match);
    byDay.set(match.playedOn, dayMatches);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([playedOn, dayMatches]) => ({
      playedOn,
      matches: dayMatches,
      winners: winnersOf(dayMatches),
    }));
}
