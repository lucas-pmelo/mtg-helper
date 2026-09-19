import { describe, expect, test } from 'vitest';
import { checkMatch } from './checkMatch';
import { makeMatch } from '../../tests/factories/make-match';
import { makeCardRef, makeDeck } from '../../tests/factories/make-deck';

describe('checkMatch', () => {
  test('should return null when the match is valid', () => {
    expect(checkMatch(makeMatch())).toBeNull();
  });

  test('should reject a match with fewer than two participants', () => {
    const match = makeMatch({ participants: [{ personId: 'ana', deckId: 'ana-1' }] });

    expect(checkMatch(match)).toBe('Registre ao menos 2 participantes');
  });

  test('should reject a winner that is not among the participants', () => {
    const match = makeMatch({ winnerPersonId: 'carol' });

    expect(checkMatch(match)).toBe('O vencedor precisa ser um dos participantes');
  });

  test('should reject the same person listed twice', () => {
    const match = makeMatch({
      participants: [
        { personId: 'ana', deckId: 'ana-1' },
        { personId: 'ana', deckId: 'ana-2' },
      ],
    });

    expect(checkMatch(match)).toBe('Cada jogador só pode aparecer uma vez na partida');
  });

  test('should accept a player using a deck owned by someone else', () => {
    const decks = [
      makeDeck({ id: 'ana-1', personId: 'ana' }),
      makeDeck({ id: 'bob-1', personId: 'bob' }),
    ];
    const match = makeMatch({
      participants: [
        { personId: 'ana', deckId: 'bob-1' },
        { personId: 'bob', deckId: 'ana-1' },
      ],
    });

    expect(checkMatch(match, decks)).toBeNull();
  });

  test('should reject the same deck listed twice', () => {
    const match = makeMatch({
      participants: [
        { personId: 'ana', deckId: 'ana-1' },
        { personId: 'bob', deckId: 'ana-1' },
      ],
    });

    expect(checkMatch(match)).toBe('Cada deck só pode aparecer uma vez na partida');
  });

  test('should reject two commanders of the same precon, which are one deck', () => {
    const decks = [
      makeDeck({ id: 'thing', commander: makeCardRef({ name: 'The Thing' }) }),
      makeDeck({ id: 'torch', commander: makeCardRef({ name: 'Human Torch, Johnny Storm' }) }),
    ];
    const match = makeMatch({
      participants: [
        { personId: 'ana', deckId: 'thing' },
        { personId: 'bob', deckId: 'torch' },
      ],
    });

    expect(checkMatch(match, decks)).toBe(
      'Os comandantes do mesmo precon são um deck só: escolha outro',
    );
  });

  test('should reject a participant without a deck', () => {
    const match = makeMatch({
      participants: [
        { personId: 'ana', deckId: 'ana-1' },
        { personId: 'bob', deckId: '' },
      ],
    });

    expect(checkMatch(match)).toBe('Escolha um deck para cada participante');
  });
});
