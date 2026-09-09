import { beforeEach, describe, expect, test } from 'vitest';
import { usePeopleStore } from './peopleStore';
import { makeCardRef } from '../tests/factories/make-deck';

const store = () => usePeopleStore.getState();

describe('usePeopleStore', () => {
  beforeEach(() => {
    usePeopleStore.setState({ people: [], decks: [] });
  });

  test('should add a person with a trimmed name', () => {
    store().addPerson('  Ana  ');

    expect(store().people[0]).toMatchObject({ name: 'Ana', archived: false });
  });

  test('should rename a person', () => {
    store().addPerson('Ana');
    const { id } = store().people[0];

    store().renamePerson(id, 'Ana Maria');

    expect(store().people[0].name).toBe('Ana Maria');
  });

  test('should rename only the chosen person', () => {
    store().addPerson('Ana');
    store().addPerson('Bob');
    const [ana] = store().people;

    store().renamePerson(ana.id, 'Ana Maria');

    expect(store().people.map((person) => person.name)).toEqual(['Ana Maria', 'Bob']);
  });

  test('should archive a person instead of deleting the record', () => {
    store().addPerson('Ana');
    const { id } = store().people[0];

    store().archivePerson(id);

    expect(store().people).toHaveLength(1);
    expect(store().people[0].archived).toBe(true);
  });

  test('should archive the decks of an archived person', () => {
    store().addPerson('Ana');
    const person = store().people[0];
    store().addDeck(person.id, makeCardRef());

    store().archivePerson(person.id);

    expect(store().decks[0].archived).toBe(true);
  });

  test('should keep the decks of other people active when one is archived', () => {
    store().addPerson('Ana');
    store().addPerson('Bob');
    const [ana, bob] = store().people;
    store().addDeck(ana.id, makeCardRef());
    store().addDeck(bob.id, makeCardRef());

    store().archivePerson(ana.id);

    const bobDeck = store().decks.find((deck) => deck.personId === bob.id);
    expect(bobDeck?.archived).toBe(false);
  });

  test('should archive a single deck without touching its owner', () => {
    store().addPerson('Ana');
    const person = store().people[0];
    store().addDeck(person.id, makeCardRef());

    store().archiveDeck(store().decks[0].id);

    expect(store().decks[0].archived).toBe(true);
    expect(store().people[0].archived).toBe(false);
  });

  test('should archive only the chosen deck', () => {
    store().addPerson('Ana');
    const person = store().people[0];
    store().addDeck(person.id, makeCardRef({ name: 'Primeiro' }));
    store().addDeck(person.id, makeCardRef({ name: 'Segundo' }));

    store().archiveDeck(store().decks[0].id);

    expect(store().decks.map((deck) => deck.archived)).toEqual([true, false]);
  });

  test('should replace everything when a backup is imported', () => {
    store().addPerson('Ana');

    store().replaceAll([], []);

    expect(store().people).toEqual([]);
    expect(store().decks).toEqual([]);
  });
});
