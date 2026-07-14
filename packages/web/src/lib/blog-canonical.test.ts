import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { postList, posts } from '../app/blog/posts';
import {
  BLOG_CANONICAL_REDIRECTS,
  getCanonicalBlogSlug,
  isCanonicalBlogSlug,
} from './blog-canonical';

const require = createRequire(import.meta.url);
const nextConfig = require('../../next.config.js') as {
  redirects: () => Promise<Array<{ source: string; destination: string; permanent: boolean }>>;
};

describe('blog canonical redirects', () => {
  it('maps every configured duplicate slug to its canonical article', () => {
    for (const [alias, canonical] of Object.entries(BLOG_CANONICAL_REDIRECTS)) {
      expect(getCanonicalBlogSlug(alias)).toBe(canonical);
      expect(isCanonicalBlogSlug(alias)).toBe(false);
    }
  });

  it('keeps canonical slugs stable', () => {
    const canonicalSlugs = new Set(Object.values(BLOG_CANONICAL_REDIRECTS));

    for (const slug of canonicalSlugs) {
      expect(getCanonicalBlogSlug(slug)).toBe(slug);
      expect(isCanonicalBlogSlug(slug)).toBe(true);
    }
  });

  it('points aliases and canonicals at registered posts', () => {
    for (const [alias, canonical] of Object.entries(BLOG_CANONICAL_REDIRECTS)) {
      expect(posts[alias], `missing alias post: ${alias}`).toBeDefined();
      expect(posts[canonical], `missing canonical post: ${canonical}`).toBeDefined();
    }
  });

  it('filters duplicate aliases from public article lists', () => {
    const visibleSlugs = postList
      .filter((post) => isCanonicalBlogSlug(post.slug))
      .map((post) => post.slug);

    for (const alias of Object.keys(BLOG_CANONICAL_REDIRECTS)) {
      expect(visibleSlugs).not.toContain(alias);
    }
  });

  it('keeps production redirects synchronized with canonical filtering', async () => {
    const redirects = await nextConfig.redirects();
    const configured = Object.fromEntries(
      redirects.map(({ source, destination, permanent }) => {
        expect(permanent).toBe(true);
        return [source.replace('/blog/', ''), destination.replace('/blog/', '')];
      }),
    );

    expect(configured).toEqual(BLOG_CANONICAL_REDIRECTS);
  });
});
