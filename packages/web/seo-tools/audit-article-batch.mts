import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import qualityModule from '../src/app/blog/posts/article-factory-quality';
import registry from '../src/app/blog/posts/index';
import seoClusterArticleModule from '../src/app/blog/posts/seo-cluster-article';
import blogCanonicalModule from '../src/lib/blog-canonical';
import faqModule from '../src/lib/extract-faqs';

import type { BlogPost } from '../src/app/blog/posts';

const { getCanonicalBlogSlug } = blogCanonicalModule;
const { extractFAQs } = faqModule;
const {
  countMarkdownHeadings,
  countProseWords,
  countReadableSentences,
  extractArticleProse,
  extractExternalLinks,
  extractInternalLinks,
  extractReadableParagraphs,
  getAverageSentenceWords,
  getFleschReadingEase,
  getFirstWords,
  getInternalLinksPerThousandWords,
  getKeywordDensity,
  hasGfmTable,
  hasOrderedProcedure,
  normalizeArticleText,
} = qualityModule;
const { countCodeBlocks } = seoClusterArticleModule;

const SITE_TITLE_SUFFIX = ' | QASkills.sh';
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '../..');
const DEFAULT_INVENTORY_PATH = path.resolve(
  REPO_ROOT,
  'docs/seo/article-factory-250-2026-07-25/inventory-baseline.json',
);
const DEFAULT_SELECTED_PATH = path.resolve(
  REPO_ROOT,
  'docs/seo/article-factory-250-2026-07-25/selected.json',
);
const bannedPhrases = [
  'delve',
  "in today's fast-paced world",
  'game-changer',
  'unleash',
  'unlock the power',
  'moreover',
  'furthermore',
  "it's important to note",
  'in conclusion',
  'landscape',
  'elevate',
  'seamless',
  'robust',
  'search opportunity',
  'long-tail opportunity',
  'people searching',
  'lorem ipsum',
  'todo',
  'tbd',
];
const stopWords = new Set(
  'a an and are as at be by for from guide how in into is it of on or that the to vs with without your'.split(
    ' ',
  ),
);
const verifiedDynamicRoutes = new Set(['/skills/Pramod/playwright-cli']);

interface BatchPost {
  slug: string;
  post: BlogPost;
}

interface AuditRow {
  slug: string;
  words: number;
  wcWords: number;
  keywordDensity: number;
  averageSentenceWords: number;
  fleschReadingEase: number;
  internalLinks: number;
  eeat: {
    experience: number;
    expertise: number;
    authoritativeness: number;
    trustworthiness: number;
    overall: number;
  };
  aiCitationReadiness: number;
  failures: string[];
}

interface InventoryItem {
  kind: string;
  route: string;
  slug: string;
  title: string;
  h1: string;
  primaryKeyword: string;
}

interface SelectedCandidate {
  slug: string;
  title: string;
  primaryKeyword: string;
  repoEvidence: string[];
  authoritativeSources: string[];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(' ')
      .filter((token) => token && !stopWords.has(token)),
  );
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 0;
  return [...leftTokens].filter((token) => rightTokens.has(token)).length / union.size;
}

