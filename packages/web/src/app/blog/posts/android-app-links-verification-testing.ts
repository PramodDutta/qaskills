import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 842,
  slug: 'android-app-links-verification-testing',
  campaignCluster: 'system-quality',
  title: 'Android App Links Verification Testing',
  description:
    'Android App Links verification testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Android App Links verification testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify verified domains open the app while invalid associations fall back safely?',
  intentBoundary: 'Owns Android domain verification, not deep-link cold-start navigation.',
  secondaryKeywords: [
    'assetlinks.json failure',
    'verified domain state',
    'App Links fallback',
    'Android App Links verification testing checklist',
    'Android App Links verification testing CI strategy',
    'Android App Links verification testing failure diagnosis',
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
    'https://developer.android.com/training/app-links/verify-android-applinks',
    'https://developer.android.com/training/app-links/deep-linking',
  ],
  codeExamples: [
    {
      title: 'Build the Android App Links verification testing baseline',
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
