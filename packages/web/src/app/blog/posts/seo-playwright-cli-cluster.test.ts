import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCanonicalBlogSlug } from '../../../lib/blog-canonical';
import { posts } from './index';
import { playwrightCliChildren2026 } from './children-playwright-cli-2026';
import { playwrightCliPillar2026 } from './pillar-playwright-cli-2026';
import { countArticleWords, countCodeBlocks, type SeoClusterArticle } from './seo-cluster-article';
import {
  extractBlogSlugs,
  findHighestShingleOverlap,
  getFaqCount,
  getIntroductionWords,
} from './seo-cluster-quality';
import {
  getSeoTopicPublicationDate2026,
  seoPublicationWaveOne2026,
} from './seo-topic-plan-2026';

const clusterArticles = [playwrightCliPillar2026, ...playwrightCliChildren2026];
const clusterSlugs = new Set(clusterArticles.map(({ slug }) => slug));
const plannedArticles = seoPublicationWaveOne2026.filter(
  ({ clusterId }) => clusterId === 'playwright-cli',
);

function expectCommonMetadata(article: SeoClusterArticle) {
  const { post } = article;
  const plan = plannedArticles.find(({ slug }) => slug === article.slug);

  expect(plan).toBeDefined();
  expect(article.clusterId).toBe('playwright-cli');
  expect(post.title).toBe(plan?.title);
  expect(post.primaryKeyword).toBe(plan?.primaryKeyword);
  expect(post.contentKind).toBe(plan?.role);
  expect(post.description.length).toBeGreaterThanOrEqual(120);
  expect(post.description.length).toBeLessThanOrEqual(180);
  expect(post.date).toBe(getSeoTopicPublicationDate2026(plan!));
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

describe('Playwright CLI pillar cluster', () => {
  it('implements the five approved first-wave search jobs', () => {
    expect(clusterArticles).toHaveLength(5);
    expect(plannedArticles).toHaveLength(5);
    expect(new Set(clusterArticles.map(({ slug }) => slug))).toEqual(
      new Set(plannedArticles.map(({ slug }) => slug)),
    );

    for (const article of clusterArticles) expectCommonMetadata(article);
  });

  it('meets length, FAQ, code, and relationship gates', () => {
    const pillar = playwrightCliPillar2026;

    expect(countArticleWords(pillar.post.content)).toBeGreaterThanOrEqual(9_500);
    expect(countArticleWords(pillar.post.content)).toBeLessThanOrEqual(12_500);
    expect(getFaqCount(pillar.post.content)).toBeGreaterThanOrEqual(8);
    expect(countCodeBlocks(pillar.post.content)).toBeGreaterThanOrEqual(5);
    expect(pillar.post.pillarSlug).toBeUndefined();
    expect(new Set(pillar.post.relatedSlugs)).toEqual(
      new Set(playwrightCliChildren2026.map(({ slug }) => slug)),
    );

    for (const child of playwrightCliChildren2026) {
      expect(countArticleWords(child.post.content)).toBeGreaterThanOrEqual(2_800);
      expect(countArticleWords(child.post.content)).toBeLessThanOrEqual(4_500);
      expect(getFaqCount(child.post.content)).toBeGreaterThanOrEqual(6);
      expect(countCodeBlocks(child.post.content)).toBeGreaterThanOrEqual(2);
      expect(child.post.pillarSlug).toBe(pillar.slug);
      expect(child.post.relatedSlugs).toContain(pillar.slug);
      expect(child.post.content).toContain(`(/blog/${pillar.slug})`);
    }

    for (const child of playwrightCliChildren2026) {
      expect(pillar.post.content).toContain(`(/blog/${child.slug})`);
    }
  });

  it('uses only resolvable canonical article links', () => {
    for (const article of clusterArticles) {
      for (const linkedSlug of extractBlogSlugs(article.post.content)) {
        expect(clusterSlugs.has(linkedSlug) || Boolean(posts[linkedSlug])).toBe(true);
        expect(getCanonicalBlogSlug(linkedSlug)).toBe(linkedSlug);
      }
    }
  });

  it('does not reuse an eight-word template across cluster articles', () => {
    const highest = findHighestShingleOverlap(clusterArticles);
    expect(highest).not.toBeNull();
    expect(highest!.containment).toBeLessThan(0.01);
  });
});
