import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 639,
  slug: 'red-team-plugin-coverage-mapping',
  campaignCluster: 'ai-llm-rag',
  title: 'Red Team Plugin Coverage Mapping',
  description:
    'red team plugin coverage mapping: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'red team plugin coverage mapping',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test red team plugin coverage mapping so each declared risk and trust boundary maps to at least one enabled plugin and reviewed test?',
  intentBoundary:
    'Coverage traceability from risks to plugins only, not a broad red-team configuration guide.',
  secondaryKeywords: [
    'red team plugin coverage mapping test cases',
    'how to test red team plugin coverage mapping',
    'red team plugin coverage mapping regression checks',
    'red team plugin coverage mapping CI validation',
    'red team plugin coverage mapping failure diagnosis',
    'red team plugin coverage mapping QA checklist',
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
      title: 'Build the red team plugin coverage mapping baseline',
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
