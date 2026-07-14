import { describe, expect, it } from 'vitest';
import {
  seoPublicationWaveOne2026,
  seoTopicClusters2026,
  seoTopicPlan2026,
} from './seo-topic-plan-2026';

describe('2026 SEO topic plan', () => {
  it('maps exactly 100 unique topics into 10 clusters', () => {
    expect(seoTopicClusters2026).toHaveLength(10);
    expect(seoTopicPlan2026).toHaveLength(100);

    const slugs = seoTopicPlan2026.map(({ slug }) => slug);
    const titles = seoTopicPlan2026.map(({ title }) => title.toLowerCase());
    const keywords = seoTopicPlan2026.map(({ primaryKeyword }) => primaryKeyword.toLowerCase());

    expect(new Set(slugs).size).toBe(100);
    expect(new Set(titles).size).toBe(100);
    expect(new Set(keywords).size).toBe(100);
  });

  it('assigns one pillar and four first-wave children to every cluster', () => {
    for (const cluster of seoTopicClusters2026) {
      expect(cluster.topics).toHaveLength(10);
      expect(cluster.topics.filter(({ role }) => role === 'pillar')).toHaveLength(1);
      expect(cluster.topics.filter(({ publicationWave }) => publicationWave === 1)).toHaveLength(5);
      expect(cluster.evidenceSources.length).toBeGreaterThanOrEqual(2);
      expect(cluster.evidenceSources.every((source) => source.startsWith('https://'))).toBe(true);
    }

    expect(seoPublicationWaveOne2026).toHaveLength(50);
    expect(seoPublicationWaveOne2026.filter(({ role }) => role === 'pillar')).toHaveLength(10);
  });

  it('keeps titles and keywords usable as on-page SEO targets', () => {
    for (const topic of seoTopicPlan2026) {
      expect(topic.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(topic.title.length).toBeGreaterThanOrEqual(35);
      expect(topic.title.length).toBeLessThanOrEqual(85);
      expect(topic.primaryKeyword.length).toBeGreaterThanOrEqual(8);
    }
  });
});
