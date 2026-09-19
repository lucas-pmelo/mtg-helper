import { describe, expect, test } from 'vitest';
import { collapseGroups, groupOf, withoutGroupMates } from './deckGroups';
import { makeCardRef, makeDeck } from '../../tests/factories/make-deck';
import { sequenceRng } from '../../tests/rng';

function quartetDeck(id: string, commanderName: string) {
  return makeDeck({ id, commander: makeCardRef({ name: commanderName }) });
}

describe('groupOf', () => {
  test('should give the same group to every Fantastic Four commander', () => {
    const names = ['The Thing', 'Invisible Woman', 'Human Torch', 'Mister Fantastic'];
    const groups = names.map((name) => groupOf(quartetDeck('deck', name)));

    expect(new Set(groups).size).toBe(1);
    expect(groups[0]).toBe('quarteto-fantastico');
  });

  test('should match the printing that carries the civil name after the comma', () => {
    expect(groupOf(quartetDeck('deck', 'The Thing, Ben Grimm'))).toBe('quarteto-fantastico');
  });

  test('should give no group to a commander outside a known precon', () => {
    expect(groupOf(makeDeck())).toBeNull();
  });
});

describe('withoutGroupMates', () => {
  test('should drop the candidates that share a group with a taken deck', () => {
    const torch = quartetDeck('torch', 'Human Torch');
    const thing = quartetDeck('thing', 'The Thing, Ben Grimm');
    const atraxa = makeDeck({ id: 'atraxa' });

    expect(withoutGroupMates([torch, atraxa], [thing])).toEqual([atraxa]);
  });

  test('should keep every candidate when no taken deck belongs to a group', () => {
    const candidates = [makeDeck({ id: 'a' }), makeDeck({ id: 'b' })];

    expect(withoutGroupMates(candidates, [makeDeck({ id: 'c' })])).toEqual(candidates);
  });
});

describe('collapseGroups', () => {
  test('should leave a single deck of each group in the pool', () => {
    const quartet = ['The Thing', 'Invisible Woman', 'Human Torch', 'Mister Fantastic'].map(
      (name, index) => quartetDeck(`q${index}`, name),
    );
    const atraxa = makeDeck({ id: 'atraxa' });

    const collapsed = collapseGroups([...quartet, atraxa], sequenceRng([0]));

    expect(collapsed).toHaveLength(2);
    expect(collapsed.map((deck) => deck.id)).toContain('atraxa');
  });

  test('should let chance decide which member of the group stays', () => {
    const quartet = ['The Thing', 'Invisible Woman', 'Human Torch', 'Mister Fantastic'].map(
      (name, index) => quartetDeck(`q${index}`, name),
    );

    const first = collapseGroups(quartet, sequenceRng([0]));
    const last = collapseGroups(quartet, sequenceRng([0.99]));

    expect(first[0].id).toBe('q0');
    expect(last[0].id).toBe('q3');
  });

  test('should keep the pool untouched when nothing belongs to a group', () => {
    const decks = [makeDeck({ id: 'a' }), makeDeck({ id: 'b' })];

    expect(collapseGroups(decks, sequenceRng([0]))).toEqual(decks);
  });
});
