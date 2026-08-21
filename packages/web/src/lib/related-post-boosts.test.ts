import { describe, expect, it } from 'vitest';
import { posts } from '../app/blog/posts';
import { isCanonicalBlogSlug } from './blog-canonical';
import { RELATED_POST_BOOSTS } from './related-post-boosts';

const DONOR_SLOT_CAP = 2;

describe('related post boosts', () => {
  it('references only registered canonical posts', () => {
    for (const [donor, targets] of Object.entries(RELATED_POST_BOOSTS)) {
      expect(posts[donor], `missing donor post: ${donor}`).toBeDefined();
      expect(isCanonicalBlogSlug(donor), `donor is an alias: ${donor}`).toBe(true);
      for (const target of targets) {
        expect(posts[target], `missing boosted post: ${target}`).toBeDefined();
        expect(isCanonicalBlogSlug(target), `boosted slug is an alias: ${target}`).toBe(true);
      }
    }
  });

  it('never boosts a post onto itself and never repeats a target on one donor', () => {
    for (const [donor, targets] of Object.entries(RELATED_POST_BOOSTS)) {
      expect(targets, `donor boosts itself: ${donor}`).not.toContain(donor);
      expect(new Set(targets).size, `duplicate boost target on ${donor}`).toBe(targets.length);
    }
  });

  it('leaves most of each related list organic', () => {
    for (const [donor, targets] of Object.entries(RELATED_POST_BOOSTS)) {
      expect(targets.length, `donor ${donor} reserves too many slots`).toBeLessThanOrEqual(
        DONOR_SLOT_CAP,
      );
    }
  });
});
