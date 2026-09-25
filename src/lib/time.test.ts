import { describe, expect, test } from 'vitest';
import { dayLabel } from './time';

describe('dayLabel', () => {
  // Built from local-time parts so the assertions hold in any timezone.
  const now = new Date(2026, 8, 23, 12, 0);
  const at = (year: number, month: number, day: number, hour = 9) =>
    new Date(year, month, day, hour).toISOString();

  test('names today and yesterday', () => {
    expect(dayLabel(at(2026, 8, 23), now)).toBe('Today');
    expect(dayLabel(at(2026, 8, 22, 23), now)).toBe('Yesterday');
  });

  test('uses the weekday and date for earlier days of the same year', () => {
    expect(dayLabel(at(2026, 8, 19), now)).toBe('Sat, Sep 19');
  });

  test('adds the year for other years', () => {
    expect(dayLabel(at(2025, 11, 31), now)).toBe('Wed, Dec 31, 2025');
  });
});
