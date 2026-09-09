import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../data/storage';
import type { CardRef, Deck, Id, Person } from '../domain/types';

type PeopleState = {
  people: Person[];
  decks: Deck[];
  addPerson: (name: string) => void;
  renamePerson: (id: Id, name: string) => void;
  archivePerson: (id: Id) => void;
  addDeck: (personId: Id, commander: CardRef) => void;
  archiveDeck: (id: Id) => void;
  replaceAll: (people: Person[], decks: Deck[]) => void;
};

export const usePeopleStore = create<PeopleState>()(
  persist(
    (set) => ({
      people: [],
      decks: [],

      addPerson: (name) =>
        set((state) => ({
          people: [...state.people, { id: crypto.randomUUID(), name: name.trim(), archived: false }],
        })),

      renamePerson: (id, name) =>
        set((state) => ({
          people: state.people.map((person) =>
            person.id === id ? { ...person, name: name.trim() } : person,
          ),
        })),

      // Archiving instead of deleting keeps old matches renderable.
      archivePerson: (id) =>
        set((state) => ({
          people: state.people.map((person) =>
            person.id === id ? { ...person, archived: true } : person,
          ),
          decks: state.decks.map((deck) =>
            deck.personId === id ? { ...deck, archived: true } : deck,
          ),
        })),

      addDeck: (personId, commander) =>
        set((state) => ({
          decks: [...state.decks, { id: crypto.randomUUID(), personId, commander, archived: false }],
        })),

      archiveDeck: (id) =>
        set((state) => ({
          decks: state.decks.map((deck) => (deck.id === id ? { ...deck, archived: true } : deck)),
        })),

      replaceAll: (people, decks) => set({ people, decks }),
    }),
    { name: STORAGE_KEYS.people },
  ),
);
