import { describe, expect, it } from 'vitest';
import { metadata as authMetadata } from './(auth)/layout';
import robots from './robots';

describe('auth indexation controls', () => {
  it('marks all auth routes noindex and nofollow', () => {
    expect(authMetadata.robots).toMatchObject({ index: false, follow: false });
  });

  it('allows crawlers to read noindex on exact and nested auth routes', () => {
    const rules = robots().rules;
    const ruleList = Array.isArray(rules) ? rules : [rules];
    const disallow = ruleList.flatMap((rule) => {
      if (!rule?.disallow) return [];
      return Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    });

    for (const authPath of ['/sign-in', '/sign-in/continue', '/sign-up', '/sign-up/verify']) {
      expect(
        disallow.some((pattern) => authPath.startsWith(pattern)),
        authPath,
      ).toBe(false);
    }
  });
});
