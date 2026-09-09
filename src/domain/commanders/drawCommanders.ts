import { shuffle, type Rng } from '../rng';
import type { Deck, Id, Match, Person } from '../types';
import { eligibleDecks, isRepeat } from './eligibleDecks';
import { pickWeighted } from './weightsFor';

export type DrawMode = 'own' | 'pool';

export type CommanderAssignment = {
  personId: Id;
  /** Null when the player owns no deck: they are at the table without a commander. */
  deckId: Id | null;
  /** True when anti-repeat had to give back a deck for lack of an alternative. */
  repeated?: boolean;
};

/** Everything the smart draw needs on top of the dry one. Without it, nothing changes. */
export type DrawOptions = {
  /** Full history: the anti-repeat window is the player's own last played day. */
  matches?: readonly Match[];
  /**
   * History the handicap weighs, season-scoped by the caller. Defaults to
   * `matches`: the two windows differ on purpose, so a brand new season does not
   * blind the anti-repeat as well.
   */
  handicapMatches?: readonly Match[];
  today?: string;
  avoidRepeat?: boolean;
  handicap?: boolean;
};

const MIN_PLAYERS = 2;

function decksOf(person: Person, decks: readonly Deck[]): Deck[] {
  return decks.filter((deck) => !deck.archived && deck.personId === person.id);
}

function poolOf(presentPlayers: readonly Person[], decks: readonly Deck[]): Deck[] {
  return presentPlayers.flatMap((player) => decksOf(player, decks));
}

/**
 * Reason the draw cannot happen, or null when it can.
 * The screen uses it to disable the button and say why.
 */
export function checkDraw(
  presentPlayers: readonly Person[],
  decks: readonly Deck[],
  mode: DrawMode,
): string | null {
  if (presentPlayers.length < MIN_PLAYERS) {
    return `Selecione ao menos ${MIN_PLAYERS} jogadores`;
  }

  if (mode === 'own') return null;

  const pool = poolOf(presentPlayers, decks);
  const missingDecks = presentPlayers.length - pool.length;

  if (missingDecks > 0) {
    return `O pool tem ${pool.length} decks para ${presentPlayers.length} jogadores: faltam ${missingDecks}`;
  }

  return null;
}

function drawOwn(
  presentPlayers: readonly Person[],
  decks: readonly Deck[],
  rng: Rng,
  options: Required<DrawOptions>,
): CommanderAssignment[] {
  const { matches, handicapMatches, today, avoidRepeat, handicap } = options;

  return presentPlayers.map((player) => {
    const own = decksOf(player, decks);
    if (own.length === 0) return { personId: player.id, deckId: null };

    const candidates = avoidRepeat ? eligibleDecks(decks, matches, player.id, today) : own;
    const deckId = handicap
      ? pickWeighted(candidates, handicapMatches, 1, rng)[0]
      : candidates[Math.floor(rng() * candidates.length)].id;

    return avoidRepeat && isRepeat(matches, player.id, deckId, today)
      ? { personId: player.id, deckId, repeated: true }
      : { personId: player.id, deckId };
  });
}

function drawPool(
  presentPlayers: readonly Person[],
  decks: readonly Deck[],
  rng: Rng,
  options: Required<DrawOptions>,
): CommanderAssignment[] {
  const pool = poolOf(presentPlayers, decks);

  // An exact pool has nothing to choose from: every deck plays either way, so the
  // handicap must not pretend to weigh it.
  const entering =
    options.handicap && pool.length > presentPlayers.length
      ? pickWeighted(pool, options.handicapMatches, presentPlayers.length, rng)
      : pool.map((deck) => deck.id);

  const available = shuffle(entering, rng);

  if (!options.avoidRepeat) {
    return presentPlayers.map((player, index) => ({
      personId: player.id,
      deckId: available[index],
    }));
  }

  const { matches, today } = options;

  // Hand each player a deck they did not play last session when one is left. The
  // shuffle above already decided the order, so this only reorders who gets what.
  return presentPlayers.map((player) => {
    const fresh = available.findIndex((deckId) => !isRepeat(matches, player.id, deckId, today));
    const [deckId] = available.splice(fresh === -1 ? 0 : fresh, 1);

    return isRepeat(matches, player.id, deckId, today)
      ? { personId: player.id, deckId, repeated: true }
      : { personId: player.id, deckId };
  });
}

export function drawCommanders(
  presentPlayers: readonly Person[],
  decks: readonly Deck[],
  mode: DrawMode,
  rng: Rng,
  options: DrawOptions = {},
): CommanderAssignment[] {
  const reason = checkDraw(presentPlayers, decks, mode);
  if (reason) throw new Error(reason);

  // No session date means no session to repeat: nothing is "the last one".
  const settled: Required<DrawOptions> = {
    matches: options.matches ?? [],
    handicapMatches: options.handicapMatches ?? options.matches ?? [],
    today: options.today ?? '',
    avoidRepeat: options.avoidRepeat ?? false,
    handicap: options.handicap ?? false,
  };

  return mode === 'own'
    ? drawOwn(presentPlayers, decks, rng, settled)
    : drawPool(presentPlayers, decks, rng, settled);
}
