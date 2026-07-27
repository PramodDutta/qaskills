import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 529,
  slug: 'selenium-grid-stereotype-slot-matching',
  campaignCluster: 'browser-e2e',
  title: 'Selenium Grid Stereotype Slot Matching',
  description:
    'selenium Grid stereotype slot matching: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'selenium Grid stereotype slot matching',
  intent: 'troubleshooting',
  coreQuestion:
    'What causes failures in capability stereotypes and slot selection mismatches, and which browser evidence identifies the real cause?',
  intentBoundary:
    'Owns capability stereotypes and slot selection mismatches. It excludes broad desired-capabilities setup.',
  secondaryKeywords: [
    'selenium Grid stereotype slot matching example',
    'debug selenium Grid stereotype slot matching',
    'Selenium Grid stereotype',
    'Selenium Grid slot matcher',
    'capability mismatch browser test',
    'selenium Grid stereotype slot matching CI checks',
  ],
  repoEvidence: [
    'seed-skills/selenium-grid-parallel/SKILL.md',
    'packages/web/src/app/blog/posts/selenium-grid-tutorial-parallel-testing.ts',
    'packages/web/src/app/blog/posts/selenium-grid-4-docker-kubernetes-guide.ts',
    'docs/seo/article-factory-250-2026-07-25/inventory.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/e2e-testing',
    '/blog/selenium-grid-tutorial-parallel-testing',
    '/blog/selenium-grid-4-docker-kubernetes-guide',
    '/blog/playwright-e2e-complete-guide',
    '/blog/cypress-tutorial-beginners-2026',
  ],
  relatedSlugs: [
    'selenium-grid-tutorial-parallel-testing',
    'selenium-grid-4-docker-kubernetes-guide',
    'playwright-e2e-complete-guide',
    'cypress-tutorial-beginners-2026',
  ],
  sources: [
    'https://www.selenium.dev/documentation/grid/architecture/',
    'https://www.selenium.dev/documentation/grid/configuration/cli_options/',
    'https://www.selenium.dev/documentation/grid/advanced_features/observability/',
  ],
  codeExamples: [
    {
      title: 'Build the selenium Grid stereotype slot matching baseline',
      language: 'java',
      path: 'seed-skills/selenium-grid-parallel/SKILL.md',
      snippet:
        '// Example selenium-grid pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/selenium-grid-tutorial-parallel-testing.ts',
      snippet:
        "## Key Takeaways\n\n- **Selenium Grid 4** is a complete redesign from Grid 3, introducing a microservices architecture with Router, Distributor, Session Map, Session Queue, Node, and Event Bus components\n- **Docker Compose** provides the fastest path to a working Selenium Grid -- a single \\`docker compose up\\` command launches hub and browser nodes with configurable concurrency\n- **Dynamic Grid mode** automatically creates and destroys Docker containers per test session, guaranteeing clean browser state and eliminating idle resource waste\n- **Video recording** is built into Selenium's official Docker images, capturing full test execution videos without additional tooling\n- **Kubernetes with KEDA** enables auto-scaling Grid nodes based on the session queue length, handling burst test loads without manual capacity planning\n- **Cross-browser testing matrices** in CI/CD pipelines distribute tests across Chrome, Firefox, and Edge simultaneously, providing comprehensive browser coverage\n- **The Grid 4 dashboard** provides real-time visibility into active sessions, queued requests, and node health\n\n---\n\n## Understanding Selenium Grid 4 Architecture\n\nSelenium Grid 4 replaced the monolithic Hub/Node model of Grid 3 with a set of discrete components that can be deployed independently.\n\n### Grid 3: The Old Model",
    },
  ],
});
