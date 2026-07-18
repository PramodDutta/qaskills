import { describe, expect, it } from 'vitest';
import { getCanonicalBlogSlug } from '../../../lib/blog-canonical';
import { extractFAQs } from '../../../lib/extract-faqs';
import { articleFactoryBatch20260718Posts } from './_article-factory-batch-2026-07';
import {
  countMarkdownHeadings,
  countProseWords,
  extractArticleProse,
  extractExternalLinks,
  extractInternalLinks,
  getAverageSentenceWords,
  getFirstWords,
  getKeywordDensity,
  hasGfmTable,
  hasOrderedProcedure,
} from './article-factory-quality';
import { posts, postList } from './index';
import { countCodeBlocks } from './seo-cluster-article';
import { extractBlogSlugs, findHighestShingleOverlap } from './seo-cluster-quality';

const SITE_TITLE_SUFFIX = ' | QASkills.sh';
const articleSlugs = new Set(articleFactoryBatch20260718Posts.map(({ slug }) => slug));
const legacyInventory = postList.filter(({ slug }) => !articleSlugs.has(slug));
const stopWords = new Set(
  'a an and are as at be by for from guide how in into is it of on or that the to vs with without your'.split(
    ' ',
  ),
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
const authoritativeSourceHosts = new Set([
  'cheatsheetseries.owasp.org',
  'datatracker.ietf.org',
  'csrc.nist.gov',
  'coverage.readthedocs.io',
  'docs.github.com',
  'docs.npmjs.com',
  'docs.pytest.org',
  'docs.sonarsource.com',
  'fakerjs.dev',
  'git-scm.com',
  'github.com',
  'ico.org.uk',
  'jestjs.io',
  'json-schema.org',
  'nodejs.org',
  'nvlpubs.nist.gov',
  'openapi.org',
  'owasp.org',
  'playwright.dev',
  'semver.org',
  'spec.openapis.org',
  'vitest.dev',
  'www.postgresql.org',
  'www.rfc-editor.org',
  'www.typescriptlang.org',
  'www.ietf.org',
  'www.json-schema.org',
  'www.nist.gov',
]);

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
  const denominator = new Set([...leftTokens, ...rightTokens]).size;
  if (denominator === 0) return 0;

  return [...leftTokens].filter((token) => rightTokens.has(token)).length / denominator;
}

