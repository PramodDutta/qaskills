import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCanonicalBlogSlug } from '../../../lib/blog-canonical';
import { extractFAQs } from '../../../lib/extract-faqs';
import { posts } from './index';
import { countArticleWords, countCodeBlocks, type SeoClusterArticle } from './seo-cluster-article';
import {
  extractBlogSlugs,
  findHighestShingleOverlap,
  getFaqCount,
  getIntroductionWords,
} from './seo-cluster-quality';
import { seoPublicationWaveOne2026 } from './seo-topic-plan-2026';
import { seoWaveOneArticles2026 } from './seo-wave-one-articles-2026';

const articleBySlug = new Map(seoWaveOneArticles2026.map((article) => [article.slug, article]));
const planBySlug = new Map(seoPublicationWaveOne2026.map((article) => [article.slug, article]));

function expectPublicationMetadata(article: SeoClusterArticle) {
  const { post } = article;
  const plan = planBySlug.get(article.slug);

  expect(plan, `${article.slug} must exist in the approved wave-one plan`).toBeDefined();
  expect(post.title).toBe(plan?.title);
  expect(post.primaryKeyword).toBe(plan?.primaryKeyword);
  expect(post.contentKind).toBe(plan?.role);
  expect(post.description.length).toBeGreaterThanOrEqual(120);
  expect(post.description.length).toBeLessThanOrEqual(180);
  expect(post.updated).toBe('2026-07-14');
  expect(post.keywords?.length).toBeGreaterThanOrEqual(6);
  expect(post.keywords?.length).toBeLessThanOrEqual(10);
  expect(post.keywords).toContain(post.primaryKeyword);
  expect(post.sources?.length).toBeGreaterThanOrEqual(2);
  expect(post.sources?.every((source) => source.startsWith('https://'))).toBe(true);
  expect(post.image).toMatch(/^\/blog\/pillars\/[a-z0-9-]+\.png$/);
  expect(post.imageAlt?.length).toBeGreaterThanOrEqual(40);
  expect(existsSync(path.join(process.cwd(), 'public', post.image!.slice(1)))).toBe(true);
  expect(post.content).toContain('(/skills)');
  expect(post.content).toContain('(/skills/Pramod/playwright-cli)');
  expect(post.content).not.toMatch(/search opportunity|long-tail opportunity|people searching/i);
  expect(post.content).not.toMatch(/\b(?:TODO|TBD)\b/);
  expect(post.content).not.toMatch(/lorem ipsum/i);

  const introduction = getIntroductionWords(post.content).toLowerCase();
  for (const keywordPart of post.primaryKeyword!.toLowerCase().split(/\s+/)) {
    expect(introduction).toContain(keywordPart.replace(/[^a-z0-9@^-]/g, ''));
  }
}

describe('2026 SEO wave-one publication manifest', () => {
  it('registers complete five-article clusters without duplicate identities', () => {
    expect(seoWaveOneArticles2026).toHaveLength(50);
    expect(new Set(seoWaveOneArticles2026.map(({ clusterId }) => clusterId)).size).toBe(10);
    expect(seoWaveOneArticles2026.filter(({ post }) => post.contentKind === 'pillar')).toHaveLength(
      10,
    );
    expect(seoWaveOneArticles2026.filter(({ post }) => post.contentKind === 'child')).toHaveLength(
      40,
    );
    expect(new Set(seoWaveOneArticles2026.map(({ slug }) => slug))).toEqual(
      new Set(seoPublicationWaveOne2026.map(({ slug }) => slug)),
    );
    expect(new Set(seoWaveOneArticles2026.map(({ slug }) => slug)).size).toBe(
      seoWaveOneArticles2026.length,
    );
    expect(new Set(seoWaveOneArticles2026.map(({ post }) => post.title.toLowerCase())).size).toBe(
      seoWaveOneArticles2026.length,
    );
    expect(
      new Set(seoWaveOneArticles2026.map(({ post }) => post.primaryKeyword!.toLowerCase())).size,
    ).toBe(seoWaveOneArticles2026.length);

    for (const article of seoWaveOneArticles2026) expectPublicationMetadata(article);
  });

  it('enforces one pillar and four reciprocal children per completed cluster', () => {
    const clusterIds = new Set(seoWaveOneArticles2026.map(({ clusterId }) => clusterId));

    for (const clusterId of clusterIds) {
      const articles = seoWaveOneArticles2026.filter((article) => article.clusterId === clusterId);
      const pillars = articles.filter(({ post }) => post.contentKind === 'pillar');
      const children = articles.filter(({ post }) => post.contentKind === 'child');

      expect(articles, clusterId).toHaveLength(5);
      expect(pillars, clusterId).toHaveLength(1);
      expect(children, clusterId).toHaveLength(4);

      const pillar = pillars[0];
      expect(pillar.post.pillarSlug).toBeUndefined();
      expect(new Set(pillar.post.relatedSlugs)).toEqual(new Set(children.map(({ slug }) => slug)));

      for (const child of children) {
        expect(child.post.pillarSlug).toBe(pillar.slug);
        expect(child.post.relatedSlugs).toContain(pillar.slug);
        expect(child.post.content).toContain(`(/blog/${pillar.slug})`);
        expect(pillar.post.content).toContain(`(/blog/${child.slug})`);
      }
    }
  });

  it('enforces article length, FAQ, and technical-depth floors', () => {
    for (const article of seoWaveOneArticles2026) {
      const isPillar = article.post.contentKind === 'pillar';
      const words = countArticleWords(article.post.content);

      expect(words, article.slug).toBeGreaterThanOrEqual(isPillar ? 9_500 : 2_800);
      expect(words, article.slug).toBeLessThanOrEqual(isPillar ? 12_500 : 4_500);
      expect(getFaqCount(article.post.content), article.slug).toBeGreaterThanOrEqual(
        isPillar ? 8 : 6,
      );
      expect(
        extractFAQs(article.post.content).length,
        `${article.slug} FAQPage source`,
      ).toBeGreaterThanOrEqual(isPillar ? 8 : 6);
      expect(countCodeBlocks(article.post.content), article.slug).toBeGreaterThanOrEqual(
        isPillar ? 5 : 2,
      );
    }
  });

  it('uses only registered, direct canonical blog links', () => {
    for (const article of seoWaveOneArticles2026) {
      for (const linkedSlug of extractBlogSlugs(article.post.content)) {
        expect(
          articleBySlug.has(linkedSlug) || Boolean(posts[linkedSlug]),
          `${article.slug} links to missing ${linkedSlug}`,
        ).toBe(true);
        expect(
          getCanonicalBlogSlug(linkedSlug),
          `${article.slug} links through alias ${linkedSlug}`,
        ).toBe(linkedSlug);
      }
    }
  });

  it('keeps shared eight-word prose below the one-percent containment ceiling', () => {
    const highest = findHighestShingleOverlap(seoWaveOneArticles2026);
    expect(highest).not.toBeNull();
    expect(highest!.containment, JSON.stringify(highest)).toBeLessThan(0.01);
  });
});
