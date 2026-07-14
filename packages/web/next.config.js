/** @type {import('next').NextConfig} */

// Blog cannibalization consolidation: 301-redirect near-duplicate slugs into one
// canonical page so ranking signal consolidates. KEEP IN SYNC with
// src/lib/blog-canonical.ts BLOG_CANONICAL_REDIRECTS (which hides these aliases
// from the sitemap, listing, and related-posts). blog-canonical.test.ts guards
// that both stay aligned.
const BLOG_ALIASES = {
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
};

const nextConfig = {
  transpilePackages: ['@qaskills/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async redirects() {
    return Object.entries(BLOG_ALIASES).map(([alias, canonical]) => ({
      source: `/blog/${alias}`,
      destination: `/blog/${canonical}`,
      permanent: true,
    }));
  },
};

module.exports = nextConfig;
