import { shuffle, type Rng } from '../rng';
import type { Deck, Id, Person } from '../types';

export type DrawMode = 'own' | 'pool';

export type CommanderAssignment = {
  personId: Id;
  deckId: Id;
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

  if (mode === 'own') {
    const playersWithoutDeck = presentPlayers.filter((player) => decksOf(player, decks).length === 0);

    if (playersWithoutDeck.length > 0) {
      const names = playersWithoutDeck.map((player) => player.name).join(', ');
      return `Cadastre ao menos um deck para: ${names}`;
    }

    return null;
  }

  const pool = poolOf(presentPlayers, decks);
  const missingDecks = presentPlayers.length - pool.length;

  if (missingDecks > 0) {
    return `O pool tem ${pool.length} decks para ${presentPlayers.length} jogadores: faltam ${missingDecks}`;
  }

  return null;
}

export function drawCommanders(
  presentPlayers: readonly Person[],
  decks: readonly Deck[],
  mode: DrawMode,
  rng: Rng,
): CommanderAssignment[] {
  const reason = checkDraw(presentPlayers, decks, mode);
  if (reason) throw new Error(reason);

  if (mode === 'own') {
    return presentPlayers.map((player) => {
      const own = decksOf(player, decks);
      return { personId: player.id, deckId: own[Math.floor(rng() * own.length)].id };
    });
  }

  const pool = shuffle(poolOf(presentPlayers, decks), rng);

  return presentPlayers.map((player, index) => ({
    personId: player.id,
    deckId: pool[index].id,
  }));
}
