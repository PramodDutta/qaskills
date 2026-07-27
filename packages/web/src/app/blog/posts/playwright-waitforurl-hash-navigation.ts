import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 513,
  slug: 'playwright-waitforurl-hash-navigation',
  campaignCluster: 'browser-e2e',
  title: 'Playwright Waitforurl Hash Navigation',
  description:
    'playwright waitforurl hash navigation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright waitforurl hash navigation',
  intent: 'troubleshooting',
  coreQuestion:
    'How do you wait for same-document hash and history navigation with Playwright without racing the URL change?',
  intentBoundary:
    'Owns synchronization for same-document URL changes, while the back-button article owns history behavior assertions.',
  secondaryKeywords: [
    'playwright waitforurl hash',
    'same document navigation playwright',
    'playwright history api test',
    'wait for url fragment',
    'pushstate navigation assertion',
    'browser back hash test',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/playwright-test-browser-back-button-history.ts',
    'seed-skills/regression-suite-bug-reports/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-test-browser-back-button-history',
    '/blog/playwright-multiple-tabs-windows-guide',
    '/blog/playwright-testing-best-practices-2026',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-test-browser-back-button-history',
    'playwright-multiple-tabs-windows-guide',
    'playwright-testing-best-practices-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-page#page-wait-for-url',
    'https://playwright.dev/docs/navigations',
    'https://playwright.dev/docs/events',
  ],
  codeExamples: [
    {
      title: 'Build the playwright waitforurl hash navigation baseline',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/playwright-test-browser-back-button-history.ts',
      snippet:
        'export const post: BlogPost = {\n  title: "Test Browser Back-Button History in Playwright",\n  description:\n    "Test browser back-button history in Playwright with real navigation, URL and UI assertions, history-state checks, bfcache awareness, and deterministic fixtures.",\n  date: "2026-07-13",\n  category: "Tutorial",\n  content: `\n# Test Browser Back-Button History in Playwright\n\nClick a product card, change a filter, open its details, then press Back. The URL may return while the list resets to page one, the scroll position jumps, or a stale detail view remains mounted. A useful Playwright history test observes all of those layers instead of treating \\`page.goBack()\\` as the assertion.\n\n## Browser history is more than the previous URL\n\nThe history stack records entries for document navigations and for calls to \\`history.pushState()\\`. A browser may restore a prior document from the back-forward cache, rebuild it through a network request, or let a client router render from its own cache. Those paths can produce the same address with different UI state.\n\n| Layer | Example failure after Back | What to assert |\n|---|---|---|\n| Address | Detail URL remains | \\`expect(page).toHaveURL()\\` |',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/regression-suite-bug-reports/SKILL.md',
      snippet:
        'data-integrity/\n      BUG-3456-duplicate-order-submission.spec.ts\n      BUG-3789-unicode-name-truncation.spec.ts\n    ui-rendering/\n      BUG-4123-modal-overlay-scroll.spec.ts\n      BUG-4567-responsive-table-overflow.spec.ts\n    api/\n      BUG-5234-pagination-off-by-one.spec.ts\n      BUG-5678-rate-limit-header-missing.spec.ts\n  fixtures/\n    regression-data.ts\n    bug-report-parser.ts\n  helpers/\n    regression-utils.ts\n    incident-tracker.ts\n  reports/\n    regression-coverage.json\n    defect-recurrence.json',
    },
  ],
});
