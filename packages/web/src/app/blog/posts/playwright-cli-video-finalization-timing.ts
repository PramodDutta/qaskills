import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 561,
  slug: 'playwright-cli-video-finalization-timing',
  campaignCluster: 'browser-e2e',
  title: 'Playwright CLI Video Finalization Timing',
  description:
    'playwright CLI video finalization timing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'playwright CLI video finalization timing',
  intent: 'troubleshooting',
  coreQuestion:
    'What causes failures in video file finalization after stopping a CLI recording, and which browser evidence identifies the real cause?',
  intentBoundary:
    'Owns video file finalization after stopping a CLI recording. It excludes Playwright Test video recording configuration.',
  secondaryKeywords: [
    'playwright CLI video finalization timing example',
    'debug playwright CLI video finalization timing',
    'Playwright video stop command',
    'Playwright file finalization',
    'recording flush browser test',
    'playwright CLI video finalization timing CI checks',
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
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md',
  ],
  codeExamples: [
    {
      title: 'Build the playwright CLI video finalization timing baseline',
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
