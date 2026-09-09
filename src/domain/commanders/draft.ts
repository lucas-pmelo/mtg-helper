import { shuffle, type Rng } from '../rng';
import type { Deck, Id, Match, Person } from '../types';
import { eligibleDecks, isRepeat } from './eligibleDecks';
import { checkDraw, type CommanderAssignment, type DrawMode } from './drawCommanders';
import { pickWeighted } from './weightsFor';

export const OPTIONS_PER_TURN = 3;

export type DraftContext = {
  decks: readonly Deck[];
  mode: DrawMode;
  /** Full history: the anti-repeat window is the player's own last played day. */
  matches: readonly Match[];
  /** History the handicap weighs, season-scoped by the caller. */
  handicapMatches: readonly Match[];
  today: string;
  avoidRepeat: boolean;
  handicap: boolean;
};

export type DraftState = {
  /** Shuffled: picking first is an advantage, so it cannot always be the same player. */
  order: Id[];
  turn: number;
  /** What the player on turn may choose from. Never empty unless the draft is done. */
  options: Id[];
  picks: CommanderAssignment[];
  /** Decks already chosen; only a pool draft takes them out of circulation. */
  taken: Id[];
  done: boolean;
};

/** The draft needs the same table the dry draw needs — nothing more. */
export function checkDraftStart(
  presentPlayers: readonly Person[],
  context: DraftContext,
): string | null {
  return checkDraw(presentPlayers, context.decks, context.mode);
}

function poolCandidates(state: DraftState, context: DraftContext): Deck[] {
  const pool = context.decks.filter(
    (deck) =>
      !deck.archived && state.order.includes(deck.personId) && !state.taken.includes(deck.id),
  );
  if (!context.avoidRepeat) return pool;

  const personId = state.order[state.turn];
  const fresh = pool.filter((deck) => !isRepeat(context.matches, personId, deck.id, context.today));

  return fresh.length > 0 ? fresh : pool;
}

function candidatesFor(state: DraftState, context: DraftContext): Deck[] {
  const personId = state.order[state.turn];

  if (context.mode === 'pool') return poolCandidates(state, context);

  return context.avoidRepeat
    ? eligibleDecks(context.decks, context.matches, personId, context.today)
    : context.decks.filter((deck) => !deck.archived && deck.personId === personId);
}

function optionsFor(state: DraftState, context: DraftContext, rng: Rng): Id[] {
  const candidates = candidatesFor(state, context);

  return context.handicap
    ? pickWeighted(candidates, context.handicapMatches, OPTIONS_PER_TURN, rng)
    : shuffle(candidates, rng)
        .slice(0, OPTIONS_PER_TURN)
        .map((deck) => deck.id);
}

/**
 * Moves to the next player who actually has something to choose. A player with no
 * deck available is seated without a commander, the same way the dry draw does it.
 */
function advance(state: DraftState, context: DraftContext, rng: Rng): DraftState {
  const picks = [...state.picks];
  let turn = state.turn;

  while (turn < state.order.length) {
    const options = optionsFor({ ...state, turn }, context, rng);
    if (options.length > 0) return { ...state, turn, options, picks, done: false };

    picks.push({ personId: state.order[turn], deckId: null });
    turn++;
  }

  return { ...state, turn, options: [], picks, done: true };
}

export function startDraft(
  presentPlayers: readonly Person[],
  context: DraftContext,
  rng: Rng,
): DraftState {
  const reason = checkDraftStart(presentPlayers, context);
  if (reason) throw new Error(reason);

  const order = shuffle(presentPlayers, rng).map((player) => player.id);

  return advance({ order, turn: 0, options: [], picks: [], taken: [], done: false }, context, rng);
}

export function pickInDraft(
  state: DraftState,
  deckId: Id,
  context: DraftContext,
  rng: Rng,
): DraftState {
  if (state.done) throw new Error('The draft is already done');
  if (!state.options.includes(deckId)) {
    throw new Error(`Deck ${deckId} is not among the current options`);
  }

  const personId = state.order[state.turn];
  const pick: CommanderAssignment =
    context.avoidRepeat && isRepeat(context.matches, personId, deckId, context.today)
      ? { personId, deckId, repeated: true }
      : { personId, deckId };

  return advance(
    {
      ...state,
      turn: state.turn + 1,
      options: [],
      picks: [...state.picks, pick],
      taken: context.mode === 'pool' ? [...state.taken, deckId] : state.taken,
    },
    context,
    rng,
  );
}
