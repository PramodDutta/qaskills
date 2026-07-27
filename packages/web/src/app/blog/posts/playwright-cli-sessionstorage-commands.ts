import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 557,
  slug: 'playwright-cli-sessionstorage-commands',
  campaignCluster: 'browser-e2e',
  title: 'Playwright CLI Sessionstorage Commands',
  description:
    'playwright cli sessionstorage commands: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright cli sessionstorage commands',
  intent: 'how-to',
  coreQuestion:
    'How do you read, change, and reset sessionStorage values in the active Playwright CLI tab?',
  intentBoundary:
    'Covers tab-scoped Playwright CLI operations rather than the general WebStorage API guide.',
  secondaryKeywords: [
    'playwright cli sessionstorage list',
    'set sessionstorage terminal',
    'delete sessionstorage key',
    'clear sessionstorage playwright',
    'browser tab storage cli',
    'sessionstorage form state testing',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/SKILL.md',
    'seed-skills/playwright-cli/references/storage-state.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/skills/Pramod/playwright-cli',
    '/blog/playwright-cli-complete-guide-2026',
    '/blog/playwright-1-61-web-storage-api-guide-2026',
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-1-61-web-storage-api-guide-2026',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://playwright.dev/docs/api/class-page',
  ],
  codeExamples: [
    {
      title: 'Build the playwright cli sessionstorage commands baseline',
      language: 'bash',
      path: 'seed-skills/playwright-cli/SKILL.md',
      snippet:
        '# open new browser\nplaywright-cli open\n# navigate to a page\nplaywright-cli goto https://playwright.dev\n# interact with the page using refs from the snapshot\nplaywright-cli click e15\nplaywright-cli type "page.click"\nplaywright-cli press Enter\n# take a screenshot (rarely used, as snapshot is more common)\nplaywright-cli screenshot\n# close the browser\nplaywright-cli close',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/playwright-cli/references/storage-state.md',
      snippet: '',
    },
  ],
});
