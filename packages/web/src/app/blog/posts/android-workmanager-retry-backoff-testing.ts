import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 789,
  slug: 'android-workmanager-retry-backoff-testing',
  campaignCluster: 'system-quality',
  title: 'Android Workmanager Retry Backoff Testing',
  description:
    'Android WorkManager retry backoff testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Android WorkManager retry backoff testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify retry policies, constraints, and attempt counts across persistent work?',
  intentBoundary: 'Owns WorkManager retry scheduling, not general offline queue replay.',
  secondaryKeywords: [
    'run attempt count',
    'backoff delay policy',
    'constraint change retry',
    'Android WorkManager retry backoff testing checklist',
    'Android WorkManager retry backoff testing CI strategy',
    'Android WorkManager retry backoff testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/espresso-android/SKILL.md',
    'seed-skills/appium-mobile/SKILL.md',
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
    'https://developer.android.com/topic/libraries/architecture/workmanager/how-to/define-work',
    'https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started',
  ],
  codeExamples: [
    {
      title: 'Build the Android WorkManager retry backoff testing baseline',
      language: 'kotlin',
      path: 'seed-skills/espresso-android/SKILL.md',
      snippet:
        '// Example espresso pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/appium-mobile/SKILL.md',
      snippet:
        'CapabilityBuilder.java\n    config/\n      AppConfig.java\n  test/java/com/example/\n    tests/\n      BaseTest.java\n      LoginTest.java\n      HomeTest.java\n    data/\n      TestDataProvider.java\n  test/resources/\n    apps/\n      app-debug.apk\n      app-release.ipa\n    config/\n      android.properties\n      ios.properties\npom.xml',
    },
  ],
});