function extractBatchPosts(module: Record<string, unknown>, expectedCount: number): BatchPost[] {
  const containers = [
    module,
    ...(module.default && typeof module.default === 'object'
      ? [module.default as Record<string, unknown>]
      : []),
  ];
  const arrays = new Set<BatchPost[]>();

  for (const container of containers) {
    for (const [exportName, value] of Object.entries(container)) {
      if (!exportName.endsWith('Posts') || !Array.isArray(value)) continue;
      if (
        value.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            typeof (item as BatchPost).slug === 'string' &&
            typeof (item as BatchPost).post === 'object',
        )
      ) {
        arrays.add(value as BatchPost[]);
      }
    }
  }

  if (arrays.size !== 1) {
    throw new Error(`Expected one named *Posts export, found ${arrays.size}.`);
  }
  const batchPosts = [...arrays][0];
  if (batchPosts.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} posts, found ${batchPosts.length}.`);
  }
  if (new Set(batchPosts.map(({ slug }) => slug)).size !== batchPosts.length) {
    throw new Error('The manifest contains duplicate slugs.');
  }
  return batchPosts;
}

function walkStaticPageRoutes(directory: string, segments: string[] = []): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name === 'page.tsx') {
      const routeSegments = segments.filter((segment) => !segment.startsWith('('));
      if (!routeSegments.some((segment) => segment.startsWith('['))) {
        routes.push(`/${routeSegments.join('/')}`.replace(/\/$/, '') || '/');
      }
      continue;
    }
    if (entry.isDirectory()) {
      routes.push(
        ...walkStaticPageRoutes(path.join(directory, entry.name), [...segments, entry.name]),
      );
    }
  }
  return routes;
}

function getStaticRoutes(): Set<string> {
  const sitemapSource = fs.readFileSync(path.resolve(WEB_ROOT, 'src/app/sitemap.ts'), 'utf8');
  const routes = new Set(
    [...sitemapSource.matchAll(/url:\s*`\$\{baseUrl\}(\/[^`]*)`/g)].map(
      (match) => match[1].replace(/\/$/, '') || '/',
    ),
  );
  routes.add('/');
  routes.add('/blog');
  routes.add('/dashboard');
  routes.add('/dashboard/preferences');
  routes.add('/getting-started');
  routes.add('/how-to-publish');
  routes.add('/skills');
  for (const route of walkStaticPageRoutes(path.resolve(WEB_ROOT, 'src/app'))) {
    routes.add(route);
  }
  return routes;
}

function isKnownInternalRoute(route: string, staticRoutes: Set<string>): boolean {
  if (staticRoutes.has(route)) return true;
  if (verifiedDynamicRoutes.has(route)) return true;
  if (!route.startsWith('/blog/')) return false;

  const slug = route.slice('/blog/'.length);
  return Boolean(registry.posts[slug]) && getCanonicalBlogSlug(slug) === slug;
}

function extractEvidencePath(value: string): string {
  const match = value.match(/(?:packages|seed-skills|docs|\.github)\/[A-Za-z0-9_[\]./-]+/);
  return (match?.[0] ?? value.replace(/^`|`$/g, '').trim()).replace(/[.,]$/, '');
}

function getWcWords(content: string): number {
  const output = execFileSync('wc', ['-w'], {
    encoding: 'utf8',
    input: `${extractArticleProse(content)}\n`,
  });
  return Number.parseInt(output.trim(), 10);
}

