import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 844,
  slug: 'android-scoped-storage-migration-testing',
  campaignCluster: 'system-quality',
  title: 'Android Scoped Storage Migration Testing',
  description:
    'Android scoped storage migration testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Android scoped storage migration testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify app data remains accessible while legacy storage permissions are removed?',
  intentBoundary: 'Owns Android storage-model migration, not database schema migration.',
  secondaryKeywords: [
    'legacy external storage',
    'media permission migration',
    'app-specific file access',
    'Android scoped storage migration testing checklist',
    'Android scoped storage migration testing CI strategy',
    'Android scoped storage migration testing failure diagnosis',
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
    'https://developer.android.com/about/versions/11/privacy/storage',
    'https://developer.android.com/training/data-storage',
  ],
  codeExamples: [
    {
      title: 'Build the Android scoped storage migration testing baseline',
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