describe('2026-07-18 codebase-driven article factory batch', () => {
  it('registers 25 unique posts in both blog registries', () => {
    expect(articleFactoryBatch20260718Posts).toHaveLength(25);
    expect(articleSlugs.size).toBe(25);
    expect(new Set(articleFactoryBatch20260718Posts.map(({ post }) => post.title)).size).toBe(25);
    expect(
      new Set(articleFactoryBatch20260718Posts.map(({ post }) => post.primaryKeyword)).size,
    ).toBe(25);

    for (const { slug, post } of articleFactoryBatch20260718Posts) {
      expect(posts[slug], `${slug} detail registry`).toBe(post);
      expect(
        postList.filter((item) => item.slug === slug),
        `${slug} listing registry`,
      ).toHaveLength(1);
    }
  });

  it('meets publication metadata and source requirements', () => {
    for (const { slug, post } of articleFactoryBatch20260718Posts) {
      expect(
        `${post.title}${SITE_TITLE_SUFFIX}`.length,
        `${slug} emitted title`,
      ).toBeLessThanOrEqual(60);
      expect(post.description.length, `${slug} meta minimum`).toBeGreaterThanOrEqual(140);
      expect(post.description.length, `${slug} meta maximum`).toBeLessThanOrEqual(155);
      expect(normalize(post.description), `${slug} meta keyword`).toContain(
        normalize(post.primaryKeyword!),
      );
      expect(post.date, `${slug} date`).toBe('2026-07-18');
      expect(post.updated, `${slug} updated`).toBe('2026-07-18');
      expect(Number.isNaN(Date.parse(post.date)), `${slug} valid date`).toBe(false);
      expect(post.keywords?.length, `${slug} keyword count`).toBeGreaterThanOrEqual(6);
      expect(post.keywords?.length, `${slug} keyword count`).toBeLessThanOrEqual(10);
      expect(post.keywords, `${slug} primary keyword in list`).toContain(post.primaryKeyword);
      expect(post.relatedSlugs, `${slug} related articles`).toHaveLength(4);
      expect(post.relatedSlugs?.every((relatedSlug) => articleSlugs.has(relatedSlug))).toBe(true);
      expect(post.sources?.length, `${slug} source count`).toBeGreaterThanOrEqual(2);
      expect(post.sources?.length, `${slug} source count`).toBeLessThanOrEqual(4);
      expect(new Set(post.sources).size, `${slug} unique sources`).toBe(post.sources?.length);

      for (const source of post.sources ?? []) {
        const url = new URL(source);
        expect(url.protocol, `${slug} secure source`).toBe('https:');
        expect(
          authoritativeSourceHosts.has(url.hostname),
          `${slug} source host ${url.hostname}`,
        ).toBe(true);
        expect(post.content, `${slug} inline citation ${source}`).toContain(`](${source})`);
      }
    }
  });

  it('enforces body length, answer-first structure, and keyword use', () => {
    for (const { slug, post } of articleFactoryBatch20260718Posts) {
      const proseWords = countProseWords(post.content);
      const openingParagraph = post.content.trim().split(/\n\s*\n/, 1)[0];
      const openingWords = countProseWords(openingParagraph);
      const firstHundred = normalize(getFirstWords(post.content));
      const keyword = normalize(post.primaryKeyword!);
      const density = getKeywordDensity(post.content, post.primaryKeyword!);
      const averageSentenceWords = getAverageSentenceWords(post.content);

      expect(proseWords, `${slug} prose word count`).toBeGreaterThanOrEqual(3_000);
      expect(proseWords, `${slug} prose word count`).toBeLessThanOrEqual(4_000);
      expect(openingWords, `${slug} direct-answer length`).toBeGreaterThanOrEqual(40);
      expect(openingWords, `${slug} direct-answer length`).toBeLessThanOrEqual(60);
      expect(firstHundred, `${slug} primary keyword in first 100 words`).toContain(keyword);
      expect(density, `${slug} weighted keyword density`).toBeGreaterThanOrEqual(1);
      expect(density, `${slug} weighted keyword density`).toBeLessThanOrEqual(3);
      expect(averageSentenceWords, `${slug} average sentence words`).toBeGreaterThanOrEqual(14.5);
      expect(averageSentenceWords, `${slug} average sentence words`).toBeLessThanOrEqual(20);
    }
  });

  it('enforces headings, FAQs, tables, procedures, code, and links', () => {
    for (const { slug, post } of articleFactoryBatch20260718Posts) {
      const h2Count = countMarkdownHeadings(post.content, 2);
      const faqItems = extractFAQs(post.content, 9);
      const h2Headings = Array.from(post.content.matchAll(/^##(?!#)\s+(.+)$/gm), (match) =>
        match[1].trim(),
      );
      const internalLinks = extractInternalLinks(post.content);
      const externalLinks = extractExternalLinks(post.content);

      expect(countMarkdownHeadings(post.content, 1), `${slug} content H1`).toBe(0);
      expect(h2Count, `${slug} H2 count`).toBeGreaterThanOrEqual(8);
      expect(h2Count, `${slug} H2 count`).toBeLessThanOrEqual(12);
      expect(h2Headings.at(-1), `${slug} final FAQ heading`).toBe('Frequently Asked Questions');
      expect(faqItems.length, `${slug} FAQ count`).toBeGreaterThanOrEqual(5);
      expect(faqItems.length, `${slug} FAQ count`).toBeLessThanOrEqual(8);
      for (const item of faqItems) {
        const answerWords = item.a.split(/\s+/).filter(Boolean).length;
        expect(answerWords, `${slug} FAQ answer: ${item.q}`).toBeGreaterThanOrEqual(40);
        expect(answerWords, `${slug} FAQ answer: ${item.q}`).toBeLessThanOrEqual(60);
      }
      expect(hasGfmTable(post.content), `${slug} GFM table`).toBe(true);
      expect(hasOrderedProcedure(post.content), `${slug} ordered procedure`).toBe(true);
      expect(countCodeBlocks(post.content), `${slug} code examples`).toBeGreaterThanOrEqual(2);
      expect(internalLinks.length, `${slug} internal link count`).toBeGreaterThanOrEqual(9);
      expect(internalLinks.length, `${slug} internal link count`).toBeLessThanOrEqual(20);
      expect(new Set(internalLinks).size, `${slug} unique internal links`).toBeGreaterThanOrEqual(
        5,
      );
      expect(internalLinks, `${slug} skills directory link`).toContain('/skills');
      expect(
        internalLinks.some((link) =>
          [
            '/skills/thetestingacademy/ai-release-guardian',
            '/skills/thetestingacademy/secure-test-data-engineer',
          ].includes(link),
        ),
        `${slug} flagship skill link`,
      ).toBe(true);
      expect(externalLinks.length, `${slug} inline source links`).toBeGreaterThanOrEqual(
        post.sources?.length ?? 0,
      );
    }
  });

  it('uses only registered canonical blog links', () => {
    for (const { slug, post } of articleFactoryBatch20260718Posts) {
      for (const linkedSlug of extractBlogSlugs(post.content)) {
        expect(posts[linkedSlug], `${slug} links to missing ${linkedSlug}`).toBeDefined();
        expect(getCanonicalBlogSlug(linkedSlug), `${slug} links through alias ${linkedSlug}`).toBe(
          linkedSlug,
        );
      }
    }
  });

  it('contains no banned language, em dashes, placeholders, or non-ASCII text', () => {
    for (const { slug, post } of articleFactoryBatch20260718Posts) {
      const proseAndMetadata = `${post.title}\n${post.description}\n${extractArticleProse(post.content)}`;
      const normalizedText = proseAndMetadata.toLowerCase();

      expect(
        `${post.title}\n${post.description}\n${post.content}`,
        `${slug} em dash`,
      ).not.toContain('—');
      expect(`${post.title}\n${post.description}\n${post.content}`, `${slug} ASCII`).not.toMatch(
        /[^\x00-\x7f]/,
      );
      for (const phrase of bannedPhrases) {
        expect(normalizedText, `${slug} banned phrase: ${phrase}`).not.toContain(phrase);
      }
    }
  });

  it('does not collide with legacy slugs, titles, or declared primary keywords', () => {
    for (const { slug, post } of articleFactoryBatch20260718Posts) {
      for (const legacy of legacyInventory) {
        expect(
          slug.includes(legacy.slug) || legacy.slug.includes(slug),
          `${slug} slug collision with ${legacy.slug}`,
        ).toBe(false);
        expect(
          tokenOverlap(post.title, legacy.title),
          `${slug} title collision with ${legacy.slug}`,
        ).toBeLessThanOrEqual(0.6);
        if (legacy.primaryKeyword) {
          expect(
            normalize(post.primaryKeyword!),
            `${slug} keyword collision with ${legacy.slug}`,
          ).not.toBe(normalize(legacy.primaryKeyword));
        }
      }
    }
  });

  it('keeps shared eight-word prose below one-percent containment', () => {
    const overlap = findHighestShingleOverlap(
      articleFactoryBatch20260718Posts.map(({ slug, post }) => ({
        slug,
        clusterId: 'article-factory-2026-07-18',
        post,
      })),
    );

    expect(overlap).not.toBeNull();
    expect(overlap!.containment, JSON.stringify(overlap)).toBeLessThan(0.01);
  });
});