function getPolicyText(post: BlogPost): string {
  const proseWithoutCode = post.content.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]+`/g, ' ');
  return [
    post.title,
    post.description,
    post.category,
    post.imageAlt ?? '',
    ...(post.keywords ?? []),
    proseWithoutCode,
  ].join('\n');
}

function getCollisionFailures(
  batchPosts: BatchPost[],
  inventoryItems: InventoryItem[],
): Map<string, string[]> {
  const failures = new Map(batchPosts.map(({ slug }) => [slug, [] as string[]]));
  const articles = inventoryItems.filter(({ kind }) => kind === 'article');

  for (const { slug, post } of batchPosts) {
    if (getCanonicalBlogSlug(slug) !== slug) failures.get(slug)?.push('canonical-alias');
    for (const item of articles) {
      if (slug === item.slug || slug.includes(item.slug) || item.slug.includes(slug)) {
        failures.get(slug)?.push(`inventory-slug:${item.route}`);
      }
      if (tokenOverlap(post.title, item.title || item.h1) > 0.6) {
        failures.get(slug)?.push(`inventory-title:${item.route}`);
      }
      if (
        item.primaryKeyword &&
        normalize(post.primaryKeyword ?? '') === normalize(item.primaryKeyword)
      ) {
        failures.get(slug)?.push(`inventory-primary-keyword:${item.route}`);
      }
    }
  }

  for (let leftIndex = 0; leftIndex < batchPosts.length - 1; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < batchPosts.length; rightIndex += 1) {
      const left = batchPosts[leftIndex];
      const right = batchPosts[rightIndex];
      if (
        left.slug === right.slug ||
        left.slug.includes(right.slug) ||
        right.slug.includes(left.slug)
      ) {
        failures.get(left.slug)?.push(`batch-slug:${right.slug}`);
        failures.get(right.slug)?.push(`batch-slug:${left.slug}`);
      }
      if (tokenOverlap(left.post.title, right.post.title) > 0.6) {
        failures.get(left.slug)?.push(`batch-title:${right.slug}`);
        failures.get(right.slug)?.push(`batch-title:${left.slug}`);
      }
      if (
        normalize(left.post.primaryKeyword ?? '') === normalize(right.post.primaryKeyword ?? '')
      ) {
        failures.get(left.slug)?.push(`batch-primary-keyword:${right.slug}`);
        failures.get(right.slug)?.push(`batch-primary-keyword:${left.slug}`);
      }
    }
  }
  return failures;
}

function auditPost(
  { slug, post }: BatchPost,
  candidate: SelectedCandidate,
  batchSlugs: Set<string>,
  staticRoutes: Set<string>,
): AuditRow {
  const failures: string[] = [];
  const complete = `${post.title}\n${post.description}\n${post.category}\n${post.imageAlt ?? ''}\n${(post.keywords ?? []).join('\n')}\n${post.content}`;
  const policyText = getPolicyText(post);
  const opening = post.content.trim().split(/\n\s*\n/, 1)[0];
  const words = countProseWords(post.content);
  const wcWords = getWcWords(post.content);
  const keywordDensity = getKeywordDensity(post.content, post.primaryKeyword ?? '');
  const averageSentenceWords = getAverageSentenceWords(post.content);
  const fleschReadingEase = getFleschReadingEase(post.content);
  const h2Headings = Array.from(post.content.matchAll(/^##(?!#)\s+(.+)$/gm), (match) =>
    match[1].trim(),
  );
  const searchableHeadings = Array.from(post.content.matchAll(/^#{2,3}\s+(.+)$/gm), (match) =>
    normalizeArticleText(match[1]),
  );
  const faqItems = extractFAQs(post.content, 9);
  const internalLinks = extractInternalLinks(post.content);
  const externalLinks = extractExternalLinks(post.content);
  const conclusionHeading = h2Headings.at(-1);
  const conclusionStart = conclusionHeading ? post.content.indexOf(`## ${conclusionHeading}`) : -1;
  const conclusion = conclusionStart >= 0 ? post.content.slice(conclusionStart) : '';

  if (words < 3_000 || words > 4_000) failures.push(`words:${words}`);
  if (wcWords !== words) failures.push(`wc-mismatch:${wcWords}:${words}`);
  if (keywordDensity < 1 || keywordDensity > 3) {
    failures.push(`keyword-density:${keywordDensity.toFixed(2)}`);
  }
  if (averageSentenceWords < 15 || averageSentenceWords > 20) {
    failures.push(`sentence-words:${averageSentenceWords.toFixed(1)}`);
  }
  if (fleschReadingEase < 58 || fleschReadingEase > 72) {
    failures.push(`flesch:${fleschReadingEase.toFixed(1)}`);
  }
  if (countProseWords(opening) < 40 || countProseWords(opening) > 60) {
    failures.push(`opening-words:${countProseWords(opening)}`);
  }
  if (
    !normalizeArticleText(getFirstWords(post.content)).includes(
      normalizeArticleText(post.primaryKeyword ?? ''),
    )
  ) {
    failures.push('keyword-not-in-first-100');
  }
  if (`${post.title}${SITE_TITLE_SUFFIX}`.length > 60) failures.push('title-too-long');
  if (post.description.length < 140 || post.description.length > 155) {
    failures.push(`meta-length:${post.description.length}`);
  }
  if (
    !normalizeArticleText(post.title).startsWith(normalizeArticleText(post.primaryKeyword ?? ''))
  ) {
    failures.push('title-keyword-not-near-front');
  }
  if (
    !normalizeArticleText(post.description).includes(
      normalizeArticleText(post.primaryKeyword ?? ''),
    )
  ) {
    failures.push('meta-missing-keyword');
  }
  if (post.date !== '2026-07-25' || post.updated !== '2026-07-25') {
    failures.push('incorrect-date');
  }
  if (
    (post.keywords?.length ?? 0) < 6 ||
    (post.keywords?.length ?? 0) > 9 ||
    post.keywords?.[0] !== post.primaryKeyword ||
    new Set((post.keywords ?? []).map(normalize)).size !== post.keywords?.length
  ) {
    failures.push('keyword-metadata');
  }
  if (
    post.primaryKeyword !== candidate.primaryKeyword ||
    slug !== candidate.slug ||
    !normalizeArticleText(post.title).startsWith(normalizeArticleText(candidate.primaryKeyword))
  ) {
    failures.push('selected-candidate-mismatch');
  }
  if (post.relatedSlugs?.length !== 4 || post.relatedSlugs.includes(slug)) {
    failures.push('related-slugs');
  }
  for (const relatedSlug of post.relatedSlugs ?? []) {
    if (!batchSlugs.has(relatedSlug) && !registry.posts[relatedSlug]) {
      failures.push(`missing-related:${relatedSlug}`);
    }
  }
  if ((post.repoEvidence?.length ?? 0) < 2 || (post.repoEvidence?.length ?? 0) > 5) {
    failures.push(`repo-evidence-count:${post.repoEvidence?.length ?? 0}`);
  }
  if (new Set(post.repoEvidence).size !== post.repoEvidence?.length) {
    failures.push('duplicate-repo-evidence');
  }
  for (const evidence of post.repoEvidence ?? []) {
    const evidencePath = extractEvidencePath(evidence);
    if (!fs.existsSync(path.resolve(REPO_ROOT, evidencePath))) {
      failures.push(`missing-repo-evidence:${evidencePath}`);
    }
    if (!post.content.includes(evidencePath)) {
      failures.push(`uncited-repo-evidence:${evidencePath}`);
    }
  }
  if ((post.sources?.length ?? 0) < 2 || (post.sources?.length ?? 0) > 4) {
    failures.push(`source-count:${post.sources?.length ?? 0}`);
  }
  if (new Set(post.sources).size !== post.sources?.length) failures.push('duplicate-sources');
  for (const source of post.sources ?? []) {
    try {
      if (new URL(source).protocol !== 'https:') failures.push(`insecure-source:${source}`);
    } catch {
      failures.push(`invalid-source:${source}`);
    }
    if (!post.content.includes(`](${source})`)) failures.push(`missing-citation:${source}`);
    if (!candidate.authoritativeSources.includes(source)) {
      failures.push(`unapproved-source:${source}`);
    }
  }
  for (const externalLink of externalLinks) {
    if (!post.sources?.includes(externalLink))
      failures.push(`unlisted-external-link:${externalLink}`);
  }
  if (countMarkdownHeadings(post.content, 1) !== 0) failures.push('content-h1');
  if (h2Headings.length < 8 || h2Headings.length > 12) {
    failures.push(`h2-count:${h2Headings.length}`);
  }
  const questionHeadings = h2Headings.filter((heading) => heading.endsWith('?'));
  if (questionHeadings.length < 3) failures.push('question-headings');
  if (h2Headings.at(-2) !== 'Frequently Asked Questions')
    failures.push('faq-not-before-conclusion');
  if (!normalizeArticleText(h2Headings.at(-1) ?? '').startsWith('conclusion')) {
    failures.push('conclusion-not-final');
  }
  for (const questionHeading of questionHeadings) {
    const questionStart = post.content.indexOf(`## ${questionHeading}`);
    const immediateAnswer = post.content
      .slice(questionStart + questionHeading.length + 3)
      .trimStart()
      .split(/\n\s*\n/, 1)[0];
    if (countProseWords(immediateAnswer) < 20) {
      failures.push(`short-immediate-answer:${questionHeading}`);
    }
  }
  for (const keyword of post.keywords?.slice(1) ?? []) {
    if (!searchableHeadings.some((heading) => heading.includes(normalizeArticleText(keyword)))) {
      failures.push(`secondary-not-in-heading:${keyword}`);
    }
  }
  if (faqItems.length < 5 || faqItems.length > 8) failures.push(`faq-count:${faqItems.length}`);
  for (const item of faqItems) {
    const answerWords = item.a.split(/\s+/).filter(Boolean).length;
    if (answerWords < 40 || answerWords > 60) {
      failures.push(`faq-answer:${answerWords}:${item.q}`);
    }
  }
  if (!hasGfmTable(post.content)) failures.push('missing-table');
  if (!hasOrderedProcedure(post.content)) failures.push('missing-procedure');
  if (countCodeBlocks(post.content) < 2) failures.push('missing-code');
  if (internalLinks.length < 9 || internalLinks.length > 20) {
    failures.push(`internal-links:${internalLinks.length}`);
  }
  const linkDensity = getInternalLinksPerThousandWords(post.content);
  if (linkDensity < 3 || linkDensity > 5) failures.push(`link-density:${linkDensity.toFixed(2)}`);
  if (new Set(internalLinks).size < 5) failures.push('too-few-unique-internal-links');
  if (!internalLinks.includes('/skills')) failures.push('missing-skills-link');
  if (extractInternalLinks(conclusion).length === 0) failures.push('missing-conclusion-cta');
  for (const route of internalLinks) {
    if (!isKnownInternalRoute(route, staticRoutes)) failures.push(`missing-route:${route}`);
  }
  if (externalLinks.length < (post.sources?.length ?? 0)) failures.push('missing-external-links');
  for (const paragraph of extractReadableParagraphs(post.content)) {
    const sentences = countReadableSentences(paragraph);
    if (sentences < 2 || sentences > 4) failures.push(`paragraph-sentences:${sentences}`);
  }
  if (complete.includes('—')) failures.push('em-dash');
  if (/[^\x00-\x7f]/.test(complete)) failures.push('non-ascii');
  for (const phrase of bannedPhrases) {
    if (policyText.toLowerCase().includes(phrase)) failures.push(`banned:${phrase}`);
  }

  const uniqueFailures = [...new Set(failures)];
  const scorePillar = (patterns: RegExp[]): number =>
    Math.max(
      0,
      25 -
        uniqueFailures.filter((failure) => patterns.some((pattern) => pattern.test(failure)))
          .length *
          5,
    );
  const experience = scorePillar([
    /^repo-evidence/,
    /^missing-repo-evidence/,
    /^uncited-repo-evidence/,
    /^unapproved-repo-evidence/,
  ]);
  const expertise = scorePillar([
    /^words:/,
    /^wc-mismatch:/,
    /^keyword-density:/,
    /^sentence-words:/,
    /^flesch:/,
    /^missing-code/,
    /^missing-table/,
    /^missing-procedure/,
  ]);
  const authoritativeness = scorePillar([
    /^source-count:/,
    /^duplicate-sources/,
    /^insecure-source:/,
    /^invalid-source:/,
    /^missing-citation:/,
    /^unapproved-source:/,
    /^unlisted-external-link:/,
  ]);
  const trustworthiness = scorePillar([
    /^title-/,
    /^meta-/,
    /^incorrect-date/,
    /^missing-route:/,
    /^em-dash/,
    /^non-ascii/,
    /^banned:/,
    /^selected-candidate-mismatch/,
  ]);
  const overall = experience + expertise + authoritativeness + trustworthiness;
  const aiCitationFailures = uniqueFailures.filter((failure) =>
    /^(opening-words|keyword-not-in-first-100|question-headings|short-immediate-answer|faq-|conclusion-|missing-table|missing-procedure|missing-code)/.test(
      failure,
    ),
  ).length;
  const aiCitationReadiness = Math.max(0, 100 - aiCitationFailures * 10);
  if (overall < 90) uniqueFailures.push(`eeat-score:${overall}`);
  if (aiCitationReadiness < 90) {
    uniqueFailures.push(`ai-citation-readiness:${aiCitationReadiness}`);
  }

  return {
    slug,
    words,
    wcWords,
    keywordDensity: Number(keywordDensity.toFixed(2)),
    averageSentenceWords: Number(averageSentenceWords.toFixed(1)),
    fleschReadingEase: Number(fleschReadingEase.toFixed(1)),
    internalLinks: internalLinks.length,
    eeat: {
      experience,
      expertise,
      authoritativeness,
      trustworthiness,
      overall,
    },
    aiCitationReadiness,
    failures: uniqueFailures,
  };
}

