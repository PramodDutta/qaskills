import { isRecentlyAdded } from './skill-recency';
import { getSkillLaunchDate } from './skill-launch-dates';

export const HIGHLIGHTED_SKILL_SLUGS = new Set([
  'playwright-e2e',
  'playwright-cli',
  'playwright-advance-e2e',
  'playwright-skill-enhanced',
  'selenium-java',
  'selenium-advance-pom',
]);

export function isHighlightedSkill(slug: string): boolean {
  return HIGHLIGHTED_SKILL_SLUGS.has(slug);
}

export function getSkillPromotionLabel(
  slug: string,
  createdAt: string | Date | null | undefined,
): 'NEW' | 'HOT' | null {
  if (!isHighlightedSkill(slug)) return null;

  // Curated launches can predate their database import, so their announced date is authoritative.
  const effectiveCreatedAt = getSkillLaunchDate(slug) ?? createdAt;
  return isRecentlyAdded(effectiveCreatedAt) ? 'NEW' : 'HOT';
}
