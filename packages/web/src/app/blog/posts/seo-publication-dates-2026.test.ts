import { describe, expect, it } from 'vitest';
import {
  getSeoTopicPublicationDate2026,
  SEO_WAVE_LAUNCH_DATE_2026,
  seoPublicationWaveOne2026,
  seoTopicPlan2026,
  seoUpgradeOriginalPublicationDates2026,
} from './seo-topic-plan-2026';
import { seoWaveOneArticles2026 } from './seo-wave-one-articles-2026';

const expectedUpgradeDates2026 = {
  'playwright-e2e-complete-guide': '2026-02-13',
  'playwright-locators-best-practices-2026': '2026-04-01',
  'playwright-browser-context-guide-2026': '2026-04-01',
  'playwright-starthar-tracing-guide': '2026-07-13',
  'playwright-drop-api-drag-and-drop': '2026-07-13',
  'playwright-cli-complete-guide-2026': '2026-03-24',
  'playwright-mcp-browser-automation-guide': '2026-05-18',
  'playwright-mcp-json-configuration-reference': '2026-06-03',
  'playwright-mcp-security-best-practices-2026': '2026-03-24',
  'playwright-mcp-docker-guide-2026': '2026-03-24',
  'playwright-test-agents-planner-generator-healer': '2026-07-03',
  'playwright-init-agents-guide': '2026-07-06',
  'playwright-healer-agent-self-healing-tests': '2026-07-07',
  'ai-test-automation-tools-2026': '2026-02-17',
  'testing-ai-generated-code-sdet-playbook': '2026-02-19',
  'self-healing-test-automation-guide': '2026-07-02',
  'testing-llm-applications-guide': '2026-03-17',
  'ai-agent-eval-testing-guide': '2026-04-13',
  'llm-judge-calibration-guide-2026': '2026-07-09',
  'deepeval-llm-testing-guide': '2026-07-05',
  'deepeval-task-completion-metric-agent': '2026-07-13',
  'deepeval-tool-correctness-metric-example': '2026-07-13',
  'promptfoo-complete-guide-2026': '2026-05-21',
  'rag-evaluation-metrics-complete-2026': '2026-06-04',
  'rag-context-precision-recall-guide-2026': '2026-03-24',
  'testing-rag-no-answer-abstention': '2026-07-13',
  'mcp-server-testing-guide-2026': '2026-06-14',
  'mcp-inspector-tutorial-2026': '2026-03-24',
  'mcp-server-contract-testing-guide': '2026-07-10',
} as const;

const waveOneArticleBySlug = new Map(
  seoWaveOneArticles2026.map((article) => [article.slug, article]),
);

describe('2026 SEO publication dates', () => {
  it('maps every upgrade slug to its original publication date', () => {
    const upgradeTopics = seoTopicPlan2026.filter(
      ({ canonicalStrategy }) => canonicalStrategy === 'upgrade',
    );

    expect(seoUpgradeOriginalPublicationDates2026).toEqual(expectedUpgradeDates2026);
    expect(new Set(Object.keys(expectedUpgradeDates2026))).toEqual(
      new Set(upgradeTopics.map(({ slug }) => slug)),
    );

    for (const topic of upgradeTopics) {
      expect(getSeoTopicPublicationDate2026(topic), topic.slug).toBe(
        expectedUpgradeDates2026[topic.slug as keyof typeof expectedUpgradeDates2026],
      );
    }
  });

  it('maps every new slug to the wave launch date', () => {
    for (const topic of seoTopicPlan2026.filter(
      ({ canonicalStrategy }) => canonicalStrategy === 'new',
    )) {
      expect(getSeoTopicPublicationDate2026(topic), topic.slug).toBe(SEO_WAVE_LAUNCH_DATE_2026);
    }
  });

  it('applies preserved dates to managed wave-one metadata', () => {
    for (const topic of seoPublicationWaveOne2026) {
      const article = waveOneArticleBySlug.get(topic.slug);

      expect(article, `${topic.slug} must be in the wave-one manifest`).toBeDefined();
      expect(article?.post.updated, topic.slug).toBe(SEO_WAVE_LAUNCH_DATE_2026);

      expect(article?.post.date, topic.slug).toBe(getSeoTopicPublicationDate2026(topic));
    }
  });
});
