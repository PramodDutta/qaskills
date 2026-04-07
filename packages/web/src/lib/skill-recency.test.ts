import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRecentlyAdded, NEW_SKILL_WINDOW_DAYS } from './skill-recency';

describe('isRecentlyAdded', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for skills created inside the new-skill window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));

    expect(isRecentlyAdded('2026-04-01T00:00:00.000Z')).toBe(true);
  });

  it('returns false for skills older than the new-skill window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));

    const oldDate = new Date('2026-04-15T00:00:00.000Z');
    oldDate.setDate(oldDate.getDate() - (NEW_SKILL_WINDOW_DAYS + 1));

    expect(isRecentlyAdded(oldDate.toISOString())).toBe(false);
  });

  it('returns false for missing or invalid dates', () => {
    expect(isRecentlyAdded(undefined)).toBe(false);
    expect(isRecentlyAdded(null)).toBe(false);
    expect(isRecentlyAdded('not-a-date')).toBe(false);
  });
});
