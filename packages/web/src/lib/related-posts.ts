import type { BlogPost } from '@/app/blog/posts';
import { isCanonicalBlogSlug } from '@/lib/blog-canonical';
import { RELATED_POST_BOOSTS } from '@/lib/related-post-boosts';

export interface RelatedPostRef {
  slug: string;
  title: string;
  description: string;
  category: string;
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'with',
  'vs',
  'guide',
  'complete',
  'best',
  'how',
  'what',
  'is',
  'are',
  'your',
  'you',
  '2024',
  '2025',
  '2026',
  'tutorial',
  'testing',
  'test',
  'reference',
  'using',
  'use',
  'qa',
  'practices',
  'guide',
  'comparison',
  'explained',
  'setup',
]);

function tokenize(slug: string, title: string): Set<string> {
  const raw = `${slug.replace(/-/g, ' ')} ${title}`.toLowerCase();
  const tokens = raw
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/**
 * Compute up to `limit` related posts for a given slug, scored by:
 *   +3 same category
 *   +1 per shared meaningful token (slug + title, stopwords removed)
 * Deterministic (stable sort by score then slug) so output is build-stable.
 * Pure function over the posts Record, no side effects, safe in RSC.
 *
 * Pure scoring leaves topically unusual posts with no inbound links anywhere on
 * the site, so RELATED_POST_BOOSTS reserves up to two slots here for posts that
 * would otherwise be reachable only from the sitemap. Boosted entries take the
 * lowest-scoring organic slots rather than extending the list, so the rendered
 * count is unchanged.
 */
export function getRelatedPosts(
  currentSlug: string,
  posts: Record<string, BlogPost>,
  limit: number = 6,
): RelatedPostRef[] {
  const current = posts[currentSlug];
  if (!current) return [];

  const currentTokens = tokenize(currentSlug, current.title);

  const scored: Array<{ ref: RelatedPostRef; score: number }> = [];

  for (const [slug, post] of Object.entries(posts)) {
    if (slug === currentSlug) continue;
    if (!isCanonicalBlogSlug(slug)) continue;

    let score = 0;
    if (post.category && post.category === current.category) score += 3;

    const tokens = tokenize(slug, post.title);
    for (const t of tokens) {
      if (currentTokens.has(t)) score += 1;
    }

    if (score <= 0) continue;
    scored.push({
      ref: { slug, title: post.title, description: post.description, category: post.category },
      score,
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.ref.slug.localeCompare(b.ref.slug);
  });

  const organic = scored.map((s) => s.ref);

  const boostSlugs = (RELATED_POST_BOOSTS[currentSlug] ?? []).filter(
    (slug) => slug !== currentSlug && posts[slug] && isCanonicalBlogSlug(slug),
  );
  if (boostSlugs.length === 0) return organic.slice(0, limit);

  const boosted: RelatedPostRef[] = [];
  const seen = new Set<string>();
  for (const slug of boostSlugs) {
    if (seen.has(slug) || boosted.length >= limit) continue;
    const post = posts[slug];
    seen.add(slug);
    boosted.push({
      slug,
      title: post.title,
      description: post.description,
      category: post.category,
    });
  }

  // Organic matches lead; boosted entries fill the tail slots so the most
  // relevant links still appear first.
  const keep = Math.max(0, limit - boosted.length);
  const head = organic.filter((ref) => !seen.has(ref.slug)).slice(0, keep);
  return [...head, ...boosted].slice(0, limit);
}
