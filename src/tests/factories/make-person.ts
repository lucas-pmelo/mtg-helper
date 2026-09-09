import type { Person } from '../../domain/types';

export function makePerson(override: Partial<Person> = {}): Person {
  return {
    id: 'person-1',
    name: 'Ana',
    archived: false,
    ...override,
  };
}
