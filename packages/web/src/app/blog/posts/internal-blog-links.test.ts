import { describe, expect, it } from 'vitest';
import { getCanonicalBlogSlug } from '../../../lib/blog-canonical';
import { posts } from './index';

const BLOG_LINK_PATTERN = /\]\(\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/)?(?:[?#][^)]*)?\)/g;

interface BlogLinkIssue {
  sourceSlug: string;
  targetSlug: string;
  canonicalTargetSlug: string;
  kind: 'alias' | 'missing';
}

describe('blog internal links', () => {
  it('links registered canonical posts directly to other registered canonical posts', () => {
    const canonicalPostSlugs = new Set(
      Object.keys(posts).filter((slug) => getCanonicalBlogSlug(slug) === slug),
    );
    const issues: BlogLinkIssue[] = [];

    for (const [sourceSlug, post] of Object.entries(posts)) {
      if (!canonicalPostSlugs.has(sourceSlug)) continue;

      for (const match of post.content.matchAll(BLOG_LINK_PATTERN)) {
        const targetSlug = match[1];
        const canonicalTargetSlug = getCanonicalBlogSlug(targetSlug);

        if (canonicalTargetSlug !== targetSlug) {
          issues.push({
            sourceSlug,
            targetSlug,
            canonicalTargetSlug,
            kind: 'alias',
          });
        } else if (!canonicalPostSlugs.has(targetSlug)) {
          issues.push({
            sourceSlug,
            targetSlug,
            canonicalTargetSlug,
            kind: 'missing',
          });
        }
      }
    }

    const diagnostics = issues
      .map(({ sourceSlug, targetSlug, canonicalTargetSlug, kind }) =>
        kind === 'alias'
          ? `${sourceSlug} links through alias ${targetSlug}; use ${canonicalTargetSlug}`
          : `${sourceSlug} links to missing slug ${targetSlug}`,
      )
      .join('\n');

    expect(issues, diagnostics).toHaveLength(0);
  });
});
