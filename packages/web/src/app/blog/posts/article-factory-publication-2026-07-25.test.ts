import { describe, expect, it } from 'vitest';
import { getCanonicalBlogSlug } from '../../../lib/blog-canonical';
import { extractFAQs } from '../../../lib/extract-faqs';
import { articleFactoryBatch20260725Posts } from './_article-factory-batch-2026-07-25';
import {
  countMarkdownHeadings,
  countProseWords,
  countReadableSentences,
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
} from './article-factory-quality';
import { posts, postList } from './index';
import { countCodeBlocks } from './seo-cluster-article';
import { extractBlogSlugs, findHighestShingleOverlap } from './seo-cluster-quality';

const SITE_TITLE_SUFFIX = ' | QASkills.sh';
const batchSlugs = new Set(articleFactoryBatch20260725Posts.map(({ slug }) => slug));
const legacyInventory = postList.filter(({ slug }) => !batchSlugs.has(slug));
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
  'agentskills.io',
  'cheatsheetseries.owasp.org',
  'clerk.com',
  'docs.github.com',
  'git-scm.com',
  'github.com',
  'json-schema.org',
  'modelcontextprotocol.io',
  'neon.com',
  'nextjs.org',
  'nodejs.org',
  'orm.drizzle.team',
  'redis.io',
  'resend.com',
  'semver.org',
  'stuk.github.io',
  'tc39.es',
  'typesense.org',
  'upstash.com',
  'www.postgresql.org',
  'www.rfc-editor.org',
  'yaml.org',
  'zod.dev',
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
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 0;

  return [...leftTokens].filter((token) => rightTokens.has(token)).length / union.size;
}

