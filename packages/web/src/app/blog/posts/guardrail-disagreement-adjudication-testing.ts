import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 749,
  slug: 'guardrail-disagreement-adjudication-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Guardrail Disagreement Adjudication Testing',
  description:
    'guardrail disagreement adjudication testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'guardrail disagreement adjudication testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test guardrail disagreement adjudication so conflicting input, output, policy, and model classifiers reach a deterministic reviewed action?',
  intentBoundary:
    'Decision handling when guardrails disagree only, not grader ensemble disagreement.',
  secondaryKeywords: [
    'guardrail disagreement adjudication test cases',
    'how to test guardrail disagreement adjudication',
    'guardrail disagreement adjudication regression checks',
    'guardrail disagreement adjudication CI validation',
    'guardrail disagreement adjudication failure diagnosis',
    'guardrail disagreement adjudication QA checklist',
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
      title: 'Build the guardrail disagreement adjudication testing baseline',
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
