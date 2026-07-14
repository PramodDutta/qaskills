import type { SeoClusterArticle } from './seo-cluster-article';

const CODE_FENCE_PATTERN = /```[\s\S]*?```/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\([^)]+\)/g;
const BLOG_LINK_PATTERN = /\]\(\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:[?#][^)]*)?\)/g;

export function getFaqCount(content: string): number {
  const faqStart = content.search(
    /^##\s+.*(?:Frequently asked questions|\bFAQ\b).*$/im,
  );
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
  return Array.from(content.matchAll(BLOG_LINK_PATTERN), (match) => match[1]);
}

export function normalizeArticleForSimilarity(content: string): string {
  return content
    .replace(CODE_FENCE_PATTERN, ' ')
    .replace(MARKDOWN_LINK_PATTERN, '$1')
    .split('\n')
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
  let highest: ShingleOverlapResult | null = null;

  for (let leftIndex = 0; leftIndex < indexed.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < indexed.length; rightIndex += 1) {
      const left = indexed[leftIndex];
      const right = indexed[rightIndex];
      const containment = calculateShingleContainment(left.shingles, right.shingles);

      if (!highest || containment > highest.containment) {
        highest = { leftSlug: left.slug, rightSlug: right.slug, containment };
      }
    }
  }

  return highest;
}
