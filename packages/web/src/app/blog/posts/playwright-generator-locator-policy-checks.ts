import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 569,
  slug: 'playwright-generator-locator-policy-checks',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Generator Locator Policy Checks',
  description:
    'playwright generator locator policy checks: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'playwright generator locator policy checks',
  intent: 'how-to',
  coreQuestion:
    'How do QA teams verify validating generated locators against role-first policies with deterministic browser automation and useful failure evidence?',
  intentBoundary:
    'Owns validating generated locators against role-first policies. It excludes general locator best practices or code generation.',
  secondaryKeywords: [
    'playwright generator locator policy checks example',
    'debug playwright generator locator policy checks',
    'Playwright generated locator audit',
    'Playwright role first policy',
    'selector rejection browser test',
    'playwright generator locator policy checks CI checks',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/SKILL.md',
    'seed-skills/playwright-agents/SKILL.md',
    'packages/web/src/app/blog/posts/playwright-mcp-browser-automation-guide.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/skills/Pramod/playwright-cli',
    '/blog/playwright-cli-complete-guide-2026',
    '/blog/playwright-mcp-browser-automation-guide',
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-mcp-browser-automation-guide',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-agents',
    'https://playwright.dev/docs/codegen',
    'https://playwright.dev/docs/best-practices',
  ],
  codeExamples: [
    {
      title: 'Build the playwright generator locator policy checks baseline',
      language: 'bash',
      path: 'seed-skills/playwright-cli/SKILL.md',
      snippet:
        '# open new browser\nplaywright-cli open\n# navigate to a page\nplaywright-cli goto https://playwright.dev\n# interact with the page using refs from the snapshot\nplaywright-cli click e15\nplaywright-cli type "page.click"\nplaywright-cli press Enter\n# take a screenshot (rarely used, as snapshot is more common)\nplaywright-cli screenshot\n# close the browser\nplaywright-cli close',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/playwright-agents/SKILL.md',
      snippet:
        'healer/\n      healer-agent.ts\n      selector-resolver.ts\n      snapshot-analyzer.ts\n    orchestrator/\n      agent-orchestrator.ts\n      feedback-loop.ts\n      cost-tracker.ts\n  generated/\n    specs/\n      .gitkeep\n    approved/\n      .gitkeep\n  fixtures/\n    page-objects/\n      login.page.ts\n      dashboard.page.ts\n    snapshots/',
    },
  ],
});