const manifestArgument = process.argv[2];
if (!manifestArgument) {
  throw new Error(
    'Usage: pnpm --filter @qaskills/web audit:article-batch <manifest.ts> [expected-count]',
  );
}

const expectedCount = Number.parseInt(process.argv[3] ?? '5', 10);
if (!Number.isInteger(expectedCount) || expectedCount < 1) {
  throw new Error(`Invalid expected count: ${process.argv[3]}`);
}
const manifestPath = path.resolve(process.cwd(), manifestArgument);
const manifestModule = (await import(
  `${pathToFileURL(manifestPath).href}?audit=${Date.now()}`
)) as Record<string, unknown>;
const batchPosts = extractBatchPosts(manifestModule, expectedCount);
const batchSlugs = new Set(batchPosts.map(({ slug }) => slug));
const inventoryPath = process.env.ARTICLE_FACTORY_INVENTORY ?? DEFAULT_INVENTORY_PATH;
if (!fs.existsSync(inventoryPath)) throw new Error(`Missing baseline inventory: ${inventoryPath}`);
if (!fs.existsSync(DEFAULT_SELECTED_PATH)) {
  throw new Error(`Missing selected candidate queue: ${DEFAULT_SELECTED_PATH}`);
}
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as {
  items: InventoryItem[];
};
const selectedReport = JSON.parse(fs.readFileSync(DEFAULT_SELECTED_PATH, 'utf8')) as {
  selected: SelectedCandidate[];
};
const candidatesBySlug = new Map(
  selectedReport.selected.map((candidate) => [candidate.slug, candidate]),
);
for (const { slug } of batchPosts) {
  if (!candidatesBySlug.has(slug)) throw new Error(`${slug} is not in the approved topic queue.`);
}
const staticRoutes = getStaticRoutes();
const collisionFailures = getCollisionFailures(batchPosts, inventory.items);
const rows = batchPosts.map((item) => {
  const row = auditPost(item, candidatesBySlug.get(item.slug)!, batchSlugs, staticRoutes);
  row.failures.push(...(collisionFailures.get(item.slug) ?? []));
  row.failures = [...new Set(row.failures)];
  return row;
});
const failedRows = rows.filter(({ failures }) => failures.length > 0);

console.log(
  JSON.stringify(
    {
      manifestPath,
      expectedCount,
      articles: rows.length,
      failed: failedRows.length,
      rows,
    },
    null,
    2,
  ),
);
if (failedRows.length > 0) process.exitCode = 1;
