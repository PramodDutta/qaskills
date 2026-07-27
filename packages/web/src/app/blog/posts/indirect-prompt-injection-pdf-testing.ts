import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 750,
  slug: 'indirect-prompt-injection-pdf-testing',
  campaignCluster: 'ai-llm-rag',
  title: 'Indirect Prompt Injection Pdf Testing',
  description:
    'indirect prompt injection PDF testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'indirect prompt injection PDF testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams test indirect prompt injection pdf so instructions embedded in document text, metadata, or hidden layers remain untrusted content?',
  intentBoundary:
    'Defensive PDF fixture handling only, with no real exploit payloads or bypass instructions.',
  secondaryKeywords: [
    'indirect prompt injection PDF test cases',
    'how to test indirect prompt injection pdf',
    'indirect prompt injection PDF regression checks',
    'indirect prompt injection PDF CI validation',
    'indirect prompt injection PDF failure diagnosis',
    'indirect prompt injection PDF QA checklist',
  ],
  repoEvidence: [
    'seed-skills/llm-security-testing/SKILL.md',
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'packages/web/src/app/blog/posts/prompt-injection-testing-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/prompt-injection-testing-guide-2026',
    '/blog/llm-guardrails-testing-guide-2026',
    '/blog/domain-specific-ai-red-team-playbook-guide',
    '/blog/testing-llm-applications-guide',
  ],
  relatedSlugs: [
    'prompt-injection-testing-guide-2026',
    'llm-guardrails-testing-guide-2026',
    'domain-specific-ai-red-team-playbook-guide',
    'testing-llm-applications-guide',
  ],
  sources: [
    'https://genai.owasp.org/llmrisk/llm01-prompt-injection/',
    'https://www.nist.gov/publications/adversarial-machine-learning-taxonomy-and-terminology-attacks-and-mitigations',
    'https://www.promptfoo.dev/docs/red-team/configuration/',
  ],
  codeExamples: [
    {
      title: 'Build the indirect prompt injection PDF testing baseline',
      language: 'python',
      path: 'seed-skills/llm-security-testing/SKILL.md',
      snippet:
        '// Example llm pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
      snippet: '',
    },
  ],
});