describe('2026-07-25 codebase-driven article factory batch', () => {
  it('registers 25 unique articles in both blog registries', () => {
    expect(articleFactoryBatch20260725Posts).toHaveLength(25);
    expect(batchSlugs.size).toBe(25);
    expect(new Set(articleFactoryBatch20260725Posts.map(({ post }) => post.title)).size).toBe(25);
    expect(
      new Set(articleFactoryBatch20260725Posts.map(({ post }) => post.primaryKeyword)).size,
    ).toBe(25);

    for (const { slug, post } of articleFactoryBatch20260725Posts) {
      expect(posts[slug], `${slug} detail registry`).toBe(post);
      expect(
        postList.filter((item) => item.slug === slug),
        `${slug} listing registry`,
      ).toHaveLength(1);
    }
  });

  it('meets metadata, relationship, and source requirements', () => {
    for (const { slug, post } of articleFactoryBatch20260725Posts) {
      expect(
        `${post.title}${SITE_TITLE_SUFFIX}`.length,
        `${slug} emitted title`,
      ).toBeLessThanOrEqual(60);
      expect(post.description.length, `${slug} meta minimum`).toBeGreaterThanOrEqual(140);
      expect(post.description.length, `${slug} meta maximum`).toBeLessThanOrEqual(155);
      expect(normalize(post.description), `${slug} meta keyword`).toContain(
        normalize(post.primaryKeyword!),
      );
      expect(normalize(post.title), `${slug} title keyword`).toContain(
        normalize(post.primaryKeyword!),
      );
      expect(post.date, `${slug} date`).toBe('2026-07-25');
      expect(post.updated, `${slug} updated`).toBe('2026-07-25');
      expect(post.keywords, `${slug} keyword count`).toHaveLength(8);
      expect(post.keywords?.[0], `${slug} primary keyword first`).toBe(post.primaryKeyword);
      expect(post.relatedSlugs, `${slug} related articles`).toHaveLength(4);
      expect(post.relatedSlugs?.every((relatedSlug) => batchSlugs.has(relatedSlug))).toBe(true);
      expect(post.relatedSlugs).not.toContain(slug);
      expect(post.sources?.length, `${slug} source count`).toBeGreaterThanOrEqual(2);
      expect(post.sources?.length, `${slug} source count`).toBeLessThanOrEqual(4);
      expect(new Set(post.sources).size, `${slug} unique sources`).toBe(post.sources?.length);

      for (const source of post.sources ?? []) {
        const url = new URL(source);
        expect(url.protocol, `${slug} secure source`).toBe('https:');
        expect(
          authoritativeSourceHosts.has(url.hostname),
          `${slug} authoritative host ${url.hostname}`,
        ).toBe(true);
        expect(post.content, `${slug} inline citation ${source}`).toContain(`](${source})`);
      }
    }
  });

  it('enforces body length, answer-first writing, keyword use, and readability', () => {
    for (const { slug, post } of articleFactoryBatch20260725Posts) {
      const opening = post.content.trim().split(/\n\s*\n/, 1)[0];
      const proseWords = countProseWords(post.content);
      const density = getKeywordDensity(post.content, post.primaryKeyword!);
      const sentenceWords = getAverageSentenceWords(post.content);
      const readingEase = getFleschReadingEase(post.content);

      expect(proseWords, `${slug} prose words`).toBeGreaterThanOrEqual(3_000);
      expect(proseWords, `${slug} prose words`).toBeLessThanOrEqual(4_000);
      expect(countProseWords(opening), `${slug} opening words`).toBeGreaterThanOrEqual(40);
      expect(countProseWords(opening), `${slug} opening words`).toBeLessThanOrEqual(60);
      expect(normalize(getFirstWords(post.content)), `${slug} keyword in first 100`).toContain(
        normalize(post.primaryKeyword!),
      );
      expect(density, `${slug} weighted keyword density`).toBeGreaterThanOrEqual(1);
      expect(density, `${slug} weighted keyword density`).toBeLessThanOrEqual(3);
      expect(sentenceWords, `${slug} average sentence words`).toBeGreaterThanOrEqual(14.5);
      expect(sentenceWords, `${slug} average sentence words`).toBeLessThanOrEqual(20);
      expect(readingEase, `${slug} Flesch Reading Ease`).toBeGreaterThanOrEqual(55);
      expect(readingEase, `${slug} Flesch Reading Ease`).toBeLessThanOrEqual(75);
    }
  });

  it('enforces headings, FAQs, tables, procedures, code, and internal links', () => {
    for (const { slug, post } of articleFactoryBatch20260725Posts) {
      const h2Headings = Array.from(post.content.matchAll(/^##(?!#)\s+(.+)$/gm), (match) =>
        match[1].trim(),
      );
      const searchableHeadings = Array.from(post.content.matchAll(/^#{2,3}\s+(.+)$/gm), (match) =>
        normalize(match[1]),
      );
      const faqItems = extractFAQs(post.content, 9);
      const internalLinks = extractInternalLinks(post.content);
      const conclusionHeading = h2Headings.at(-2);
      const conclusionStart = conclusionHeading
        ? post.content.indexOf(`## ${conclusionHeading}`)
        : -1;
      const faqStart = post.content.indexOf('## Frequently Asked Questions');
      const conclusion =
        conclusionStart >= 0 && faqStart > conclusionStart
          ? post.content.slice(conclusionStart, faqStart)
          : '';

      expect(countMarkdownHeadings(post.content, 1), `${slug} content H1`).toBe(0);
      expect(h2Headings.length, `${slug} H2 count`).toBeGreaterThanOrEqual(8);
      expect(h2Headings.length, `${slug} H2 count`).toBeLessThanOrEqual(12);
      const questionHeadings = h2Headings.filter((heading) => heading.endsWith('?'));
      expect(questionHeadings.length).toBeGreaterThanOrEqual(3);
      expect(h2Headings.at(-1), `${slug} final FAQ`).toBe('Frequently Asked Questions');
      for (const questionHeading of questionHeadings) {
        const questionStart = post.content.indexOf(`## ${questionHeading}`);
        const immediateAnswer = post.content
          .slice(questionStart + questionHeading.length + 3)
          .trimStart()
          .split(/\n\s*\n/, 1)[0];
        expect(
          countProseWords(immediateAnswer),
          `${slug} immediate answer ${questionHeading}`,
        ).toBeGreaterThanOrEqual(20);
      }
      for (const keyword of post.keywords?.slice(1) ?? []) {
        expect(
          searchableHeadings.some((heading) => heading.includes(normalize(keyword))),
          `${slug} secondary heading: ${keyword}`,
        ).toBe(true);
      }

      expect(faqItems.length, `${slug} FAQ count`).toBeGreaterThanOrEqual(5);
      expect(faqItems.length, `${slug} FAQ count`).toBeLessThanOrEqual(8);
      for (const item of faqItems) {
        const words = item.a.split(/\s+/).filter(Boolean).length;
        expect(words, `${slug} FAQ answer ${item.q}`).toBeGreaterThanOrEqual(40);
        expect(words, `${slug} FAQ answer ${item.q}`).toBeLessThanOrEqual(60);
      }

      expect(hasGfmTable(post.content), `${slug} table`).toBe(true);
      expect(hasOrderedProcedure(post.content), `${slug} procedure`).toBe(true);
      expect(countCodeBlocks(post.content), `${slug} code examples`).toBeGreaterThanOrEqual(2);
      expect(internalLinks.length, `${slug} internal links`).toBeGreaterThanOrEqual(9);
      expect(internalLinks.length, `${slug} internal links`).toBeLessThanOrEqual(20);
      expect(new Set(internalLinks).size, `${slug} unique internal links`).toBeGreaterThanOrEqual(
        5,
      );
      expect(
        getInternalLinksPerThousandWords(post.content),
        `${slug} link density`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        getInternalLinksPerThousandWords(post.content),
        `${slug} link density`,
      ).toBeLessThanOrEqual(5);
      expect(internalLinks).toContain('/skills');
      expect(internalLinks).toContain('/skills/Pramod/playwright-cli');
      expect(extractInternalLinks(conclusion).length, `${slug} conclusion CTA`).toBeGreaterThan(0);
      expect(extractExternalLinks(post.content).length).toBeGreaterThanOrEqual(
        post.sources?.length ?? 0,
      );

      for (const paragraph of extractReadableParagraphs(post.content)) {
        const sentences = countReadableSentences(paragraph);
        expect(sentences, `${slug} paragraph minimum`).toBeGreaterThanOrEqual(2);
        expect(sentences, `${slug} paragraph maximum`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('links only to registered canonical blog routes', () => {
    for (const { slug, post } of articleFactoryBatch20260725Posts) {
      for (const linkedSlug of extractBlogSlugs(post.content)) {
        expect(posts[linkedSlug], `${slug} missing link ${linkedSlug}`).toBeDefined();
        expect(getCanonicalBlogSlug(linkedSlug), `${slug} alias link ${linkedSlug}`).toBe(
          linkedSlug,
        );
      }
    }
  });

  it('contains no banned language, em dashes, placeholders, or non-ASCII text', () => {
    for (const { slug, post } of articleFactoryBatch20260725Posts) {
      const complete = `${post.title}\n${post.description}\n${post.content}`;
      const normalizedText = complete.toLowerCase();

      expect(complete, `${slug} em dash`).not.toContain('—');
      expect(complete, `${slug} ASCII`).not.toMatch(/[^\x00-\x7f]/);
      for (const phrase of bannedPhrases) {
        expect(normalizedText, `${slug} banned phrase ${phrase}`).not.toContain(phrase);
      }
    }
  });

  it('does not collide with legacy slugs, titles, or primary keywords', () => {
    for (const { slug, post } of articleFactoryBatch20260725Posts) {
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
      articleFactoryBatch20260725Posts.map(({ slug, post }) => ({
        slug,
        clusterId: 'article-factory-2026-07-25',
        post,
      })),
    );

    expect(overlap).not.toBeNull();
    expect(overlap!.containment, JSON.stringify(overlap)).toBeLessThan(0.01);
  });
});
