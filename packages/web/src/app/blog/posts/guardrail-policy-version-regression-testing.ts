import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 689,
  slug: 'guardrail-policy-version-regression-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Guardrail Policy Version Regression Testing',
  description:
    'guardrail policy version regression testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'guardrail policy version regression testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test guardrail policy version regression so every policy revision replays approved positive, negative, exception, and ambiguity cases?',
  intentBoundary:
    'Behavioral regression across guardrail policy versions only, not prompt rollback.',
  secondaryKeywords: [
    'guardrail policy version regression test cases',
    'how to test guardrail policy version regression',
    'guardrail policy version regression regression checks',
    'guardrail policy version regression CI validation',
    'guardrail policy version regression failure diagnosis',
    'guardrail policy version regression QA checklist',
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
      title: 'Build the guardrail policy version regression testing baseline',
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
