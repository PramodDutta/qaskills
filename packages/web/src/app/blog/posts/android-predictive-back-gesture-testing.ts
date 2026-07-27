import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 843,
  slug: 'android-predictive-back-gesture-testing',
  campaignCluster: 'system-quality',
  title: 'Android Predictive Back Gesture Testing',
  description:
    'Android predictive back gesture testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Android predictive back gesture testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify preview, cancellation, and committed back navigation preserve app state?',
  intentBoundary: 'Owns predictive back lifecycle, not ordinary tap or swipe gestures.',
  secondaryKeywords: [
    'back preview animation',
    'cancelled back gesture',
    'OnBackInvoked state',
    'Android predictive back gesture testing checklist',
    'Android predictive back gesture testing CI strategy',
    'Android predictive back gesture testing failure diagnosis',
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
    'https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture',
    'https://developer.android.com/guide/navigation/custom-back',
  ],
  codeExamples: [
    {
      title: 'Build the Android predictive back gesture testing baseline',
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
