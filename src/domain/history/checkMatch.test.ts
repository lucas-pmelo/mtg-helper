import { describe, expect, test } from 'vitest';
import { checkMatch } from './checkMatch';
import { makeMatch } from '../../tests/factories/make-match';

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
