import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 806,
  slug: 'mobile-database-upgrade-rollback-testing',
  campaignCluster: 'system-quality',
  title: 'Mobile Database Upgrade Rollback Testing',
  description:
    'mobile database upgrade rollback testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'mobile database upgrade rollback testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify interrupted schema upgrades recover without corrupting local app data?',
  intentBoundary: 'Owns on-device database rollback and recovery, not server rolling migrations.',
  secondaryKeywords: [
    'interrupted Room migration',
    'SQLite schema rollback',
    'local data integrity',
    'mobile database upgrade rollback testing checklist',
    'mobile database upgrade rollback testing CI strategy',
    'mobile database upgrade rollback testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/data-integrity-testing/SKILL.md',
    'seed-skills/offline-mode-tester/SKILL.md',
    'packages/web/src/app/blog/posts/mobile-testing-automation-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/mobile-testing-automation-guide',
    '/blog/appium-mobile-testing-complete-guide',
    '/blog/mobile-device-farm-testing-strategy-2026',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'mobile-testing-automation-guide',
    'appium-mobile-testing-complete-guide',
    'mobile-device-farm-testing-strategy-2026',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://www.sqlite.org/lang_altertable.html',
    'https://developer.android.com/training/data-storage/room/migrating-db-versions',
  ],
  codeExamples: [
    {
      title: 'Build the mobile database upgrade rollback testing baseline',
      language: 'python',
      path: 'seed-skills/data-integrity-testing/SKILL.md',
      snippet:
        '// Example data-integrity pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/offline-mode-tester/SKILL.md',
      snippet:
        'data-persistence/\n      indexeddb-offline.spec.ts\n      local-storage.spec.ts\n      form-queue.spec.ts\n    sync/\n      background-sync.spec.ts\n      conflict-resolution.spec.ts\n      retry-logic.spec.ts\n    degradation/\n      slow-network.spec.ts\n      partial-load.spec.ts\n      asset-fallback.spec.ts\n  fixtures/\n    offline.fixture.ts\n    service-worker.fixture.ts\n  helpers/\n    network-controller.ts\n    storage-inspector.ts',
    },
  ],
});
