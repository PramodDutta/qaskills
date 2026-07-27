import type { SeoClusterArticle } from './seo-cluster-article';

const CODE_FENCE_PATTERN = /```[\s\S]*?```/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\([^)]+\)/g;
const BLOG_LINK_PATTERN = /\]\(\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:[?#][^)]*)?\)/g;

export function getFaqCount(content: string): number {
  const faqStart = content.search(/^##\s+.*(?:Frequently asked questions|\bFAQ\b).*$/im);
  if (faqStart < 0) return 0;

  const faqSection = content.slice(faqStart);
  const nextH2 = faqSection.slice(1).search(/^##\s+/m);
  const boundedSection = nextH2 < 0 ? faqSection : faqSection.slice(0, nextH2 + 1);

  return (boundedSection.match(/^###\s+/gm) || []).length;
}

export function getIntroductionWords(content: string, limit = 100): string {
  return content.trim().split(/\s+/).slice(0, limit).join(' ');
}

export function extractBlogSlugs(content: string): string[] {
  const withoutCode = content.replace(CODE_FENCE_PATTERN, ' ');
  return Array.from(withoutCode.matchAll(BLOG_LINK_PATTERN), (match) => match[1]);
}

export function normalizeArticleForSimilarity(content: string): string {
  return content
    .replace(CODE_FENCE_PATTERN, ' ')
    .replace(MARKDOWN_LINK_PATTERN, '$1')
    .split('\n')
    .filter((line) => !/^\s*\|?\s*:?-{3,}/.test(line))
    .filter((line) => !/^[-*]\s+.*(?:\/skills|QA skills catalog)/i.test(line.trim()))
    .join(' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[`*_#>|()[\]{}:;,.!?"']/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function createWordShingles(content: string, size = 8): Set<string> {
  const words = normalizeArticleForSimilarity(content).split(' ').filter(Boolean);
  const shingles = new Set<string>();

  for (let index = 0; index <= words.length - size; index += 1) {
    shingles.add(words.slice(index, index + size).join(' '));
  }

  return shingles;
}

export function calculateShingleContainment(left: Set<string>, right: Set<string>): number {
  const denominator = Math.min(left.size, right.size);
  if (denominator === 0) return 0;

  let overlap = 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = smaller === left ? right : left;

  for (const shingle of smaller) {
    if (larger.has(shingle)) overlap += 1;
  }

  return overlap / denominator;
}

export interface ShingleOverlapResult {
  leftSlug: string;
  rightSlug: string;
  containment: number;
}

export function findHighestShingleOverlap(
  articles: SeoClusterArticle[],
  size = 8,
): ShingleOverlapResult | null {
  if (articles.length < 2) return null;

  const indexed = articles.map((article) => ({
    slug: article.slug,
    shingles: createWordShingles(article.post.content, size),
  }));
  const postings = new Map<string, number[]>();
  for (let articleIndex = 0; articleIndex < indexed.length; articleIndex += 1) {
    for (const shingle of indexed[articleIndex].shingles) {
      const articleIndexes = postings.get(shingle);
      if (articleIndexes) articleIndexes.push(articleIndex);
      else postings.set(shingle, [articleIndex]);
    }
  }

  const overlapCounts = new Map<number, number>();
  for (const articleIndexes of postings.values()) {
    for (let leftPosition = 0; leftPosition < articleIndexes.length - 1; leftPosition += 1) {
      const leftIndex = articleIndexes[leftPosition];
      for (
        let rightPosition = leftPosition + 1;
        rightPosition < articleIndexes.length;
        rightPosition += 1
      ) {
        const rightIndex = articleIndexes[rightPosition];
        const pairKey = leftIndex * indexed.length + rightIndex;
        overlapCounts.set(pairKey, (overlapCounts.get(pairKey) ?? 0) + 1);
      }
    }
  }

  let highest: ShingleOverlapResult | null = null;
  for (const [pairKey, overlap] of overlapCounts) {
    const leftIndex = Math.floor(pairKey / indexed.length);
    const rightIndex = pairKey % indexed.length;
    const left = indexed[leftIndex];
    const right = indexed[rightIndex];
    const denominator = Math.min(left.shingles.size, right.shingles.size);
    const containment = denominator === 0 ? 0 : overlap / denominator;

    if (!highest || containment > highest.containment) {
      highest = { leftSlug: left.slug, rightSlug: right.slug, containment };
    }
  }

  return (
    highest ?? {
      leftSlug: indexed[0].slug,
      rightSlug: indexed[1].slug,
      containment: 0,
    }
  );
}
