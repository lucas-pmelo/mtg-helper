import { describe, expect, test } from 'vitest';
import { toLocalDate, today } from './today';

describe('toLocalDate', () => {
  test('should format a date as YYYY-MM-DD', () => {
    expect(toLocalDate(new Date(2026, 8, 9, 13, 30))).toBe('2026-09-09');
  });

  test('should pad month and day to two digits', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  test('should use the local day and not the UTC day late at night', () => {
    expect(toLocalDate(new Date(2026, 8, 9, 23, 30))).toBe('2026-09-09');
  });
});

describe('today', () => {
  test('should return the current local date', () => {
    expect(today()).toBe(toLocalDate(new Date()));
  });
});
