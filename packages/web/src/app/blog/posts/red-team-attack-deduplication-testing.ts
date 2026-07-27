import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 718,
  slug: 'red-team-attack-deduplication-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Red Team Attack Deduplication Testing',
  description:
    'red team attack deduplication testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'red team attack deduplication testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test red team attack deduplication so semantic duplicates are grouped without erasing distinct strategies, contexts, or expected controls?',
  intentBoundary: 'Red-team corpus deduplication only, not general eval dataset duplicates.',
  secondaryKeywords: [
    'red team attack deduplication test cases',
    'how to test red team attack deduplication',
    'red team attack deduplication regression checks',
    'red team attack deduplication CI validation',
    'red team attack deduplication failure diagnosis',
    'red team attack deduplication QA checklist',
  ],
  repoEvidence: [
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/llm-guardrails-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/llm-guardrails-testing-guide-2026',
    '/blog/domain-specific-ai-red-team-playbook-guide',
    '/blog/promptfoo-complete-guide-2026',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'llm-guardrails-testing-guide-2026',
    'domain-specific-ai-red-team-playbook-guide',
    'promptfoo-complete-guide-2026',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/red-team/configuration/',
    'https://www.promptfoo.dev/docs/red-team/troubleshooting/best-practices/',
    'https://www.nist.gov/itl/ai-risk-management-framework',
  ],
  codeExamples: [
    {
      title: 'Build the red team attack deduplication testing baseline',
      language: 'bash',
      path: 'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
      snippet:
        'npm install -g promptfoo\nexport OPENAI_API_KEY=...      # or anthropic, etc.\npromptfoo init                  # scaffolds promptfooconfig.yaml',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/ai-system-quality-engineer/SKILL.md',
      snippet: '',
    },
  ],
});
