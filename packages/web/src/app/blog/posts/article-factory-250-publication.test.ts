import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCanonicalBlogSlug } from '../../../lib/blog-canonical';
import { extractFAQs } from '../../../lib/extract-faqs';
import { articleFactory250Posts } from './_article-factory-250-2026-07-25';
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
  normalizeArticleText,
} from './article-factory-quality';
import { posts, postList } from './index';
import { countCodeBlocks } from './seo-cluster-article';
import { extractBlogSlugs, findHighestShingleOverlap } from './seo-cluster-quality';

const SITE_TITLE_SUFFIX = ' | QASkills.sh';
const REPO_ROOT = path.resolve(process.cwd(), '../..');
const selectedReport = JSON.parse(
  fs.readFileSync(
    path.resolve(REPO_ROOT, 'docs/seo/article-factory-250-2026-07-25/selected.json'),
    'utf8',
  ),
) as {
  selected: Array<{
    slug: string;
    title: string;
    primaryKeyword: string;
    repoEvidence: string[];
    authoritativeSources: string[];
  }>;
};
const candidatesBySlug = new Map(
  selectedReport.selected.map((candidate) => [candidate.slug, candidate]),
);
const factorySlugs = new Set(articleFactory250Posts.map(({ slug }) => slug));
const legacyInventory = postList.filter(({ slug }) => !factorySlugs.has(slug));
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

function extractEvidencePath(value: string): string {
  const match = value.match(/(?:packages|seed-skills|docs|\.github)\/[A-Za-z0-9_[\]./-]+/);
  return (match?.[0] ?? value.replace(/^`|`$/g, '').trim()).replace(/[.,]$/, '');
}

