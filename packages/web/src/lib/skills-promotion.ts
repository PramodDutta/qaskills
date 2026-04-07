import { isRecentlyAdded } from './skill-recency';

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
  return isRecentlyAdded(createdAt) ? 'NEW' : 'HOT';
}
