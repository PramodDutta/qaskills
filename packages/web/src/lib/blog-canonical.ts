export const BLOG_CANONICAL_REDIRECTS = {
  'playwright-three-agent-system-planner-generator-healer':
    'playwright-test-agents-planner-generator-healer',
  'playwright-ai-agents-planner-generator-healer':
    'playwright-test-agents-planner-generator-healer',
  'playwright-test-agents-planner-generator-healer-official-2026':
    'playwright-test-agents-planner-generator-healer',
  'playwright-test-agents-planner-generator-healer-2026':
    'playwright-test-agents-planner-generator-healer',
  'playwright-planner-generator-agents-guide': 'playwright-test-agents-planner-generator-healer',
  'playwright-test-agents-planner-generator-healer-guide':
    'playwright-test-agents-planner-generator-healer',

  'playwright-mcp-server-configuration-2026': 'playwright-mcp-json-configuration-reference',
  'playwright-mcp-server-config-guide-2026': 'playwright-mcp-json-configuration-reference',

  'deepeval-llm-testing-guide-2026': 'deepeval-llm-testing-guide',
  'deepeval-llm-testing-framework-guide': 'deepeval-llm-testing-guide',
  'deepeval-llm-testing-framework-guide-2026': 'deepeval-llm-testing-guide',
  'deepeval-python-llm-evaluation-guide': 'deepeval-llm-testing-guide',
  'deepeval-pytest-llm-testing-guide': 'deepeval-llm-testing-guide',
  'deepeval-complete-guide-2026': 'deepeval-llm-testing-guide',
  'deepeval-task-completion-guide-2026': 'deepeval-task-completion-metric-agent',

  'promptfoo-complete-guide-qa-teams-2026': 'promptfoo-complete-guide-2026',
  'promptfoo-llm-red-teaming-guide': 'promptfoo-red-teaming-llm-applications',
  'promptfoo-red-teaming-guide-2026': 'promptfoo-red-teaming-llm-applications',
  'promptfoo-red-teaming-llm-guide': 'promptfoo-red-teaming-llm-applications',

  'rag-testing-complete-guide-2026': 'rag-evaluation-metrics-complete-2026',
  'rag-evaluation-metrics-explained-2026': 'rag-evaluation-metrics-complete-2026',
  'rag-regression-testing-cicd-2026': 'rag-regression-testing-guide',
  'rag-regression-testing-guide-2026': 'rag-regression-testing-guide',

  'llm-as-a-judge-evaluation-guide-2026': 'llm-as-a-judge-evaluation-guide',
  'llm-as-judge-evaluation-guide-2026': 'llm-as-a-judge-evaluation-guide',

  'best-ai-test-automation-tools-detailed-2026': 'ai-test-automation-tools-2026',
  'test-automation-with-ai-complete-guide': 'ai-test-automation-tools-2026',

  'promptfoo-vs-deepeval-2026-comparison': 'promptfoo-vs-deepeval-2026',
  'deepeval-vs-promptfoo-2026': 'promptfoo-vs-deepeval-2026',
  'deepeval-vs-ragas-vs-promptfoo-2026': 'promptfoo-vs-deepeval-vs-ragas-2026',

  'playwright-component-testing-react-2026': 'playwright-component-testing-react-guide-2026',
  'playwright-component-testing-react-guide': 'playwright-component-testing-react-guide-2026',
  'playwright-component-testing-react-complete-guide':
    'playwright-component-testing-react-guide-2026',

  // Consolidation pass 2026-07-10 (from docs/seo/CANNIBALIZATION-MAP-2026-07.md)
  'playwright-mobile-emulation': 'playwright-mobile-emulation-guide',
  'playwright-mobile-emulation-device-guide': 'playwright-mobile-emulation-guide',
  'playwright-mobile-emulation-devices-reference': 'playwright-mobile-emulation-guide',
  'playwright-mobile-emulation-guide-2026': 'playwright-mobile-emulation-guide',
  'playwright-mobile-emulation-reference': 'playwright-mobile-emulation-guide',

  'playwright-network-interception-mocking-guide': 'playwright-network-mocking-route-handler-guide',
  'playwright-network-interception-mocking-guide-2026':
    'playwright-network-mocking-route-handler-guide',
  'playwright-network-mocking-guide-2026': 'playwright-network-mocking-route-handler-guide',
  'playwright-network-mocking-route-guide-2026': 'playwright-network-mocking-route-handler-guide',

  'self-healing-test-automation-2026': 'self-healing-test-automation-guide',
  'self-healing-test-automation-2026-guide': 'self-healing-test-automation-guide',
  'self-healing-test-automation-ai-2026': 'self-healing-test-automation-guide',

  'k6-vs-jmeter-2026-which-better': 'k6-vs-jmeter-2026',
  'k6-vs-jmeter-performance-testing': 'k6-vs-jmeter-2026',
} as const;

type BlogCanonicalAlias = keyof typeof BLOG_CANONICAL_REDIRECTS;

export function getCanonicalBlogSlug(slug: string): string {
  return BLOG_CANONICAL_REDIRECTS[slug as BlogCanonicalAlias] ?? slug;
}

export function isCanonicalBlogSlug(slug: string): boolean {
  return getCanonicalBlogSlug(slug) === slug;
}
