import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 938,
  slug: 'visual-regression-font-loading-stability',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Visual Regression Font Loading Stability',
  description:
    'visual regression font loading stability: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'visual regression font loading stability',
  intent: 'troubleshooting',
  coreQuestion:
    'How can visual tests wait for web fonts, detect fallback rendering, and avoid approving a false baseline?',
  intentBoundary:
    'The nearest page covers a broader visual workflow. This candidate owns font-readiness oracles before snapshot capture.',
  secondaryKeywords: [
    'visual test font loading',
    'document fonts ready screenshot',
    'fallback font baseline drift',
    'web font timeout visual test',
    'font metric screenshot diff',
  ],
  repoEvidence: [
    'seed-skills/percy-visual-regression/SKILL.md',
    'seed-skills/screenshot-testing-ci/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/visual-regression-testing-guide',
    '/blog/visual-baseline-governance-guide-2026',
    '/blog/cypress-image-snapshot-visual-guide',
    '/blog/test-automation-framework-architecture',
  ],
  relatedSlugs: [
    'visual-regression-testing-guide',
    'visual-baseline-governance-guide-2026',
    'cypress-image-snapshot-visual-guide',
    'test-automation-framework-architecture',
  ],
  sources: [
    'https://docs.cypress.io/api/commands/screenshot',
    'https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/ready',
    'https://www.browserstack.com/docs/percy/take-percy-snapshots/overview',
  ],
  codeExamples: [
    {
      title: 'Build the visual regression font loading stability baseline',
      language: 'bash',
      path: 'seed-skills/percy-visual-regression/SKILL.md',
      snippet:
        'npm i -D @percy/cli @percy/playwright\nexport PERCY_TOKEN=...            # project token from percy.io',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/screenshot-testing-ci/SKILL.md',
      snippet: '',
    },
  ],
});