describe('250-article codebase-driven SEO factory', () => {
  it('registers exactly 250 unique approved articles', () => {
    expect(articleFactory250Posts).toHaveLength(250);
    expect(factorySlugs.size).toBe(250);
    expect(new Set(articleFactory250Posts.map(({ post }) => post.title)).size).toBe(250);
    expect(new Set(articleFactory250Posts.map(({ post }) => post.primaryKeyword)).size).toBe(250);
    expect(candidatesBySlug.size).toBe(250);

    for (const { slug, post } of articleFactory250Posts) {
      expect(candidatesBySlug.has(slug), `${slug} approved topic`).toBe(true);
      expect(posts[slug], `${slug} detail registry`).toBe(post);
      expect(
        postList.filter((item) => item.slug === slug),
        `${slug} listing registry`,
      ).toHaveLength(1);
      expect(getCanonicalBlogSlug(slug), `${slug} canonical slug`).toBe(slug);
    }
  });

  it('meets metadata, evidence, and source contracts', () => {
    for (const { slug, post } of articleFactory250Posts) {
      const candidate = candidatesBySlug.get(slug)!;

      expect(
        `${post.title}${SITE_TITLE_SUFFIX}`.length,
        `${slug} emitted title`,
      ).toBeLessThanOrEqual(60);
      expect(post.description.length, `${slug} meta minimum`).toBeGreaterThanOrEqual(140);
      expect(post.description.length, `${slug} meta maximum`).toBeLessThanOrEqual(155);
      expect(
        normalizeArticleText(post.title).startsWith(normalizeArticleText(post.primaryKeyword!)),
        `${slug} title keyword`,
      ).toBe(true);
      expect(normalizeArticleText(post.description), `${slug} meta keyword`).toContain(
        normalizeArticleText(post.primaryKeyword!),
      );
      expect(post.primaryKeyword, `${slug} selected keyword`).toBe(candidate.primaryKeyword);
      expect(post.date, `${slug} date`).toBe('2026-07-25');
      expect(post.updated, `${slug} updated`).toBe('2026-07-25');
      expect(post.keywords?.length, `${slug} keyword count`).toBeGreaterThanOrEqual(6);
      expect(post.keywords?.length, `${slug} keyword count`).toBeLessThanOrEqual(9);
      expect(post.keywords?.[0], `${slug} primary keyword first`).toBe(post.primaryKeyword);
      expect(new Set(post.keywords?.map(normalize)).size, `${slug} unique keywords`).toBe(
        post.keywords?.length,
      );
      expect(post.relatedSlugs, `${slug} related articles`).toHaveLength(4);
      expect(post.relatedSlugs).not.toContain(slug);
      for (const relatedSlug of post.relatedSlugs ?? []) {
        expect(posts[relatedSlug], `${slug} related ${relatedSlug}`).toBeDefined();
      }

      expect(post.repoEvidence?.length, `${slug} evidence minimum`).toBeGreaterThanOrEqual(2);
      expect(post.repoEvidence?.length, `${slug} evidence maximum`).toBeLessThanOrEqual(5);
      expect(new Set(post.repoEvidence).size, `${slug} unique evidence`).toBe(
        post.repoEvidence?.length,
      );
      for (const evidence of post.repoEvidence ?? []) {
        const evidencePath = extractEvidencePath(evidence);
        expect(
          fs.existsSync(path.resolve(REPO_ROOT, evidencePath)),
          `${slug} ${evidencePath}`,
        ).toBe(true);
        expect(post.content, `${slug} cites ${evidencePath}`).toContain(evidencePath);
      }

      expect(post.sources?.length, `${slug} source minimum`).toBeGreaterThanOrEqual(2);
      expect(post.sources?.length, `${slug} source maximum`).toBeLessThanOrEqual(4);
      expect(new Set(post.sources).size, `${slug} unique sources`).toBe(post.sources?.length);
      for (const source of post.sources ?? []) {
        expect(candidate.authoritativeSources, `${slug} approved source ${source}`).toContain(
          source,
        );
        expect(new URL(source).protocol, `${slug} HTTPS source`).toBe('https:');
        expect(post.content, `${slug} citation ${source}`).toContain(`](${source})`);
      }
      for (const externalLink of extractExternalLinks(post.content)) {
        expect(post.sources, `${slug} listed external link ${externalLink}`).toContain(
          externalLink,
        );
      }
    }
  });

  it('meets length, readability, structure, FAQ, and linking thresholds', () => {
    for (const { slug, post } of articleFactory250Posts) {
      const opening = post.content.trim().split(/\n\s*\n/, 1)[0];
      const words = countProseWords(post.content);
      const headings = Array.from(post.content.matchAll(/^##(?!#)\s+(.+)$/gm), (match) =>
        match[1].trim(),
      );
      const searchableHeadings = Array.from(post.content.matchAll(/^#{2,3}\s+(.+)$/gm), (match) =>
        normalizeArticleText(match[1]),
      );
      const faqItems = extractFAQs(post.content, 9);
      const internalLinks = extractInternalLinks(post.content);
      const conclusionStart = post.content.lastIndexOf(`## ${headings.at(-1)}`);
      const conclusion = conclusionStart >= 0 ? post.content.slice(conclusionStart) : '';

      expect(words, `${slug} prose words`).toBeGreaterThanOrEqual(3_000);
      expect(words, `${slug} prose words`).toBeLessThanOrEqual(4_000);
      expect(countProseWords(opening), `${slug} opening words`).toBeGreaterThanOrEqual(40);
      expect(countProseWords(opening), `${slug} opening words`).toBeLessThanOrEqual(60);
      expect(
        normalizeArticleText(getFirstWords(post.content)),
        `${slug} first 100 words`,
      ).toContain(normalizeArticleText(post.primaryKeyword!));
      expect(
        getKeywordDensity(post.content, post.primaryKeyword!),
        `${slug} keyword density minimum`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        getKeywordDensity(post.content, post.primaryKeyword!),
        `${slug} keyword density maximum`,
      ).toBeLessThanOrEqual(3);
      expect(
        getAverageSentenceWords(post.content),
        `${slug} sentence words`,
      ).toBeGreaterThanOrEqual(15);
      expect(getAverageSentenceWords(post.content), `${slug} sentence words`).toBeLessThanOrEqual(
        20,
      );
      expect(getFleschReadingEase(post.content), `${slug} Flesch minimum`).toBeGreaterThanOrEqual(
        58,
      );
      expect(getFleschReadingEase(post.content), `${slug} Flesch maximum`).toBeLessThanOrEqual(72);

      expect(countMarkdownHeadings(post.content, 1), `${slug} content H1`).toBe(0);
      expect(headings.length, `${slug} H2 count`).toBeGreaterThanOrEqual(8);
      expect(headings.length, `${slug} H2 count`).toBeLessThanOrEqual(12);
      expect(headings.filter((heading) => heading.endsWith('?')).length).toBeGreaterThanOrEqual(3);
      expect(headings.at(-2), `${slug} FAQ order`).toBe('Frequently Asked Questions');
      expect(
        normalizeArticleText(headings.at(-1) ?? '').startsWith('conclusion'),
        `${slug} final conclusion`,
      ).toBe(true);
      for (const keyword of post.keywords?.slice(1) ?? []) {
        expect(
          searchableHeadings.some((heading) => heading.includes(normalizeArticleText(keyword))),
          `${slug} secondary heading ${keyword}`,
        ).toBe(true);
      }
      for (const questionHeading of headings.filter((heading) => heading.endsWith('?'))) {
        const start = post.content.indexOf(`## ${questionHeading}`);
        const answer = post.content
          .slice(start + questionHeading.length + 3)
          .trimStart()
          .split(/\n\s*\n/, 1)[0];
        expect(
          countProseWords(answer),
          `${slug} immediate answer ${questionHeading}`,
        ).toBeGreaterThanOrEqual(20);
      }

      expect(faqItems.length, `${slug} FAQ count`).toBeGreaterThanOrEqual(5);
      expect(faqItems.length, `${slug} FAQ count`).toBeLessThanOrEqual(8);
      for (const item of faqItems) {
        const answerWords = item.a.split(/\s+/).filter(Boolean).length;
        expect(answerWords, `${slug} FAQ ${item.q}`).toBeGreaterThanOrEqual(40);
        expect(answerWords, `${slug} FAQ ${item.q}`).toBeLessThanOrEqual(60);
      }
      expect(hasGfmTable(post.content), `${slug} comparison table`).toBe(true);
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
      expect(internalLinks, `${slug} skills CTA`).toContain('/skills');
      expect(extractInternalLinks(conclusion).length, `${slug} conclusion CTA`).toBeGreaterThan(0);
      for (const linkedSlug of extractBlogSlugs(post.content)) {
        expect(posts[linkedSlug], `${slug} linked blog ${linkedSlug}`).toBeDefined();
        expect(getCanonicalBlogSlug(linkedSlug), `${slug} canonical link ${linkedSlug}`).toBe(
          linkedSlug,
        );
      }
      for (const paragraph of extractReadableParagraphs(post.content)) {
        const sentences = countReadableSentences(paragraph);
        expect(sentences, `${slug} paragraph minimum`).toBeGreaterThanOrEqual(2);
        expect(sentences, `${slug} paragraph maximum`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('contains no banned text and does not collide with existing articles', () => {
    for (const { slug, post } of articleFactory250Posts) {
      const complete = `${post.title}\n${post.description}\n${post.content}`;
      const policyText = complete
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`\n]+`/g, ' ')
        .toLowerCase();

      expect(complete, `${slug} em dash`).not.toContain('—');
      expect(complete, `${slug} ASCII`).not.toMatch(/[^\x00-\x7f]/);
      for (const phrase of bannedPhrases) {
        expect(policyText, `${slug} banned phrase ${phrase}`).not.toContain(phrase);
      }
      for (const legacy of legacyInventory) {
        expect(
          slug.includes(legacy.slug) || legacy.slug.includes(slug),
          `${slug} slug collision ${legacy.slug}`,
        ).toBe(false);
        expect(
          tokenOverlap(post.title, legacy.title),
          `${slug} title collision ${legacy.slug}`,
        ).toBeLessThanOrEqual(0.6);
        if (legacy.primaryKeyword) {
          expect(
            normalize(post.primaryKeyword!),
            `${slug} keyword collision ${legacy.slug}`,
          ).not.toBe(normalize(legacy.primaryKeyword));
        }
      }
    }
  });

  it('keeps shared eight-word prose below one-percent containment', () => {
    const overlap = findHighestShingleOverlap(
      articleFactory250Posts.map(({ slug, post }) => ({
        slug,
        clusterId: 'article-factory-250-2026-07-25',
        post,
      })),
    );

    expect(overlap).not.toBeNull();
    expect(overlap!.containment, JSON.stringify(overlap)).toBeLessThan(0.01);
  });
});
