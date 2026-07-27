import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 671,
  slug: 'red-team-remediation-replay-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Red Team Remediation Replay Testing',
  description:
    'red team remediation replay testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'red team remediation replay testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test red team remediation replay so confirmed findings become pinned regression cases and still exercise the original vulnerable path?',
  intentBoundary:
    'Post-remediation replay of confirmed findings only, not generative scan reproducibility.',
  secondaryKeywords: [
    'red team remediation replay test cases',
    'how to test red team remediation replay',
    'red team remediation replay regression checks',
    'red team remediation replay CI validation',
    'red team remediation replay failure diagnosis',
    'red team remediation replay QA checklist',
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
      title: 'Build the red team remediation replay testing baseline',
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
