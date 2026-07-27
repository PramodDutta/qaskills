import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 775,
  slug: 'android-foreground-service-timeout-testing',
  campaignCluster: 'system-quality',
  title: 'Android Foreground Service Timeout Testing',
  description:
    'Android foreground service timeout testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Android foreground service timeout testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify long-running foreground services stop and report timeout conditions safely?',
  intentBoundary: 'Owns Android foreground-service limits, not generic background task retries.',
  secondaryKeywords: [
    'foreground service type',
    'timeout callback handling',
    'service stop deadline',
    'Android foreground service timeout testing checklist',
    'Android foreground service timeout testing CI strategy',
    'Android foreground service timeout testing failure diagnosis',
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
    'https://developer.android.com/develop/background-work/services/fgs',
    'https://developer.android.com/develop/background-work/services/fgs/changes',
  ],
  codeExamples: [
    {
      title: 'Build the Android foreground service timeout testing baseline',
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
