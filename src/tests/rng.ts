import type { Rng } from '../domain/rng';

/** Yields the given values in order, then repeats the sequence. */
export function sequenceRng(values: number[]): Rng {
  let index = 0;
  return () => values[index++ % values.length];
}

/** mulberry32 — deterministic for a given seed, well distributed. */
export function seededRng(seed: number): Rng {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
