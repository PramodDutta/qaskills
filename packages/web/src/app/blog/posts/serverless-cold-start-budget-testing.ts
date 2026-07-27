import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 787,
  slug: 'serverless-cold-start-budget-testing',
  campaignCluster: 'system-quality',
  title: 'Serverless Cold Start Budget Testing',
  description:
    'serverless cold start budget testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'serverless cold start budget testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams measure initialization latency separately from warm invocation latency?',
  intentBoundary:
    'Owns function cold starts, not browser performance or autoscaling stabilization.',
  secondaryKeywords: [
    'Lambda init duration',
    'provisioned concurrency baseline',
    'cold invocation percentile',
    'serverless cold start budget testing checklist',
    'serverless cold start budget testing CI strategy',
    'serverless cold start budget testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/serverless-testing/SKILL.md',
    'seed-skills/performance-budget-testing/SKILL.md',
    'packages/web/src/app/blog/posts/cloudflare-workers-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/chaos-mesh-kubernetes-testing-guide',
    '/blog/docker-testing-strategies-guide',
    '/blog/cloudflare-workers-testing-guide',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'chaos-mesh-kubernetes-testing-guide',
    'docker-testing-strategies-guide',
    'cloudflare-workers-testing-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html',
    'https://docs.aws.amazon.com/lambda/latest/operatorguide/execution-environments.html',
  ],
  codeExamples: [
    {
      title: 'Build the serverless cold start budget testing baseline',
      language: 'typescript',
      path: 'seed-skills/serverless-testing/SKILL.md',
      snippet:
        '// Example serverless pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/performance-budget-testing/SKILL.md',
      snippet: '',
    },
  ],
});
