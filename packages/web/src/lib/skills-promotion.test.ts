import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSkillPromotionLabel,
  HIGHLIGHTED_SKILL_SLUGS,
  isHighlightedSkill,
} from './skills-promotion';

describe('skills promotion helpers', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps playwright-cli in the highlighted launch set', () => {
    expect(HIGHLIGHTED_SKILL_SLUGS.has('playwright-cli')).toBe(true);
    expect(isHighlightedSkill('playwright-cli')).toBe(true);
  });

  it('marks recent highlighted skills as NEW', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));

    expect(getSkillPromotionLabel('playwright-cli', '2026-04-01T00:00:00.000Z')).toBe('NEW');
  });

  it('marks older highlighted skills as HOT', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));

    expect(getSkillPromotionLabel('playwright-e2e', '2026-02-01T00:00:00.000Z')).toBe('HOT');
  });

  it('does not promote non-highlighted skills', () => {
    expect(getSkillPromotionLabel('jest-unit', '2026-04-01T00:00:00.000Z')).toBeNull();
  });
});
