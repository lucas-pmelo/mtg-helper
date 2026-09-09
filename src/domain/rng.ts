export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
