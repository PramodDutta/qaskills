import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSkillPromotionLabel,
  HIGHLIGHTED_SKILL_SLUGS,
  isHighlightedSkill,
} from './skills-promotion';
import { getSkillLaunchDate, PLAYWRIGHT_CLI_LAUNCH_DATE } from './skill-launch-dates';

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
    vi.setSystemTime(new Date(PLAYWRIGHT_CLI_LAUNCH_DATE));

    expect(getSkillPromotionLabel('playwright-cli', PLAYWRIGHT_CLI_LAUNCH_DATE)).toBe('NEW');
  });

  it('uses the curated launch date when an existing database row is older', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(PLAYWRIGHT_CLI_LAUNCH_DATE));

    expect(getSkillPromotionLabel('playwright-cli', '2025-01-01T00:00:00.000Z')).toBe('NEW');
  });

  it('marks older highlighted skills as HOT', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T00:00:00.000Z'));

    expect(getSkillPromotionLabel('playwright-e2e', '2026-02-01T00:00:00.000Z')).toBe('HOT');
  });

  it('does not promote non-highlighted skills', () => {
    expect(getSkillPromotionLabel('jest-unit', '2026-04-01T00:00:00.000Z')).toBeNull();
  });

  it('assigns the fixed launch date only to playwright-cli seed updates', () => {
    expect(getSkillLaunchDate('playwright-cli')?.toISOString()).toBe(PLAYWRIGHT_CLI_LAUNCH_DATE);
    expect(getSkillLaunchDate('playwright-e2e')).toBeUndefined();
  });
});
